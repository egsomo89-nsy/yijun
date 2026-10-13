/* ============================================================================
 * 유이준 디지털 앨범 — 자동 채우기 서버 함수 (Vercel Function)
 * ----------------------------------------------------------------------------
 * 기록 폼의 ✨ 버튼이 호출합니다. 사진(또는 영상에서 뽑은 장면)을 Gemini 에 보내
 * 제목과 메모 초안을 받아 돌려줍니다.
 *
 *  - Gemini API 키는 이 서버 함수 안에서만 쓰입니다. 화면 코드에는 들어가지 않습니다.
 *    Vercel > Project > Settings > Environment Variables 에 GEMINI_API_KEY 로 등록하세요.
 *  - 승인된 가족(기록 작성 권한이 있는 사람)이 로그인한 상태에서만 동작합니다.
 * ========================================================================== */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'yijun-3757c';
// 모델 이름은 환경 변수 GEMINI_MODEL 로 바꿀 수 있습니다.
const MODELS = [process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest'].filter(Boolean);

const MAX_IMAGES = 4;
const MAX_URL_BYTES = 8 * 1024 * 1024;

const BABY = '이름은 유이준(애칭 이준이), 2026년 10월 6일 수원에서 태어난 남자 아기. 아빠는 유지호, 엄마는 김세영.';

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** 로그인 토큰으로 본인 프로필을 읽어, 승인된 가족이고 기록 작성 권한이 있는지 확인 */
async function requireWriter(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, '로그인이 필요해요.');

  let uid = '';
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    uid = payload.user_id || payload.sub || '';
  } catch (e) { /* 아래에서 처리 */ }
  if (!/^[\w-]{6,128}$/.test(uid)) throw new HttpError(401, '로그인 정보를 확인할 수 없어요. 다시 로그인해 주세요.');

  // 토큰의 진위는 Firestore 가 검증합니다(보안 규칙이 그대로 적용됨).
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new HttpError(401, '로그인 정보를 확인할 수 없어요. 다시 로그인해 주세요.');
  const fields = (await res.json()).fields || {};
  const value = (key) => (fields[key] && fields[key].stringValue) || '';
  if (value('status') !== 'approved' || !(value('role') === 'admin' || value('permission') === 'edit')) {
    throw new HttpError(403, '기록 작성 권한이 있는 가족만 자동 채우기를 쓸 수 있어요.');
  }
}

/** 이미 저장된 사진(Firebase Storage)만 서버에서 내려받아 base64 로 변환 */
async function fetchStoredImage(url) {
  let parsed;
  try { parsed = new URL(url); } catch (e) { return null; }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'firebasestorage.googleapis.com') return null;
  const res = await fetch(parsed, { redirect: 'error' });
  const mimeType = (res.headers.get('content-type') || '').split(';')[0];
  if (!res.ok || !mimeType.startsWith('image/')) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_URL_BYTES) return null;
  return { mimeType, data: buffer.toString('base64') };
}

function buildPrompt(context) {
  const c = context || {};
  const text = (v, max) => String(v || '').slice(0, max);
  const lines = [
    '당신은 아기의 성장 앨범에 들어갈 글을 부모 대신 써 주는 도우미입니다.',
    `아기 정보: ${BABY}`,
    `기록 날짜: ${text(c.date, 10)} (${text(c.age, 20)})`,
    c.category && `카테고리: ${text(c.category, 20)}`,
    c.milestone && `마일스톤: ${text(c.milestone, 20)}`,
    Array.isArray(c.tags) && c.tags.length && `태그: ${c.tags.slice(0, 10).map((t) => `#${text(t, 15)}`).join(' ')}`,
    c.title && `부모가 이미 적은 제목(참고): ${text(c.title, 60)}`,
    c.memo && `부모가 이미 적은 메모(참고): ${text(c.memo, 500)}`,
    '',
    '첨부한 사진(영상의 경우 장면 몇 컷)을 보고 아래 두 가지를 한국어로 써 주세요.',
    '- title: 20자 이내의 짧고 다정한 제목. 따옴표나 이모지 없이.',
    '- memo: 엄마·아빠가 쓴 일기처럼 따뜻한 말투로 2~4문장.',
    '',
    '규칙:',
    '- 사진에 실제로 보이는 것(표정, 자세, 옷, 주변 물건, 분위기)만 바탕으로 쓰세요.',
    '- 사진만으로 알 수 없는 사실(장소 이름, 함께 있는 사람이 누구인지, 몸무게, 건강 상태 등)은 지어내지 마세요.',
    '- 아기의 월령에 맞지 않는 행동을 한 것처럼 쓰지 마세요.',
  ];
  return lines.filter((l) => l !== false && l !== undefined && l !== null && l !== 0).join('\n');
}

async function askGemini(apiKey, prompt, images) {
  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: prompt }, ...images.map((img) => ({ inline_data: { mime_type: img.mimeType, data: img.data } }))],
    }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: { title: { type: 'STRING' }, memo: { type: 'STRING' } },
        required: ['title', 'memo'],
      },
    },
  };

  // Vercel 함수 제한 시간(60초)을 넘기면 안내 문구 없이 끊기므로, 그 전에 스스로 멈춥니다.
  const deadline = Date.now() + 50000;
  const call = async (model) => {
    const left = deadline - Date.now();
    if (left < 3000) return { status: 504, ok: false, json: async () => ({ error: { status: 'TIMEOUT' } }) };
    try {
      return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Math.min(25000, left)),
      });
    } catch (e) {
      // 응답이 너무 늦거나 연결이 끊긴 경우 → 바쁜 것(5xx)과 같게 처리
      return { status: 504, ok: false, json: async () => ({ error: { status: 'TIMEOUT' } }) };
    }
  };

  let lastStatus = 0;
  let lastReason = '';
  for (const model of MODELS) {
    let res = await call(model);
    // 모델이 잠깐 바쁜 경우(5xx)에는 한 번 더 시도 (시간 초과는 바로 다음 모델로)
    if (res.status >= 500 && res.status !== 504) { await new Promise((r) => setTimeout(r, 1500)); res = await call(model); }
    if (res.status === 404) { lastStatus = 404; continue; } // 없는 모델 이름이면 다음 후보로
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      lastStatus = res.status;
      lastReason = String((json.error && (json.error.status || json.error.message)) || '').slice(0, 80);
      console.error('Gemini error', model, res.status, JSON.stringify(json).slice(0, 500));
      if (res.status >= 500) continue; // 계속 바쁘면 다음 후보 모델로
      if (res.status === 429) throw new HttpError(429, 'AI 사용량 한도에 도달했어요. 잠시 후 다시 시도해 주세요.');
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new HttpError(502, `Gemini 가 요청을 거부했어요. API 키가 올바른지 확인해 주세요. (${res.status} ${lastReason})`);
      }
      throw new HttpError(502, `AI 서비스 오류예요. (${res.status} ${lastReason})`);
    }
    const candidate = (json.candidates || [])[0] || {};
    const text = ((candidate.content || {}).parts || []).map((p) => p.text || '').join('');
    try {
      const parsed = JSON.parse(text);
      return { title: String(parsed.title || '').trim().slice(0, 60), memo: String(parsed.memo || '').trim().slice(0, 1000) };
    } catch (e) {
      console.error('Gemini parse error', candidate.finishReason, text.slice(0, 300));
      throw new HttpError(502, 'AI 가 글을 만들지 못했어요. 다른 사진으로 다시 시도해 주세요.');
    }
  }
  console.error('Gemini failed on all models', MODELS.join(','), lastStatus, lastReason);
  if (lastStatus === 504) throw new HttpError(504, 'AI 응답이 너무 오래 걸려서 멈췄어요. 잠시 후 다시 시도해 주세요. (504 TIMEOUT)');
  if (lastStatus >= 500) throw new HttpError(502, `AI 서비스가 지금 바빠서 응답하지 못했어요. 잠시 후 다시 시도해 주세요. (${lastStatus} ${lastReason})`);
  throw new HttpError(502, '사용할 수 있는 Gemini 모델을 찾지 못했어요. 환경 변수 GEMINI_MODEL 을 확인해 주세요.');
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'POST 요청만 받을 수 있어요.');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new HttpError(500, '서버에 GEMINI_API_KEY 가 등록되어 있지 않아요. Vercel 환경 변수를 확인해 주세요.');

    await requireWriter(req);

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const images = (Array.isArray(body.images) ? body.images : [])
      .filter((img) => img && typeof img.data === 'string' && /^image\/(jpeg|png|webp)$/.test(img.mimeType))
      .slice(0, MAX_IMAGES)
      .map((img) => ({ mimeType: img.mimeType, data: img.data }));
    for (const url of (Array.isArray(body.urls) ? body.urls : []).slice(0, MAX_IMAGES)) {
      if (images.length >= MAX_IMAGES) break;
      const stored = await fetchStoredImage(String(url)).catch(() => null);
      if (stored) images.push(stored);
    }
    if (!images.length) throw new HttpError(400, '자동 채우기에 쓸 사진이 없어요.');

    const result = await askGemini(apiKey, buildPrompt(body.context), images);
    res.status(200).json(result);
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    res.status(e.status || 500).json({ error: e instanceof HttpError ? e.message : '자동 채우기 중 오류가 발생했어요.' });
  }
};
