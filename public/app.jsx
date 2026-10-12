/* ============================================================================
 * 유이준 디지털 앨범 — 화면(UI) 코드
 * React 18(CDN) + Tailwind CSS. JSX 는 브라우저에서 Babel 이 변환합니다.
 *
 *  1. 기본 정보 · 상수        5. 타임라인 대시보드      9. 로그인 · 승인 대기 화면
 *  2. 날짜 · 권한 유틸        6. 기록 추가/수정 폼     10. 앱 본체(App)
 *  3. 저장소(LocalStorage)    7. 검색 · 필터
 *  4. 공용 컴포넌트           8. 가족 공유 · 내 정보
 *
 * 데이터 저장 방식
 *  - 가족 앨범(기본): Firebase(Firestore + Storage). firebase.js 참고.
 *    마지막으로 본 기록 · 화면 설정은 LocalStorage 에도 보관해 새로고침 후 바로 보입니다.
 *  - 체험 모드: Firebase 없이 이 브라우저의 LocalStorage 에만 저장합니다.
 * ========================================================================== */
const { useState, useEffect, useMemo, useRef } = React;

/* ───────────────────────── 1. 기본 정보 · 상수 ───────────────────────── */

const BABY = {
  name: '유이준', nick: '이준',
  birth: '2026-10-06', birthTime: '18:55',
  hospital: '시온여성병원', city: '수원',
  mom: '김세영', dad: '유지호',
};

const CATEGORIES = [
  { id: 'daily', label: '일상', emoji: '🌿', cls: 'bg-emerald-50 text-emerald-700', grad: 'from-emerald-100 to-teal-50' },
  { id: 'milestone', label: '성장', emoji: '⭐', cls: 'bg-amber-50 text-amber-700', grad: 'from-amber-100 to-orange-50' },
  { id: 'health', label: '건강·접종', emoji: '💉', cls: 'bg-sky-50 text-sky-700', grad: 'from-sky-100 to-indigo-50' },
  { id: 'food', label: '수유·이유식', emoji: '🍼', cls: 'bg-orange-50 text-orange-700', grad: 'from-orange-100 to-amber-50' },
  { id: 'event', label: '기념일', emoji: '🎂', cls: 'bg-rose-50 text-rose-700', grad: 'from-rose-100 to-pink-50' },
  { id: 'outing', label: '나들이', emoji: '🧺', cls: 'bg-violet-50 text-violet-700', grad: 'from-violet-100 to-fuchsia-50' },
];
const catOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

const DEFAULT_TAGS = ['탄생', '백일', '이유식', '예방접종', '첫미소', '뒤집기', '목욕', '수면', '산책', '가족', '병원', '돌잔치'];

// 성장 마일스톤(대시보드의 체크 보드에 표시)
const MILESTONES = [
  { id: 'birth', label: '탄생', emoji: '👶', when: '태어난 날' },
  { id: 'smile', label: '첫 미소', emoji: '😊', when: '2개월 무렵' },
  { id: 'neck', label: '목 가누기', emoji: '💪', when: '3~4개월' },
  { id: 'd100', label: '백일', emoji: '🎂', when: '100일' },
  { id: 'roll', label: '뒤집기 성공', emoji: '🔄', when: '4~6개월' },
  { id: 'food', label: '첫 이유식', emoji: '🥣', when: '6개월 무렵' },
  { id: 'sit', label: '혼자 앉기', emoji: '🧸', when: '6~8개월' },
  { id: 'tooth', label: '첫 이', emoji: '🦷', when: '6~10개월' },
  { id: 'crawl', label: '기어가기', emoji: '🐾', when: '8~10개월' },
  { id: 'word', label: '첫 "엄마·아빠"', emoji: '💬', when: '10~12개월' },
  { id: 'walk', label: '첫 걸음마', emoji: '👣', when: '12개월 무렵' },
  { id: 'dol', label: '첫돌', emoji: '🎉', when: '1년' },
];

// 월령 구간(타임라인 · 검색 필터)
const STAGES = [
  { id: 'all', label: '전체' },
  { id: 's0', label: '0~3개월', desc: '신생아 · 첫 미소 · 목 가누기', min: 0, max: 3 },
  { id: 's1', label: '4~6개월', desc: '뒤집기 · 옹알이', min: 4, max: 6 },
  { id: 's2', label: '7~12개월', desc: '앉기 · 기기 · 첫 걸음마', min: 7, max: 12 },
  { id: 's3', label: '1~2세', desc: '걷기 · 말 배우기', min: 13, max: 35 },
  { id: 's4', label: '3세 이상', desc: '어린이집 · 유치원', min: 36, max: 9999 },
];

// 가족 그룹과 기록 공개 범위(가족 공유 뷰)
const GROUPS = [
  { id: 'parents', label: '부모', emoji: '👩‍👦' },
  { id: 'grandparents', label: '조부모', emoji: '👵' },
  { id: 'relatives', label: '친척', emoji: '👨‍👩‍👧' },
  { id: 'friends', label: '지인', emoji: '🤝' },
];
const groupOf = (id) => GROUPS.find((g) => g.id === id) || GROUPS[2];

const VISIBILITY = [
  { id: 'all', label: '가족 전체', emoji: '🏡', desc: '승인된 가족 모두', groups: ['parents', 'grandparents', 'relatives', 'friends'] },
  { id: 'grandparents', label: '부모·조부모', emoji: '👵', desc: '부모와 조부모만', groups: ['parents', 'grandparents'] },
  { id: 'parents', label: '부모만', emoji: '🔒', desc: '엄마 · 아빠만', groups: ['parents'] },
];
const visOf = (id) => VISIBILITY.find((v) => v.id === id) || VISIBILITY[0];

const RELATIONS = [
  { label: '엄마', group: 'parents' }, { label: '아빠', group: 'parents' },
  { label: '할아버지', group: 'grandparents' }, { label: '할머니', group: 'grandparents' },
  { label: '외할아버지', group: 'grandparents' }, { label: '외할머니', group: 'grandparents' },
  { label: '삼촌', group: 'relatives' }, { label: '외삼촌', group: 'relatives' },
  { label: '이모', group: 'relatives' }, { label: '고모', group: 'relatives' },
  { label: '큰아빠', group: 'relatives' }, { label: '작은아빠', group: 'relatives' },
  { label: '사촌', group: 'relatives' }, { label: '지인', group: 'friends' },
];

/* ───────────────────────── 2. 날짜 · 권한 유틸 ───────────────────────── */

const pad = (n) => String(n).padStart(2, '0');
const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYMD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const todayYMD = () => toYMD(new Date());
const dayDiff = (from, to) => Math.round((parseYMD(to) - parseYMD(from)) / 86400000);
const addDays = (s, n) => { const d = parseYMD(s); d.setDate(d.getDate() + n); return toYMD(d); };
const addYears = (s, n) => { const d = parseYMD(s); d.setFullYear(d.getFullYear() + n); return toYMD(d); };
const fmtDate = (s) => { const d = parseYMD(s); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`; };
const fmtShort = (s) => { const d = parseYMD(s); return `${d.getMonth() + 1}.${d.getDate()} (${'일월화수목금토'[d.getDay()]})`; };

/** 두 날짜 사이의 만 개월 수 */
function monthsBetween(from, to) {
  const a = parseYMD(from), b = parseYMD(to);
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return m;
}
/** 기록 날짜 기준 이준이의 월령(태어나기 전이면 -1) */
const ageMonths = (date) => (dayDiff(BABY.birth, date) < 0 ? -1 : monthsBetween(BABY.birth, date));

function monthLabel(m) {
  if (m < 0) return '태어나기 전';
  if (m < 24) return `생후 ${m}개월`;
  return `${Math.floor(m / 12)}살 ${m % 12}개월`;
}
/** 카드에 표시할 나이: 한 달 전까지는 '생후 N일째' */
function ageLabel(date) {
  const days = dayDiff(BABY.birth, date);
  if (days < 0) return `태어나기 ${-days}일 전`;
  if (days === 0) return '태어난 날';
  const m = monthsBetween(BABY.birth, date);
  return m < 1 ? `생후 ${days + 1}일째` : monthLabel(m);
}
const stageOf = (date) => { const m = ageMonths(date); return (STAGES.find((s) => s.id !== 'all' && m >= s.min && m <= s.max) || {}).id || 'pre'; };

const isAdmin = (u) => !!u && u.role === 'admin';
const canWrite = (u) => !!u && u.status === 'approved' && (u.role === 'admin' || u.permission === 'edit');
/** 공개 범위에 따라 이 가족이 기록을 볼 수 있는지 */
const canSee = (rec, u) => !!u && (u.role === 'admin' || rec.authorUid === u.uid || visOf(rec.visibility).groups.includes(u.group));
const canEditRecord = (rec, u) => canWrite(u) && (u.role === 'admin' || rec.authorUid === u.uid);

const sortRecords = (list, asc) => [...list].sort((a, b) => {
  const c = a.date === b.date ? (a.createdAt || 0) - (b.createdAt || 0) : a.date < b.date ? -1 : 1;
  return asc ? c : -c;
});

const isVideoUrl = (url) => /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url);

/** Firebase 오류 코드를 한국어 안내로 */
function errMsg(e) {
  const code = (e && e.code) || '';
  const map = {
    'permission-denied': '권한이 없어요. Firebase 콘솔에서 Firestore 데이터베이스를 만들고 보안 규칙을 게시했는지 확인해 주세요.',
    'storage/unauthorized': '파일을 올릴 권한이 없어요. Storage 보안 규칙을 확인해 주세요.',
    'storage/unknown': '파일 업로드에 실패했어요. Firebase Storage 가 사용 설정되었는지 확인해 주세요.',
    'auth/popup-closed-by-user': '로그인 창이 닫혔어요. 다시 시도해 주세요.',
    'auth/cancelled-popup-request': '로그인 창이 닫혔어요. 다시 시도해 주세요.',
    'auth/unauthorized-domain': '이 주소는 Firebase 인증의 "승인된 도메인"에 등록되어 있지 않아요.',
    'auth/operation-not-allowed': 'Firebase 콘솔에서 Google 로그인을 사용 설정해 주세요.',
    'auth/configuration-not-found': 'Firebase 콘솔에서 Authentication(Google 로그인)을 먼저 사용 설정해 주세요.',
    'auth/network-request-failed': '인터넷 연결을 확인해 주세요.',
    unavailable: '서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.',
  };
  return map[code] || (e && e.message) || '알 수 없는 오류가 발생했어요.';
}

/* ───────────────────────── 3. 저장소 (LocalStorage) ───────────────────────── */

const LS = {
  key: (k) => `yijun-album:${k}`,
  get(k, fallback) { try { const v = localStorage.getItem(this.key(k)); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
  set(k, v) { try { localStorage.setItem(this.key(k), JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(this.key(k)); } catch (e) { /* 무시 */ } },
};

/** 값이 바뀔 때마다 LocalStorage 에 저장되는 useState */
function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => LS.get(key, initial));
  useEffect(() => { LS.set(key, value); }, [key, value]);
  return [value, setValue];
}

/** 체험 모드 사진 저장용: 이미지를 줄여 dataURL 로 변환 */
function resizeToDataURL(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(src);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('이미지를 읽을 수 없어요.')); };
    img.src = src;
  });
}

/** 자동 채우기용: 영상 파일에서 장면 몇 컷을 뽑아 JPEG dataURL 로 변환 (실패하면 빈 배열) */
function videoFrames(file, count, maxSize) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const src = URL.createObjectURL(file);
    const frames = [];
    let step = 0;
    const finish = () => { clearTimeout(timer); URL.revokeObjectURL(src); resolve(frames); };
    const timer = setTimeout(finish, 12000);
    const seek = () => { video.currentTime = (video.duration * (step + 1)) / (count + 1); };
    video.muted = true; video.playsInline = true; video.preload = 'auto';
    video.onloadedmetadata = () => { if (Number.isFinite(video.duration) && video.duration > 0) seek(); else finish(); };
    video.onseeked = () => {
      const scale = Math.min(1, maxSize / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      if (canvas.width && canvas.height) {
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', 0.8));
      }
      step += 1;
      if (step < count) seek(); else finish();
    };
    video.onerror = finish;
    video.src = src;
  });
}

/** 프로필 사진용: 가운데를 정사각형으로 잘라 JPEG 파일로 변환 */
function cropSquare(file, size) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = Math.min(size, side);
      canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(src);
      canvas.toBlob((blob) => (blob
        ? resolve(new File([blob], 'baby-profile.jpg', { type: 'image/jpeg' }))
        : reject(new Error('이미지를 변환할 수 없어요.'))), 'image/jpeg', 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('이미지를 읽을 수 없어요.')); };
    img.src = src;
  });
}

const birthRecord = (author) => ({
  date: BABY.birth, title: `${BABY.nick}이가 태어났어요`, category: 'milestone', milestone: 'birth',
  tags: ['탄생', '가족'], media: [], visibility: 'all',
  memo: `2026년 10월 6일 ${BABY.birthTime}, ${BABY.city} ${BABY.hospital}에서 ${BABY.name}이 태어났습니다. 엄마 ${BABY.mom}, 아빠 ${BABY.dad}의 아들로 와 줘서 고마워.`,
  authorUid: author.uid, authorName: author.relation || author.displayName, createdAt: Date.now(),
});

/** 체험 모드 첫 실행 시 보여 줄 예시 데이터 */
function seedDemo() {
  const now = Date.now();
  const user = (uid, displayName, extra) => ({ uid, displayName, email: `${uid}@example.com`, photoURL: '', requestNote: '', createdAt: now, ...extra });
  const dad = user('demo-dad', BABY.dad, { status: 'approved', role: 'admin', relation: '아빠', group: 'parents', permission: 'edit' });
  return {
    currentUid: dad.uid,
    users: [
      dad,
      user('demo-mom', BABY.mom, { status: 'approved', role: 'admin', relation: '엄마', group: 'parents', permission: 'edit' }),
      user('demo-gf', '할아버지(예시)', { status: 'approved', role: 'family', relation: '할아버지', group: 'grandparents', permission: 'view' }),
      user('demo-gm', '외할머니(예시)', { status: 'pending', role: 'family', relation: '', group: 'relatives', permission: 'view', requestNote: '이준이 외할머니예요. 승인 부탁해요 ^^' }),
      user('demo-uncle', '삼촌(예시)', { status: 'pending', role: 'family', relation: '', group: 'relatives', permission: 'view', requestNote: '' }),
    ],
    records: [
      { id: 'demo-3', date: addDays(BABY.birth, 3), title: '(예시) 첫 목욕', category: 'daily', milestone: '', tags: ['목욕'], media: [], visibility: 'grandparents', memo: '예시 기록이에요. 부모·조부모에게만 공개된 기록은 이렇게 표시됩니다.', authorUid: 'demo-mom', authorName: '엄마', createdAt: now - 1000 },
      { id: 'demo-2', date: addDays(BABY.birth, 1), title: '(예시) 첫 수유', category: 'food', milestone: '', tags: ['수면'], media: [], visibility: 'parents', memo: '예시 기록이에요. 부모만 볼 수 있는 기록입니다.', authorUid: 'demo-mom', authorName: '엄마', createdAt: now - 2000 },
      { id: 'demo-1', ...birthRecord(dad), createdAt: now - 3000 },
    ],
  };
}

/** 체험 모드 데이터 저장소 (LocalStorage) */
const DemoStore = {
  state: null,
  subs: new Set(),
  load() { if (!this.state) this.state = LS.get('demo', null) || seedDemo(); return this.state; },
  commit(next) {
    this.state = next;
    const saved = LS.set('demo', next);
    this.subs.forEach((fn) => fn(next));
    if (!saved) throw new Error('브라우저 저장 공간이 가득 찼어요. 사진 수를 줄여 주세요.');
  },
  subscribe(fn) { this.subs.add(fn); fn(this.load()); return () => this.subs.delete(fn); },
  patch(key, fn) { const s = this.load(); this.commit({ ...s, [key]: fn(s[key]) }); },
};

/** 체험 모드 백엔드 — firebase.js 의 window.AlbumFirebase 와 같은 함수 구성 */
const demoBackend = {
  mode: 'demo',
  watchRecords: (cb) => DemoStore.subscribe((s) => cb(s.records)),
  watchUsers: (cb) => DemoStore.subscribe((s) => cb(s.users)),
  watchBaby: (cb) => DemoStore.subscribe((s) => cb(s.baby || null)),
  setBabyPhoto: async (data) => DemoStore.patch('baby', (b) => ({ ...b, ...data })),
  addRecord: async (data) => DemoStore.patch('records', (list) => [{ ...data, id: `r${Date.now()}` }, ...list]),
  updateRecord: async (id, data) => DemoStore.patch('records', (list) => list.map((r) => (r.id === id ? { ...r, ...data } : r))),
  deleteRecord: async (rec) => DemoStore.patch('records', (list) => list.filter((r) => r.id !== rec.id)),
  updateUser: async (uid, data) => DemoStore.patch('users', (list) => list.map((u) => (u.uid === uid ? { ...u, ...data } : u))),
  removeUser: async (uid) => DemoStore.patch('users', (list) => list.filter((u) => u.uid !== uid)),
  deleteMedia: async () => {},
  uploadMedia: async (file) => {
    if (!file.type.startsWith('image/')) throw new Error('체험 모드에서는 영상 파일을 저장할 수 없어요. 영상은 URL 로 추가해 주세요.');
    return { url: await resizeToDataURL(file, 1000, 0.8), type: 'image', path: '' };
  },
};

/* ───────────────────────── 4. 공용 컴포넌트 ───────────────────────── */

const ICONS = {
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h5v-6h4v6h5V10" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  left: <path d="m15 18-6-6 6-6" />,
  right: <path d="m9 18 6-6-6-6" />,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  sparkle: <><path d="m11 3 1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9Z" /><path d="M19 15v5M16.5 17.500h5" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
};
function Icon({ name, className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const cx = (...list) => list.filter(Boolean).join(' ');
const BTN = 'inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition active:scale-[.97] disabled:opacity-50 disabled:pointer-events-none';
const BTN_PRIMARY = `${BTN} bg-peach-400 text-white shadow-soft hover:bg-peach-500`;
const BTN_GHOST = `${BTN} bg-white text-ink border border-peach-100 hover:bg-peach-50`;
const BTN_DANGER = `${BTN} bg-white text-rose-500 border border-rose-100 hover:bg-rose-50`;
const CARD = 'bg-white/90 rounded-3xl shadow-card border border-white';
const INPUT = 'w-full rounded-2xl border border-peach-100 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-stone-300 outline-none focus:border-peach-300 focus:ring-4 focus:ring-peach-100';
const LABEL = 'block text-sm font-semibold text-ink mb-2';

/** 선택형 알약 버튼 */
function Chip({ active, onClick, children, className }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={!!active}
      className={cx('shrink-0 rounded-full px-3.5 py-2 text-sm font-medium border transition active:scale-[.97]',
        active ? 'bg-peach-400 border-peach-400 text-white shadow-soft' : 'bg-white border-peach-100 text-stone-500 hover:bg-peach-50', className)}>
      {children}
    </button>
  );
}

function Avatar({ user, size = 'w-11 h-11' }) {
  const [broken, setBroken] = useState(false);
  if (user.photoURL && !broken) {
    return <img src={user.photoURL} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={cx(size, 'rounded-full object-cover bg-peach-50 shrink-0')} />;
  }
  return (
    <div className={cx(size, 'rounded-full shrink-0 flex items-center justify-center font-bold text-peach-500 bg-gradient-to-br from-peach-100 to-rose-100')}>
      {(user.relation || user.displayName || '?').slice(0, 1)}
    </div>
  );
}

/** 이준이 프로필 사진. 사진이 없으면 기본 아이콘, 관리자는 눌러서 바로 바꿀 수 있음 */
function BabyAvatar({ baby, onPick, size = 'w-11 h-11', rounded = 'rounded-2xl' }) {
  const input = useRef(null);
  const img = (
    <img src={(baby && baby.photoURL) || 'icons/icon-192.png'} alt={`${BABY.name} 프로필 사진`}
      className={cx(size, rounded, 'object-cover shadow-card bg-peach-50 shrink-0')} />
  );
  if (!onPick) return img;
  return (
    <button type="button" className="relative shrink-0" onClick={() => input.current.click()} title="프로필 사진 바꾸기" aria-label={`${BABY.nick}이 프로필 사진 바꾸기`}>
      {img}
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center text-[10px]" aria-hidden="true">📷</span>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { onPick(e.target.files[0]); e.target.value = ''; }} />
    </button>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <h2 className="font-display text-xl text-ink">{children}</h2>
      {right}
    </div>
  );
}

/** 사진/영상 썸네일. 미디어가 없으면 카테고리 색의 자리 표시 */
function MediaThumb({ record, media, className }) {
  const cat = catOf(record.category);
  if (!media) {
    return (
      <div className={cx('flex items-center justify-center bg-gradient-to-br', cat.grad, className)}>
        <span className="text-5xl opacity-80">{(MILESTONES.find((m) => m.id === record.milestone) || cat).emoji}</span>
      </div>
    );
  }
  if (media.type === 'video') {
    return (
      <div className={cx('relative bg-stone-800', className)}>
        <video src={`${media.url}#t=0.1`} preload="metadata" muted playsInline className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="w-12 h-12 rounded-full bg-white/85 flex items-center justify-center text-peach-500 text-lg pl-1">▶</span>
        </div>
      </div>
    );
  }
  return <img src={media.url} alt={record.title || '사진'} loading="lazy" className={cx('object-cover bg-peach-50', className)} />;
}

/** 기록 카드 */
function RecordCard({ record, onOpen, highlight }) {
  const cat = catOf(record.category);
  const media = record.media || [];
  const vis = visOf(record.visibility);
  return (
    <article data-record-date={record.date} onClick={() => onOpen(record, 0)}
      className={cx(CARD, 'overflow-hidden fade-up cursor-pointer hover:shadow-soft transition', highlight && 'ring-4 ring-rose-300')}>
      <div className="relative">
        <MediaThumb record={record} media={media[0]} className="w-full aspect-[4/3]" />
        {media.length > 1 && (
          <span className="absolute top-3 right-3 rounded-full bg-black/45 text-white text-xs px-2.5 py-1 flex items-center gap-1">
            <Icon name="image" className="w-3.5 h-3.5" />{media.length}
          </span>
        )}
        <span className="absolute left-3 bottom-3 rounded-full bg-white/90 text-ink text-xs font-semibold px-3 py-1 shadow-card">{ageLabel(record.date)}</span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs text-stone-400 mb-1.5">
          <span className={cx('rounded-full px-2.5 py-0.5 font-semibold', cat.cls)}>{cat.emoji} {cat.label}</span>
          <span>{fmtDate(record.date)}</span>
          {record.visibility && record.visibility !== 'all' && <span title={`공개 범위: ${vis.label}`} className="ml-auto">{vis.emoji} {vis.label}</span>}
        </div>
        {record.title && <h3 className="font-semibold text-[17px] text-ink leading-snug">{record.title}</h3>}
        {record.memo && <p className="mt-1 text-sm text-stone-500 leading-relaxed line-clamp-3 whitespace-pre-line">{record.memo}</p>}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {(record.tags || []).map((t) => <span key={t} className="text-xs text-peach-500 bg-peach-50 rounded-full px-2 py-0.5">#{t}</span>)}
          <span className="ml-auto text-xs text-stone-400">{record.authorName}</span>
        </div>
      </div>
    </article>
  );
}

/** 상세 보기 모달: PC 는 사진 + 옆 정보 패널, 모바일은 위아래 배치. ← → 키로 넘기기 */
function Lightbox({ list, start, viewer, onClose, onEdit, onDelete }) {
  // 선택한 기록 하나의 사진 · 영상만 넘겨 봅니다 (다른 기록으로는 넘어가지 않음)
  const slides = useMemo(
    () => list.filter((r) => r.id === start.id)
      .flatMap((r) => ((r.media || []).length ? r.media.map((m, i) => ({ r, m, i })) : [{ r, m: null, i: 0 }])),
    [list, start.id]
  );
  const [cur, setCur] = useState(start);
  const pos = Math.max(0, slides.findIndex((s) => s.r.id === cur.id && s.i === cur.idx));
  const slide = slides[pos];
  const go = (step) => { const next = slides[pos + step]; if (next) setCur({ id: next.r.id, idx: next.i }); };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  });
  useEffect(() => { if (!slide) onClose(); }, [slide]);
  if (!slide) return null;

  const { r, m } = slide;
  const cat = catOf(r.category);
  const milestone = MILESTONES.find((x) => x.id === r.milestone);
  const navBtn = 'absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/85 text-ink flex items-center justify-center shadow-card hover:bg-white disabled:opacity-0';
  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-sm flex items-stretch md:items-center justify-center md:p-8" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-white w-full md:max-w-6xl md:h-[86vh] md:rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative bg-stone-900 flex items-center justify-center h-[46vh] md:h-auto md:flex-1 shrink-0">
          {!m && <MediaThumb record={r} media={null} className="w-full h-full" />}
          {m && m.type === 'video' && <video key={m.url} src={m.url} controls playsInline className="max-w-full max-h-full" />}
          {m && m.type !== 'video' && <img src={m.url} alt={r.title || '사진'} className="max-w-full max-h-full object-contain" />}
          <button className={cx(navBtn, 'left-3')} onClick={() => go(-1)} disabled={pos === 0} aria-label="이전"><Icon name="left" /></button>
          <button className={cx(navBtn, 'right-3')} onClick={() => go(1)} disabled={pos === slides.length - 1} aria-label="다음"><Icon name="right" /></button>
          <button className="absolute top-3 right-3 md:hidden w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center" onClick={onClose} aria-label="닫기"><Icon name="x" /></button>
          {slides.length > 1 && <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/45 text-white text-xs px-3 py-1">{pos + 1} / {slides.length}</span>}
        </div>
        <div className="md:w-[380px] shrink-0 flex flex-col min-h-0 flex-1 md:flex-none">
          <div className="flex-1 overflow-y-auto p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-peach-500 font-semibold">{ageLabel(r.date)}</p>
                <p className="text-sm text-stone-400">{fmtDate(r.date)} ({'일월화수목금토'[parseYMD(r.date).getDay()]})</p>
              </div>
              <button className="hidden md:flex w-9 h-9 rounded-full hover:bg-peach-50 items-center justify-center text-stone-400" onClick={onClose} aria-label="닫기"><Icon name="x" /></button>
            </div>
            <h3 className="font-display text-2xl text-ink mt-3 leading-snug">{r.title || '제목 없는 기록'}</h3>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              <span className={cx('rounded-full px-2.5 py-1 font-semibold', cat.cls)}>{cat.emoji} {cat.label}</span>
              {milestone && <span className="rounded-full px-2.5 py-1 font-semibold bg-amber-50 text-amber-700">{milestone.emoji} {milestone.label}</span>}
              <span className="rounded-full px-2.5 py-1 bg-stone-100 text-stone-500">{visOf(r.visibility).emoji} {visOf(r.visibility).label} 공개</span>
            </div>
            {r.memo && <p className="mt-4 text-[15px] leading-7 text-stone-600 whitespace-pre-line">{r.memo}</p>}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(r.tags || []).map((t) => <span key={t} className="text-sm text-peach-500 bg-peach-50 rounded-full px-2.5 py-1">#{t}</span>)}
            </div>
            <p className="mt-5 text-xs text-stone-400">기록한 사람 · {r.authorName}</p>
          </div>
          {canEditRecord(r, viewer) && (
            <div className="p-4 border-t border-peach-50 flex gap-2 pb-safe">
              <button className={cx(BTN_GHOST, 'flex-1')} onClick={() => onEdit(r)}><Icon name="edit" className="w-4 h-4" />수정</button>
              <button className={cx(BTN_DANGER, 'flex-1')} onClick={() => onDelete(r)}><Icon name="trash" className="w-4 h-4" />삭제</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 5. 타임라인 대시보드 ───────────────────────── */

/** 이준이 소개 + D-day */
function Hero({ records }) {
  const today = todayYMD();
  const days = dayDiff(BABY.birth, today);
  const months = monthsBetween(BABY.birth, today);
  const upcoming = [
    { label: '삼칠일', date: addDays(BABY.birth, 20) },
    { label: '50일', date: addDays(BABY.birth, 49) },
    { label: '백일', date: addDays(BABY.birth, 99) },
    { label: '200일', date: addDays(BABY.birth, 199) },
    { label: '첫돌', date: addYears(BABY.birth, 1) },
    { label: '두 돌', date: addYears(BABY.birth, 2) },
  ].filter((e) => e.date >= today).slice(0, 3);
  const mediaCount = records.reduce((n, r) => n + (r.media || []).length, 0);
  const doneCount = MILESTONES.filter((m) => records.some((r) => r.milestone === m.id)).length;

  return (
    <section className="rounded-[2rem] p-6 md:p-8 bg-gradient-to-br from-peach-100 via-rose-50 to-sky-50 shadow-soft border border-white relative overflow-hidden">
      <div className="absolute -right-6 -top-8 text-[9rem] opacity-20 select-none" aria-hidden="true">🍼</div>
      <p className="text-sm font-semibold text-peach-500">{BABY.dad} · {BABY.mom}의 아들</p>
      <h1 className="font-display text-4xl md:text-5xl text-ink mt-1">{BABY.name}</h1>
      <p className="mt-3 text-lg text-ink">
        {days >= 0 ? <>태어난 지 <b className="text-peach-500 text-2xl">{days + 1}</b>일째</> : <>만나기까지 <b className="text-peach-500 text-2xl">{-days}</b>일</>}
        {days >= 0 && <span className="text-stone-400 text-sm ml-2">{months >= 1 ? monthLabel(months) : `생후 ${Math.floor(days / 7)}주 ${days % 7}일`}</span>}
      </p>
      <p className="mt-1 text-sm text-stone-500">{fmtDate(BABY.birth)} {BABY.birthTime} · {BABY.city} {BABY.hospital}</p>

      <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {upcoming.map((e) => {
          const left = dayDiff(today, e.date);
          return (
            <div key={e.label} className="shrink-0 rounded-2xl bg-white/80 px-4 py-2.5 shadow-card">
              <p className="text-xs text-stone-400">{e.label} · {fmtShort(e.date)}</p>
              <p className="font-bold text-ink">{left === 0 ? '오늘이에요 🎉' : `D-${left}`}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-5 text-sm text-stone-500">
        <span>기록 <b className="text-ink">{records.length}</b></span>
        <span>사진·영상 <b className="text-ink">{mediaCount}</b></span>
        <span>마일스톤 <b className="text-ink">{doneCount}</b>/{MILESTONES.length}</span>
      </div>
    </section>
  );
}

/** 달력: 기록이 있는 날에 빨간 점. 날짜를 누르면 타임라인의 그날 기록으로 이동 */
function RecordCalendar({ records, onPick }) {
  const today = todayYMD();
  const [ym, setYm] = useState(today.slice(0, 7));   // 보고 있는 달 'YYYY-MM'
  const counts = useMemo(() => {
    const map = {};
    records.forEach((r) => { map[r.date] = (map[r.date] || 0) + 1; });
    return map;
  }, [records]);

  const [y, m] = ym.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`)];
  const move = (step) => { const d = new Date(y, m - 1 + step, 1); setYm(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); };
  const recordDays = cells.filter((c) => c && counts[c]).length;
  const navBtn = 'w-9 h-9 rounded-full flex items-center justify-center text-stone-400 hover:bg-peach-50 hover:text-peach-500';

  return (
    <section className={cx(CARD, 'p-4 md:p-5')} aria-label="기록 달력">
      <div className="flex items-center gap-1">
        <h2 className="font-display text-lg text-ink">{y}년 {m}월</h2>
        <span className="ml-2 text-xs text-stone-400">기록한 날 {recordDays}일</span>
        {ym !== today.slice(0, 7) && <button className="ml-auto text-xs font-semibold text-peach-500 px-2" onClick={() => setYm(today.slice(0, 7))}>오늘</button>}
        <button className={cx(navBtn, ym === today.slice(0, 7) && 'ml-auto')} onClick={() => move(-1)} aria-label="이전 달"><Icon name="left" /></button>
        <button className={navBtn} onClick={() => move(1)} aria-label="다음 달"><Icon name="right" /></button>
      </div>
      <div className="mt-2 grid grid-cols-7 text-center text-xs text-stone-400">
        {[...'일월화수목금토'].map((d, i) => <span key={d} className={cx('py-1', i === 0 && 'text-rose-400', i === 6 && 'text-sky-500')}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((date, i) => {
          if (!date) return <span key={`blank-${i}`} />;
          const count = counts[date] || 0;
          const day = Number(date.slice(8));
          return (
            <button key={date} type="button" disabled={!count} onClick={() => onPick(date)}
              aria-label={`${fmtDate(date)}${count ? ` 기록 ${count}개` : ''}`}
              className={cx('mx-auto w-10 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm transition',
                count ? 'font-semibold text-ink hover:bg-peach-50 active:scale-95' : 'text-stone-300',
                date === today && 'ring-2 ring-peach-300',
                date === BABY.birth && 'bg-amber-50')}>
              {day}
              <span className={cx('w-1.5 h-1.5 rounded-full', count ? 'bg-rose-500' : 'bg-transparent')} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** 마일스톤 보드: 달성한 것은 색으로, 아직인 것은 눌러서 바로 기록 */
function MilestoneBoard({ records, writable, onOpen, onAdd }) {
  return (
    <section>
      <SectionTitle>성장 마일스톤</SectionTitle>
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 xl:grid-cols-6 pb-1">
        {MILESTONES.map((m) => {
          const rec = records.find((r) => r.milestone === m.id);
          const clickable = rec || writable;
          return (
            <button key={m.id} type="button" disabled={!clickable}
              onClick={() => (rec ? onOpen(rec, 0) : onAdd({ milestone: m.id }))}
              className={cx('shrink-0 w-[7.5rem] md:w-auto rounded-3xl p-3.5 text-left border transition active:scale-[.97]',
                rec ? 'bg-gradient-to-br from-amber-50 to-peach-100 border-amber-100 shadow-card' : 'bg-white/70 border-dashed border-peach-200')}>
              <div className={cx('text-3xl', !rec && 'grayscale opacity-50')}>{m.emoji}</div>
              <p className={cx('mt-1.5 font-semibold text-sm', rec ? 'text-ink' : 'text-stone-400')}>{m.label}</p>
              <p className="text-xs text-stone-400 mt-0.5">{rec ? `${ageLabel(rec.date)} ✓` : m.when}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function EmptyState({ emoji, title, desc, action }) {
  return (
    <div className={cx(CARD, 'p-10 text-center')}>
      <div className="text-5xl">{emoji}</div>
      <p className="mt-3 font-semibold text-ink">{title}</p>
      {desc && <p className="mt-1 text-sm text-stone-400">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function TimelineView({ records, viewer, onOpen, onAdd }) {
  const [stage, setStage] = usePersistentState('timeline:stage', 'all');
  const [asc, setAsc] = usePersistentState('timeline:asc', false);
  const writable = canWrite(viewer);

  // 월령(개월)별로 묶기
  const groups = useMemo(() => {
    const filtered = sortRecords(records.filter((r) => stage === 'all' || stageOf(r.date) === stage), asc);
    const map = new Map();
    filtered.forEach((r) => {
      const m = ageMonths(r.date);
      if (!map.has(m)) map.set(m, []);
      map.get(m).push(r);
    });
    return [...map.entries()].map(([m, items]) => ({ m, items }));
  }, [records, stage, asc]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const stageInfo = STAGES.find((s) => s.id === stage);

  // 달력에서 날짜를 누르면: 월령 필터를 풀고 그날의 기록 카드로 스크롤 + 잠깐 강조
  const [focus, setFocus] = useState(null);   // { date }
  const jumpTo = (date) => { setStage('all'); setFocus({ date }); };
  useEffect(() => {
    if (!focus) return undefined;
    const el = document.querySelector(`[data-record-date="${focus.date}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => setFocus(null), 2600);
    return () => clearTimeout(timer);
  }, [focus]);

  return (
    <div className="space-y-8">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Hero records={records} />
        <RecordCalendar records={records} onPick={jumpTo} />
      </div>
      <MilestoneBoard records={records} writable={writable} onOpen={(r, i) => onOpen(r, i, records)} onAdd={onAdd} />

      <section>
        <SectionTitle right={
          <button className="text-sm text-stone-400 hover:text-peach-500" onClick={() => setAsc(!asc)}>{asc ? '오래된순 ↑' : '최신순 ↓'}</button>
        }>성장 타임라인</SectionTitle>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 pb-1">
          {STAGES.map((s) => <Chip key={s.id} active={stage === s.id} onClick={() => setStage(s.id)}>{s.label}</Chip>)}
        </div>
        {stageInfo && stageInfo.desc && <p className="mt-2 text-sm text-stone-400">이 시기에는 · {stageInfo.desc}</p>}

        {groups.length === 0 ? (
          <div className="mt-5">
            <EmptyState emoji="📷" title={stage === 'all' ? '아직 기록이 없어요' : '이 시기의 기록이 아직 없어요'}
              desc={writable ? '오늘의 이준이를 첫 기록으로 남겨 보세요.' : '새 기록이 올라오면 여기에 보여요.'}
              action={writable && <button className={BTN_PRIMARY} onClick={() => onAdd({})}><Icon name="plus" className="w-4 h-4" />기록 추가</button>} />
          </div>
        ) : (
          <div className="mt-6 ml-2 md:ml-3 border-l-2 border-peach-100 space-y-9">
            {groups.map((g) => {
              const first = g.items[0], last = g.items[g.items.length - 1];
              const y1 = parseYMD(first.date), y2 = parseYMD(last.date);
              const period = [y1, y2].sort((a, b) => a - b).map((d) => `${d.getFullYear()}년 ${d.getMonth() + 1}월`);
              return (
                <div key={g.m} className="relative pl-5 md:pl-7">
                  <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-peach-300 border-4 border-cream shadow" />
                  <div className="flex items-baseline gap-2 flex-wrap mb-3">
                    <h3 className="font-display text-lg text-ink">{monthLabel(g.m)}</h3>
                    <span className="text-sm text-stone-400">{period[0] === period[1] ? period[0] : `${period[0]} ~ ${period[1]}`} · {g.items.length}개</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {g.items.map((r) => <RecordCard key={r.id} record={r} highlight={!!focus && focus.date === r.date} onOpen={(rec, i) => onOpen(rec, i, flat)} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ───────────────────────── 6. 기록 추가 / 수정 폼 ───────────────────────── */

function RecordForm({ initial, me, backend, allTags, onDone, onCancel, toast }) {
  const editing = !!(initial && initial.id);
  const [date, setDate] = useState((initial && initial.date) || todayYMD());
  const [title, setTitle] = useState((initial && initial.title) || '');
  const [memo, setMemo] = useState((initial && initial.memo) || '');
  const [category, setCategory] = useState((initial && initial.category) || 'daily');
  const [milestone, setMilestone] = useState((initial && initial.milestone) || '');
  const [tags, setTags] = useState((initial && initial.tags) || []);
  const [visibility, setVisibility] = useState((initial && initial.visibility) || 'all');
  const [media, setMedia] = useState((initial && initial.media) || []);   // 이미 저장된 사진 · URL
  const [files, setFiles] = useState([]);                                  // 새로 올릴 파일
  const [newTag, setNewTag] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState('');
  const fileInput = useRef(null);

  // 마일스톤에서 바로 들어온 경우 제목 · 분류 · 태그를 미리 채움
  const pickMilestone = (id) => {
    setMilestone(id);
    const m = MILESTONES.find((x) => x.id === id);
    if (!m) return;
    setCategory('milestone');
    if (!title.trim()) setTitle(m.label);
  };
  useEffect(() => { if (!editing && initial && initial.milestone) pickMilestone(initial.milestone); }, []);
  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.preview)), []);

  // ✨ 자동 채우기: 사진(영상은 장면 몇 컷)을 서버 함수 /api/autofill 로 보내 제목 · 메모 초안을 받음
  const [filling, setFilling] = useState('');   // '' | 'title' | 'memo'
  const autofill = async (target) => {
    if (backend.mode !== 'firebase' || !backend.getIdToken) { toast('자동 채우기는 구글 계정으로 로그인한 가족 앨범에서만 쓸 수 있어요.'); return; }
    if (!files.length && !media.length) { toast('먼저 사진이나 영상을 추가해 주세요.'); return; }
    setFilling(target);
    try {
      const MAX = 4;
      const shots = [];
      for (const f of files) {
        if (shots.length >= MAX) break;
        if (f.type === 'image') shots.push(await resizeToDataURL(f.file, 1024, 0.8));
        else shots.push(...(await videoFrames(f.file, 3, 768)).slice(0, MAX - shots.length));
      }
      const images = shots.map((dataUrl) => ({ mimeType: 'image/jpeg', data: dataUrl.split(',')[1] }));
      // 이미 저장된 사진은 주소만 보내고 서버가 내려받음
      const urls = media.filter((m) => m.type !== 'video' && m.url.startsWith('https://firebasestorage.googleapis.com/')).map((m) => m.url).slice(0, MAX - images.length);
      if (!images.length && !urls.length) { toast('자동 채우기에 쓸 수 있는 사진을 찾지 못했어요. 사진 파일을 추가해 주세요.'); return; }

      const milestoneInfo = MILESTONES.find((m) => m.id === milestone);
      const res = await fetch('/api/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await backend.getIdToken()}` },
        body: JSON.stringify({
          images, urls,
          context: {
            date, age: ageLabel(date), category: catOf(category).label, milestone: milestoneInfo ? milestoneInfo.label : '', tags,
            // 채우려는 칸이 아닌 쪽에 이미 적은 내용은 참고 자료로 보냄
            title: target === 'memo' ? title.trim() : '', memo: target === 'title' ? memo.trim() : '',
          },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!data) throw new Error('자동 채우기 서버에 연결할 수 없어요. 배포된 사이트에서 다시 시도해 주세요.');
      if (!res.ok) throw new Error(data.error || '자동 채우기에 실패했어요.');
      if (target === 'title' && data.title) setTitle(data.title);
      if (target === 'memo' && data.memo) setMemo(data.memo);
    } catch (err) {
      toast(err.message || '자동 채우기에 실패했어요.');
    } finally {
      setFilling('');
    }
  };
  const fillBtn = (target, position) => (
    <button type="button" onClick={() => autofill(target)} disabled={!!filling || !!busy}
      title="사진을 보고 자동으로 채우기" aria-label={`사진을 보고 ${target === 'title' ? '제목' : '메모'} 자동으로 채우기`}
      className={cx('absolute right-2 w-9 h-9 rounded-full flex items-center justify-center text-peach-400 hover:bg-peach-50 hover:text-peach-500 transition disabled:opacity-40', position)}>
      {filling === target
        ? <span className="w-4 h-4 rounded-full border-2 border-peach-200 border-t-peach-500 animate-spin" />
        : <Icon name="sparkle" className="w-5 h-5" />}
    </button>
  );

  const toggleTag = (t) => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  const addTag = () => {
    const t = newTag.replace(/[#\s]/g, '');
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setNewTag('');
  };
  const addFiles = (list) => {
    const picked = [...list].filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    setFiles([...files, ...picked.map((file) => ({ file, preview: URL.createObjectURL(file), type: file.type.startsWith('video/') ? 'video' : 'image' }))]);
  };
  const addUrl = () => {
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) { toast('http:// 또는 https:// 로 시작하는 주소를 입력해 주세요.'); return; }
    setMedia([...media, { url: u, type: isVideoUrl(u) ? 'video' : 'image', path: '' }]);
    setUrl('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() && !memo.trim() && !media.length && !files.length) { toast('제목, 메모, 사진 중 하나는 입력해 주세요.'); return; }
    try {
      // 1) 새 파일 업로드 → 다운로드 URL 받기
      const uploaded = [];
      for (let i = 0; i < files.length; i += 1) {
        setBusy(`사진·영상 올리는 중 (${i + 1}/${files.length})`);
        uploaded.push(await backend.uploadMedia(files[i].file, me.uid));
      }
      // 2) 기록 문서 저장
      setBusy('저장하는 중');
      const data = { date, title: title.trim(), memo: memo.trim(), category, milestone, tags, visibility, media: [...media, ...uploaded] };
      if (editing) {
        await backend.updateRecord(initial.id, { ...data, updatedAt: Date.now() });
        const kept = new Set(media.map((m) => m.path));
        backend.deleteMedia((initial.media || []).map((m) => m.path).filter((p) => p && !kept.has(p)));
      } else {
        await backend.addRecord({ ...data, authorUid: me.uid, authorName: me.relation || me.displayName, createdAt: Date.now() });
      }
      toast(editing ? '기록을 수정했어요.' : '기록을 저장했어요 💛');
      onDone();
    } catch (err) {
      toast(errMsg(err));
      setBusy('');
    }
  };

  const tagOptions = [...new Set([...allTags, ...tags])];
  const removeBtn = 'absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-stone-700 text-white flex items-center justify-center shadow';
  return (
    <form onSubmit={submit} className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">{editing ? '기록 수정' : '새 기록 남기기'}</h1>
        <button type="button" className="text-sm text-stone-400 hover:text-peach-500" onClick={onCancel}>취소</button>
      </div>

      <div className={cx(CARD, 'p-5 space-y-5')}>
        <div>
          <span className={LABEL}>사진 · 영상</span>
          <div className="flex gap-3 flex-wrap">
            {media.map((m, i) => (
              <div key={m.url} className="relative w-24 h-24">
                <MediaThumb record={{ category }} media={m} className="w-24 h-24 rounded-2xl overflow-hidden" />
                <button type="button" className={removeBtn} onClick={() => setMedia(media.filter((_, j) => j !== i))} aria-label="사진 빼기"><Icon name="x" className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            {files.map((f, i) => (
              <div key={f.preview} className="relative w-24 h-24">
                <MediaThumb record={{ category }} media={{ url: f.preview, type: f.type }} className="w-24 h-24 rounded-2xl overflow-hidden" />
                <button type="button" className={removeBtn} onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="사진 빼기"><Icon name="x" className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button type="button" onClick={() => fileInput.current.click()}
              className="w-24 h-24 rounded-2xl border-2 border-dashed border-peach-200 text-peach-400 flex flex-col items-center justify-center gap-1 text-xs font-semibold hover:bg-peach-50">
              <Icon name="plus" className="w-6 h-6" />파일 선택
            </button>
            <input ref={fileInput} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </div>
          <div className="mt-3 flex gap-2">
            <input className={INPUT} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="또는 사진·영상 주소(URL) 붙여넣기"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }} inputMode="url" />
            <button type="button" className={cx(BTN_GHOST, 'shrink-0')} onClick={addUrl} disabled={!url.trim()}>추가</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label>
            <span className={LABEL}>날짜</span>
            <input type="date" required className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} />
            <span className="block mt-1.5 text-xs text-peach-500">{date ? ageLabel(date) : ''}</span>
          </label>
          <label>
            <span className={LABEL}>마일스톤 <span className="font-normal text-stone-400">(선택)</span></span>
            <select className={INPUT} value={milestone} onChange={(e) => pickMilestone(e.target.value)}>
              <option value="">해당 없음</option>
              {MILESTONES.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.label}</option>)}
            </select>
          </label>
        </div>

        <div>
          <label className={LABEL} htmlFor="record-title">제목</label>
          <div className="relative">
            <input id="record-title" className={cx(INPUT, 'pr-12')} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 처음으로 방긋 웃은 날" maxLength={60} />
            {fillBtn('title', 'top-1/2 -translate-y-1/2')}
          </div>
        </div>

        <div>
          <span className={LABEL}>카테고리</span>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>{c.emoji} {c.label}</Chip>)}
          </div>
        </div>

        <div>
          <span className={LABEL}>태그</span>
          <div className="flex gap-2 flex-wrap">
            {tagOptions.map((t) => <Chip key={t} active={tags.includes(t)} onClick={() => toggleTag(t)}>#{t}</Chip>)}
          </div>
          <div className="mt-3 flex gap-2">
            <input className={INPUT} value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="새 태그 직접 입력" maxLength={15}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
            <button type="button" className={cx(BTN_GHOST, 'shrink-0')} onClick={addTag} disabled={!newTag.trim()}>추가</button>
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="record-memo">오늘의 메모</label>
          <div className="relative">
            <textarea id="record-memo" className={cx(INPUT, 'min-h-[9rem] leading-7 pr-12')} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="오늘 이준이는 어땠나요?" />
            {fillBtn('memo', 'top-2')}
          </div>
          <p className="mt-1.5 text-xs text-stone-400">✨ 를 누르면 올린 사진을 보고 제목 · 메모 초안을 써 줘요. 사진은 AI 서비스(Google Gemini)로 전송돼요.</p>
        </div>

        <div>
          <span className={LABEL}>공개 범위</span>
          <div className="grid grid-cols-3 gap-2">
            {VISIBILITY.map((v) => (
              <button key={v.id} type="button" onClick={() => setVisibility(v.id)} aria-pressed={visibility === v.id}
                className={cx('rounded-2xl border p-3 text-left transition', visibility === v.id ? 'border-peach-300 bg-peach-50 ring-4 ring-peach-100' : 'border-peach-100 bg-white')}>
                <div className="text-xl">{v.emoji}</div>
                <p className="text-sm font-semibold text-ink mt-1">{v.label}</p>
                <p className="text-xs text-stone-400 hidden sm:block">{v.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button type="submit" className={cx(BTN_PRIMARY, 'w-full py-4 text-base')} disabled={!!busy}>
        {busy ? `${busy}…` : editing ? '수정 내용 저장' : '기록 저장'}
      </button>
    </form>
  );
}

/* ───────────────────────── 7. 검색 · 필터 ───────────────────────── */

const EMPTY_FILTER = { q: '', cats: [], tags: [], from: '', to: '', stage: 'all', media: 'all' };

function SearchView({ records, allTags, onOpen }) {
  const [f, setF] = usePersistentState('search:filter', EMPTY_FILTER);
  const [view, setView] = usePersistentState('search:view', 'cards');
  const set = (patch) => setF({ ...f, ...patch });
  const toggle = (key, v) => set({ [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] });

  const results = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return sortRecords(records.filter((r) => {
      const media = r.media || [];
      if (q && ![r.title, r.memo, r.authorName, ...(r.tags || [])].join(' ').toLowerCase().includes(q.replace(/^#/, ''))) return false;
      if (f.cats.length && !f.cats.includes(r.category)) return false;
      if (f.tags.length && !f.tags.some((t) => (r.tags || []).includes(t))) return false;
      if (f.from && r.date < f.from) return false;
      if (f.to && r.date > f.to) return false;
      if (f.stage !== 'all' && stageOf(r.date) !== f.stage) return false;
      if (f.media === 'photo' && !media.some((m) => m.type !== 'video')) return false;
      if (f.media === 'video' && !media.some((m) => m.type === 'video')) return false;
      return true;
    }), false);
  }, [records, f]);

  const activeCount = (f.q ? 1 : 0) + f.cats.length + f.tags.length + (f.from ? 1 : 0) + (f.to ? 1 : 0) + (f.stage !== 'all' ? 1 : 0) + (f.media !== 'all' ? 1 : 0);
  const album = results.flatMap((r) => (r.media || []).map((m, i) => ({ r, m, i })));

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl text-ink">검색 · 앨범</h1>

      <div className={cx(CARD, 'p-4 md:p-5 space-y-4')}>
        <div className="relative">
          <Icon name="search" className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" />
          <input className={cx(INPUT, 'pl-12')} value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="제목, 메모, #태그로 검색" type="search" />
        </div>

        <div>
          <p className="text-xs font-semibold text-stone-400 mb-2">카테고리</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar md:flex-wrap">
            {CATEGORIES.map((c) => <Chip key={c.id} active={f.cats.includes(c.id)} onClick={() => toggle('cats', c.id)}>{c.emoji} {c.label}</Chip>)}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-stone-400 mb-2">태그</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar md:flex-wrap">
            {allTags.map((t) => <Chip key={t} active={f.tags.includes(t)} onClick={() => toggle('tags', t)}>#{t}</Chip>)}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label><span className="block text-xs font-semibold text-stone-400 mb-2">시작 날짜</span>
            <input type="date" className={INPUT} value={f.from} onChange={(e) => set({ from: e.target.value })} /></label>
          <label><span className="block text-xs font-semibold text-stone-400 mb-2">끝 날짜</span>
            <input type="date" className={INPUT} value={f.to} onChange={(e) => set({ to: e.target.value })} /></label>
          <label><span className="block text-xs font-semibold text-stone-400 mb-2">월령</span>
            <select className={INPUT} value={f.stage} onChange={(e) => set({ stage: e.target.value })}>
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select></label>
          <label><span className="block text-xs font-semibold text-stone-400 mb-2">종류</span>
            <select className={INPUT} value={f.media} onChange={(e) => set({ media: e.target.value })}>
              <option value="all">전체</option><option value="photo">사진 있는 기록</option><option value="video">영상 있는 기록</option>
            </select></label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-500">
          기록 <b className="text-ink">{results.length}</b>개
          {activeCount > 0 && <button className="ml-3 text-peach-500 font-semibold" onClick={() => setF(EMPTY_FILTER)}>필터 초기화 ({activeCount})</button>}
        </p>
        <div className="flex rounded-full bg-white border border-peach-100 p-1 text-sm">
          {[['cards', '카드'], ['album', '사진첩']].map(([id, label]) => (
            <button key={id} onClick={() => setView(id)} className={cx('px-3.5 py-1.5 rounded-full font-medium', view === id ? 'bg-peach-400 text-white' : 'text-stone-400')}>{label}</button>
          ))}
        </div>
      </div>

      {results.length === 0 && <EmptyState emoji="🔍" title="조건에 맞는 기록이 없어요" desc="검색어나 필터를 바꿔 보세요." />}
      {results.length > 0 && view === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {results.map((r) => <RecordCard key={r.id} record={r} onOpen={(rec, i) => onOpen(rec, i, results)} />)}
        </div>
      )}
      {results.length > 0 && view === 'album' && (album.length === 0
        ? <EmptyState emoji="🖼️" title="사진이 있는 기록이 없어요" />
        : (
          <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-1.5 md:gap-3">
            {album.map(({ r, m, i }) => (
              <button key={`${r.id}-${i}`} onClick={() => onOpen(r, i, results)} className="relative rounded-xl md:rounded-2xl overflow-hidden group">
                <MediaThumb record={r} media={m} className="w-full aspect-square" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent text-white text-[11px] px-2 pt-5 pb-1.5 text-left opacity-0 group-hover:opacity-100 transition">{ageLabel(r.date)}</span>
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}

/* ───────────────────────── 8. 가족 공유 · 내 정보 ───────────────────────── */

/** 관리자가 가족의 관계 · 그룹 · 권한을 정하는 편집기 */
function MemberEditor({ user, isSelf, submitLabel, onSave, onCancel, extra }) {
  const preset = RELATIONS.some((r) => r.label === user.relation);
  const [relation, setRelation] = useState(user.relation || '');
  const [custom, setCustom] = useState(!preset && !!user.relation);
  const [group, setGroup] = useState(user.group || 'relatives');
  const [permission, setPermission] = useState(user.permission || 'view');
  const [role, setRole] = useState(user.role || 'family');

  const pickRelation = (value) => {
    if (value === '__custom') { setCustom(true); setRelation(''); return; }
    setCustom(false); setRelation(value);
    const r = RELATIONS.find((x) => x.label === value);
    if (r) { setGroup(r.group); if (r.group === 'parents') setPermission('edit'); }
  };
  const save = () => onSave({ relation: relation.trim(), group, permission: role === 'admin' ? 'edit' : permission, role });

  return (
    <div className="mt-3 rounded-2xl bg-peach-50/70 p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label><span className="block text-xs font-semibold text-stone-500 mb-1.5">이준이와의 관계</span>
          <select className={INPUT} value={custom ? '__custom' : relation} onChange={(e) => pickRelation(e.target.value)}>
            <option value="">선택해 주세요</option>
            {RELATIONS.map((r) => <option key={r.label} value={r.label}>{r.label}</option>)}
            <option value="__custom">직접 입력</option>
          </select>
          {custom && <input className={cx(INPUT, 'mt-2')} value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="예: 증조할머니" maxLength={12} />}
        </label>
        <label><span className="block text-xs font-semibold text-stone-500 mb-1.5">가족 그룹 (볼 수 있는 범위)</span>
          <select className={INPUT} value={group} onChange={(e) => setGroup(e.target.value)}>
            {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.emoji} {g.label}</option>)}
          </select></label>
        {!isSelf && (
          <label><span className="block text-xs font-semibold text-stone-500 mb-1.5">권한</span>
            <select className={INPUT} value={role === 'admin' ? 'admin' : permission} onChange={(e) => {
              if (e.target.value === 'admin') setRole('admin'); else { setRole('family'); setPermission(e.target.value); }
            }}>
              <option value="view">보기 전용</option>
              <option value="edit">기록 작성 가능</option>
              <option value="admin">관리자 (가족 승인 · 모든 기록 관리)</option>
            </select></label>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        <button className={BTN_PRIMARY} onClick={save} disabled={!relation.trim()}><Icon name="check" className="w-4 h-4" />{submitLabel}</button>
        {extra}
        {onCancel && <button className={BTN_GHOST} onClick={onCancel}>취소</button>}
      </div>
    </div>
  );
}

function FamilyView({ users, records, me, backend, viewAs, setViewAs, toast }) {
  const admin = isAdmin(me);
  const [editing, setEditing] = useState('');
  const pending = users.filter((u) => u.status === 'pending');
  const rejected = users.filter((u) => u.status === 'rejected');
  const members = users.filter((u) => u.status === 'approved')
    .sort((a, b) => GROUPS.findIndex((g) => g.id === a.group) - GROUPS.findIndex((g) => g.id === b.group));

  const run = async (fn, okMsg) => { try { await fn(); if (okMsg) toast(okMsg); } catch (e) { toast(errMsg(e)); } };
  const approve = (u, data) => run(() => backend.updateUser(u.uid, { ...data, status: 'approved' }), `${data.relation} 님을 가족으로 승인했어요.`);
  const reject = (u) => run(() => backend.updateUser(u.uid, { status: 'rejected' }), '가입 요청을 거절했어요.');
  const remove = (u) => {
    if (window.confirm(`${u.relation || u.displayName} 님을 가족 목록에서 삭제할까요?\n다시 로그인하면 새로 승인 요청을 보내게 됩니다.`)) run(() => backend.removeUser(u.uid), '삭제했어요.');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-ink">가족 공유</h1>
        <p className="mt-1 text-sm text-stone-400">승인된 가족만 이준이의 앨범을 볼 수 있어요.</p>
      </div>

      {/* 공개 범위 한눈에 보기 */}
      <section>
        <SectionTitle>공개 범위별 기록</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {VISIBILITY.map((v) => (
            <div key={v.id} className={cx(CARD, 'p-4')}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink">{v.emoji} {v.label}</p>
                <p className="text-sm text-stone-400">기록 <b className="text-peach-500">{records.filter((r) => (r.visibility || 'all') === v.id).length}</b>개</p>
              </div>
              <div className="mt-3 flex gap-1.5 flex-wrap">
                {GROUPS.map((g) => {
                  const on = v.groups.includes(g.id);
                  return <span key={g.id} className={cx('text-xs rounded-full px-2.5 py-1', on ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-300 line-through')}>{g.label}</span>;
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 승인 대기 (관리자 전용) */}
      {admin && (
        <section>
          <SectionTitle>승인 대기 <span className="text-peach-500">{pending.length}</span></SectionTitle>
          {pending.length === 0 ? (
            <div className={cx(CARD, 'p-5 text-sm text-stone-400')}>새 가입 요청이 없어요. 가족에게 앨범 주소를 보내고 구글 계정으로 로그인하도록 안내해 주세요.</div>
          ) : (
            <div className="space-y-3">
              {pending.map((u) => (
                <div key={u.uid} className={cx(CARD, 'p-4')}>
                  <div className="flex items-center gap-3">
                    <Avatar user={u} />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{u.displayName}</p>
                      <p className="text-xs text-stone-400 truncate">{u.email}</p>
                    </div>
                    <span className="ml-auto shrink-0 text-xs rounded-full bg-amber-50 text-amber-700 px-2.5 py-1 font-semibold">대기 중</span>
                  </div>
                  {u.requestNote && <p className="mt-3 text-sm text-stone-600 bg-white rounded-2xl border border-peach-50 px-4 py-2.5">“{u.requestNote}”</p>}
                  <MemberEditor user={u} submitLabel="관계 등록 후 승인" onSave={(data) => approve(u, data)}
                    extra={<button className={BTN_DANGER} onClick={() => reject(u)}>거절</button>} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 가족 구성원 */}
      <section>
        <SectionTitle>가족 구성원 <span className="text-peach-500">{members.length}</span></SectionTitle>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {members.map((u) => {
            const g = groupOf(u.group);
            const visible = records.filter((r) => canSee(r, u)).length;
            const self = u.uid === me.uid;
            return (
              <div key={u.uid} className={cx(CARD, 'p-4', viewAs === u.uid && 'ring-4 ring-sky-100')}>
                <div className="flex items-center gap-3">
                  <Avatar user={u} />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{u.relation || '관계 미등록'} <span className="font-normal text-stone-400 text-sm">{u.displayName}{self && ' (나)'}</span></p>
                    <div className="mt-1 flex gap-1.5 flex-wrap text-xs">
                      <span className="rounded-full bg-peach-50 text-peach-500 px-2 py-0.5">{g.emoji} {g.label}</span>
                      <span className="rounded-full bg-stone-100 text-stone-500 px-2 py-0.5">{isAdmin(u) ? '👑 관리자' : u.permission === 'edit' ? '✏️ 기록 작성' : '👀 보기 전용'}</span>
                    </div>
                  </div>
                  <div className="ml-auto text-right shrink-0">
                    <p className="text-lg font-bold text-ink">{visible}<span className="text-sm font-normal text-stone-400">/{records.length}</span></p>
                    <p className="text-[11px] text-stone-400">볼 수 있는 기록</p>
                  </div>
                </div>
                {admin && editing !== u.uid && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {!self && <button className={cx(BTN_GHOST, 'py-2')} onClick={() => setViewAs(viewAs === u.uid ? '' : u.uid)}><Icon name="eye" className="w-4 h-4" />{viewAs === u.uid ? '미리보기 끝내기' : '이 시점으로 미리보기'}</button>}
                    <button className={cx(BTN_GHOST, 'py-2')} onClick={() => setEditing(u.uid)}><Icon name="edit" className="w-4 h-4" />수정</button>
                    {!self && <button className={cx(BTN_DANGER, 'py-2')} onClick={() => remove(u)}>삭제</button>}
                  </div>
                )}
                {admin && editing === u.uid && (
                  <MemberEditor user={u} isSelf={self} submitLabel="저장" onCancel={() => setEditing('')}
                    onSave={(data) => { run(() => backend.updateUser(u.uid, self ? { relation: data.relation, group: data.group } : data), '저장했어요.'); setEditing(''); }} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {admin && rejected.length > 0 && (
        <section>
          <SectionTitle>거절한 요청</SectionTitle>
          <div className="space-y-2">
            {rejected.map((u) => (
              <div key={u.uid} className={cx(CARD, 'p-4 flex items-center gap-3 flex-wrap')}>
                <Avatar user={u} size="w-9 h-9" />
                <p className="text-sm text-ink">{u.displayName} <span className="text-stone-400">{u.email}</span></p>
                <div className="ml-auto flex gap-2">
                  <button className={cx(BTN_GHOST, 'py-2')} onClick={() => run(() => backend.updateUser(u.uid, { status: 'pending' }), '다시 승인 대기로 옮겼어요.')}>다시 검토</button>
                  <button className={cx(BTN_DANGER, 'py-2')} onClick={() => remove(u)}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SettingsView({ me, mode, users, records, baby, onPickBaby, onClearBaby, onLogout, toast }) {
  const [installable, setInstallable] = useState(!!window.__installPrompt);
  useEffect(() => {
    const on = () => setInstallable(true);
    window.addEventListener('album-installable', on);
    return () => window.removeEventListener('album-installable', on);
  }, []);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  const install = async () => {
    const prompt = window.__installPrompt;
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    window.__installPrompt = null;
    setInstallable(false);
  };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ baby: BABY, exportedAt: new Date().toISOString(), records }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `유이준-앨범-백업-${todayYMD()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('기록을 파일로 내보냈어요.');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="font-display text-2xl text-ink">내 정보</h1>

      <div className={cx(CARD, 'p-5 flex items-center gap-4')}>
        <Avatar user={me} size="w-16 h-16" />
        <div className="min-w-0">
          <p className="font-semibold text-lg text-ink">{me.relation || '관계 미등록'} <span className="font-normal text-stone-400 text-base">{me.displayName}</span></p>
          <p className="text-sm text-stone-400 truncate">{me.email}</p>
          <p className="mt-1 text-xs text-peach-500 font-semibold">{isAdmin(me) ? '👑 관리자' : me.permission === 'edit' ? '✏️ 기록 작성 가능' : '👀 보기 전용'} · {groupOf(me.group).label}</p>
        </div>
      </div>

      {onPickBaby && (
        <div className={cx(CARD, 'p-5 flex items-center gap-4')}>
          <BabyAvatar baby={baby} onPick={onPickBaby} size="w-16 h-16" />
          <div className="min-w-0">
            <p className="font-semibold text-ink">{BABY.nick}이 프로필 사진</p>
            <p className="mt-1 text-sm text-stone-400">사진을 누르면 바꿀 수 있어요. 화면 왼쪽 위 아이콘에 표시돼요.</p>
            {baby && baby.photoURL && <button className="mt-2 text-sm font-semibold text-peach-500" onClick={onClearBaby}>기본 아이콘으로 되돌리기</button>}
          </div>
        </div>
      )}

      <div className={cx(CARD, 'p-5')}>
        <p className="font-semibold text-ink">📱 앱으로 설치</p>
        {standalone ? <p className="mt-1 text-sm text-stone-400">이미 앱으로 설치해서 사용하고 있어요.</p> : installable ? (
          <>
            <p className="mt-1 text-sm text-stone-400">홈 화면 · 바탕화면에 추가하면 앱처럼 바로 열 수 있어요.</p>
            <button className={cx(BTN_PRIMARY, 'mt-3')} onClick={install}><Icon name="download" className="w-4 h-4" />앱 설치하기</button>
          </>
        ) : (
          <ul className="mt-2 text-sm text-stone-500 space-y-1 list-disc pl-5">
            <li>아이폰(Safari): 공유 버튼 → “홈 화면에 추가”</li>
            <li>안드로이드(Chrome): 메뉴 ⋮ → “앱 설치” 또는 “홈 화면에 추가”</li>
            <li>PC(Chrome · Edge): 주소창 오른쪽의 설치 아이콘</li>
          </ul>
        )}
      </div>

      <div className={cx(CARD, 'p-5')}>
        <p className="font-semibold text-ink">💾 데이터</p>
        <p className="mt-1 text-sm text-stone-400">
          {mode === 'demo'
            ? '체험 모드: 모든 내용이 이 브라우저(LocalStorage)에만 저장돼요.'
            : '가족 앨범: Firebase 에 저장되어 가족 모두에게 실시간으로 공유돼요.'}
        </p>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button className={BTN_GHOST} onClick={exportJson}><Icon name="download" className="w-4 h-4" />기록 내보내기 (JSON)</button>
          {mode === 'demo' && <button className={BTN_DANGER} onClick={() => { if (window.confirm('체험 데이터를 처음 상태로 되돌릴까요?')) { DemoStore.commit(seedDemo()); toast('체험 데이터를 초기화했어요.'); } }}>체험 데이터 초기화</button>}
        </div>
      </div>

      {mode === 'demo' && (
        <div className={cx(CARD, 'p-5')}>
          <p className="font-semibold text-ink">🎭 다른 가족으로 체험하기</p>
          <p className="mt-1 text-sm text-stone-400">가족마다 화면이 어떻게 달라지는지 확인해 보세요.</p>
          <div className="mt-3 flex gap-2 flex-wrap">
            {users.map((u) => (
              <Chip key={u.uid} active={u.uid === me.uid} onClick={() => DemoStore.patch('currentUid', () => u.uid)}>
                {u.relation || u.displayName}{u.status !== 'approved' && ' · 승인 전'}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <button className={cx(BTN_GHOST, 'w-full py-3.5')} onClick={onLogout}><Icon name="logout" className="w-4 h-4" />{mode === 'demo' ? '체험 모드 나가기' : '로그아웃'}</button>
      <p className="text-center text-xs text-stone-300">유이준 디지털 앨범 · {fmtDate(BABY.birth)}부터</p>
    </div>
  );
}

/* ───────────────────────── 9. 로그인 · 승인 대기 화면 ───────────────────────── */

function CenterCard({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className={cx(CARD, 'w-full max-w-md p-8 text-center shadow-soft fade-up')}>{children}</div>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.500-4.700 7.200l7.600 5.900c4.400-4.100 6.900-10.100 6.900-17.600z" />
      <path fill="#FBBC05" d="M10.500 28.700c-.5-1.500-.8-3.100-.8-4.700s.3-3.200.8-4.700l-7.900-6.100C.9 16.500 0 20.100 0 24s.9 7.500 2.600 10.800l7.900-6.100z" />
      <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.600-5.900c-2.100 1.400-4.900 2.300-8.300 2.300-6.300 0-11.600-4.200-13.500-9.900l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
    </svg>
  );
}

function LoginScreen({ firebaseReady, error, onGoogle, onDemo }) {
  const [busy, setBusy] = useState(false);
  const days = dayDiff(BABY.birth, todayYMD());
  const google = async () => { setBusy(true); try { await onGoogle(); } finally { setBusy(false); } };
  return (
    <CenterCard>
      <div className="text-6xl">👶</div>
      <h1 className="font-display text-3xl text-ink mt-3">{BABY.name} 디지털 앨범</h1>
      <p className="mt-2 text-stone-500">{days >= 0 ? `태어난 지 ${days + 1}일째` : `만나기까지 ${-days}일`} · 가족이 함께 보는 성장 기록</p>
      <p className="mt-1 text-xs text-stone-400">{fmtDate(BABY.birth)} {BABY.birthTime} · {BABY.city} {BABY.hospital}</p>

      <button className={cx(BTN, 'mt-7 w-full py-3.5 bg-white border border-stone-200 text-ink shadow-card hover:bg-stone-50')} onClick={google} disabled={busy || !firebaseReady}>
        <GoogleLogo />{busy ? '로그인 중…' : 'Google 계정으로 시작하기'}
      </button>
      <p className="mt-3 text-xs text-stone-400 leading-relaxed">처음 로그인하면 가입 요청이 전달돼요.<br />관리자(엄마 · 아빠)가 가족 관계를 등록하고 승인하면 입장할 수 있어요.</p>

      {!firebaseReady && <p className="mt-4 text-sm text-amber-700 bg-amber-50 rounded-2xl px-4 py-3">Firebase 에 연결할 수 없어요. 인터넷 연결을 확인하고 새로고침해 주세요.</p>}
      {error && <p className="mt-4 text-sm text-rose-600 bg-rose-50 rounded-2xl px-4 py-3" role="alert">{error}</p>}

      <div className="mt-6 pt-5 border-t border-peach-50">
        <button className="text-sm font-semibold text-peach-500 hover:underline" onClick={onDemo}>로그인 없이 체험 모드로 둘러보기</button>
        <p className="mt-1 text-xs text-stone-300">체험 모드의 내용은 이 브라우저에만 저장돼요.</p>
      </div>
    </CenterCard>
  );
}

function PendingScreen({ me, backend, mode, onLogout, toast }) {
  const [note, setNote] = useState(me.requestNote || '');
  const rejected = me.status === 'rejected';
  const save = async () => {
    try { await backend.updateUser(me.uid, { requestNote: note.trim() }); toast('관리자에게 메모를 전달했어요.'); } catch (e) { toast(errMsg(e)); }
  };
  return (
    <CenterCard>
      <div className="text-6xl">{rejected ? '🙏' : '⏳'}</div>
      <h1 className="font-display text-2xl text-ink mt-3">{rejected ? '입장이 승인되지 않았어요' : '가족 승인을 기다리고 있어요'}</h1>
      <div className="mt-4 flex items-center justify-center gap-3">
        <Avatar user={me} />
        <div className="text-left min-w-0">
          <p className="font-semibold text-ink">{me.displayName}</p>
          <p className="text-xs text-stone-400 truncate">{me.email}</p>
        </div>
      </div>
      {rejected ? (
        <p className="mt-4 text-sm text-stone-500">가족이 맞다면 {BABY.nick}이 엄마 · 아빠에게 직접 연락해 주세요.</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-stone-500 leading-relaxed">관리자(엄마 · 아빠)가 가족 관계를 등록하고 승인하면<br />이 화면이 자동으로 앨범으로 바뀌어요.</p>
          <div className="mt-5 text-left">
            <label className={LABEL} htmlFor="note">관리자에게 남길 한마디</label>
            <input id="note" className={INPUT} value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 이준이 외할머니예요" maxLength={50} />
            <button className={cx(BTN_PRIMARY, 'mt-3 w-full')} onClick={save} disabled={note.trim() === (me.requestNote || '')}>메모 전달하기</button>
          </div>
        </>
      )}
      <button className="mt-6 text-sm text-stone-400 hover:text-peach-500" onClick={onLogout}>{mode === 'demo' ? '체험 모드 나가기' : '다른 계정으로 로그인'}</button>
      {mode === 'demo' && <p className="mt-3"><button className="text-sm font-semibold text-peach-500" onClick={() => DemoStore.patch('currentUid', () => 'demo-dad')}>관리자(아빠)로 돌아가 승인해 보기</button></p>}
    </CenterCard>
  );
}

/* ───────────────────────── 10. 앱 본체 ───────────────────────── */

const NAV = [
  { id: 'home', label: '타임라인', icon: 'home' },
  { id: 'search', label: '검색', icon: 'search' },
  { id: 'add', label: '기록 추가', icon: 'plus' },
  { id: 'family', label: '가족', icon: 'users' },
  { id: 'me', label: '내 정보', icon: 'user' },
];

function App() {
  const FB = window.AlbumFirebase;                                   // firebase.js 가 로드되지 않았으면 undefined
  const [mode, setMode] = usePersistentState('mode', 'firebase');    // 'firebase' | 'demo'
  const backend = mode === 'demo' ? demoBackend : FB;

  const [auth, setAuth] = useState({ status: 'loading', me: null, error: '' });
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [baby, setBaby] = useState(null);          // 이준이 프로필 사진 { photoURL, photoPath }
  const [tab, setTab] = usePersistentState('tab', 'home');
  const [draft, setDraft] = useState(null);        // 기록 폼 초기값(수정할 기록 또는 미리 채울 값)
  const [formKey, setFormKey] = useState(0);
  const [lightbox, setLightbox] = useState(null);  // { list, start }
  const [viewAs, setViewAs] = useState('');        // 관리자의 "다른 가족 시점 미리보기"
  const [toastMsg, setToastMsg] = useState(null);

  const toast = (text) => setToastMsg({ text, id: Date.now() });
  useEffect(() => {
    if (!toastMsg) return undefined;
    const t = setTimeout(() => setToastMsg(null), 3200);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // ── 로그인 상태 구독
  useEffect(() => {
    setViewAs('');
    if (mode === 'demo') {
      return DemoStore.subscribe((s) => setAuth({ status: 'in', me: s.users.find((u) => u.uid === s.currentUid) || s.users[0], error: '' }));
    }
    if (!FB) { setAuth({ status: 'out', me: null, error: '' }); return undefined; }

    let unsubProfile = null;
    const fail = (e) => { setAuth({ status: 'out', me: null, error: errMsg(e) }); FB.signOut().catch(() => {}); };
    const unsubAuth = FB.watchAuth(async (user) => {
      if (unsubProfile) { unsubProfile(); unsubProfile = null; }
      if (!user) { setAuth((a) => ({ status: 'out', me: null, error: a.error })); return; }
      try {
        const { isNewAdmin } = await FB.ensureUserProfile(user);
        // 첫 관리자가 만들어지면 '탄생' 기록을 자동으로 남김
        if (isNewAdmin) FB.addRecord(birthRecord({ uid: user.uid, displayName: user.displayName || '관리자' })).catch(() => {});
        unsubProfile = FB.watchUser(user.uid, (profile) => {
          if (profile) setAuth({ status: 'in', me: profile, error: '' });
          else fail(new Error('가족 목록에서 삭제된 계정이에요. 다시 로그인하면 승인 요청을 새로 보낼 수 있어요.'));
        }, fail);
      } catch (e) { fail(e); }
    });
    return () => { unsubAuth(); if (unsubProfile) unsubProfile(); };
  }, [mode]);

  const me = auth.me;
  const approved = auth.status === 'in' && me && me.status === 'approved';

  // ── 승인된 가족만 기록 · 가족 목록을 실시간 구독
  useEffect(() => {
    if (!approved) { setRecords([]); setUsers([]); setBaby(null); return undefined; }
    // 새로고침 직후에는 LocalStorage 에 보관해 둔 마지막 기록을 먼저 보여 줌
    if (mode === 'firebase') { setRecords(LS.get(`cache:records:${me.uid}`, [])); setBaby(LS.get('cache:baby', null)); }
    const onErr = (e) => toast(errMsg(e));
    const un1 = backend.watchRecords((list) => {
      setRecords(list);
      if (mode === 'firebase') LS.set(`cache:records:${me.uid}`, list);
    }, onErr);
    const un2 = backend.watchUsers(setUsers, onErr);
    // (브라우저에 예전 firebase.js 가 남아 있어도 앱이 멈추지 않도록 함수 유무를 확인)
    const un3 = backend.watchBaby ? backend.watchBaby((b) => {
      setBaby(b);
      if (mode === 'firebase') LS.set('cache:baby', b);
    }, () => {}) : () => {};
    return () => { un1(); un2(); un3(); };
  }, [approved, mode, me && me.uid]);

  const loginGoogle = async () => {
    setAuth((a) => ({ ...a, error: '' }));
    try { await FB.signInGoogle(); } catch (e) { setAuth((a) => ({ ...a, error: errMsg(e) })); }
  };
  const logout = () => {
    setLightbox(null); setDraft(null); setTab('home');
    if (mode === 'demo') { setMode('firebase'); return; }
    if (me) LS.del(`cache:records:${me.uid}`);
    LS.del('cache:baby');
    FB.signOut();
  };

  // ── 이준이 프로필 사진 바꾸기 (관리자)
  const changeBabyPhoto = async (file) => {
    if (!file) return;
    try {
      toast('프로필 사진을 올리는 중…');
      const uploaded = await backend.uploadMedia(await cropSquare(file, 512), me.uid);
      const oldPath = baby && baby.photoPath;
      await backend.setBabyPhoto({ photoURL: uploaded.url, photoPath: uploaded.path || '', updatedAt: Date.now() });
      if (oldPath) backend.deleteMedia([oldPath]);
      toast('프로필 사진을 바꿨어요.');
    } catch (e) { toast(errMsg(e)); }
  };
  const clearBabyPhoto = async () => {
    try {
      const oldPath = baby && baby.photoPath;
      await backend.setBabyPhoto({ photoURL: '', photoPath: '', updatedAt: Date.now() });
      if (oldPath) backend.deleteMedia([oldPath]);
      toast('기본 아이콘으로 되돌렸어요.');
    } catch (e) { toast(errMsg(e)); }
  };

  // 미리보기 중이면 그 가족의 시점으로 기록을 걸러서 보여 줌
  const viewer = (viewAs && users.find((u) => u.uid === viewAs)) || me;
  const previewing = !!me && viewer !== me;
  const visible = useMemo(() => (viewer ? records.filter((r) => canSee(r, viewer)) : []), [records, viewer]);
  const allTags = useMemo(() => [...new Set([...DEFAULT_TAGS, ...visible.flatMap((r) => r.tags || [])])], [visible]);
  const writable = canWrite(me) && !previewing;
  const actingViewer = previewing ? { ...viewer, permission: 'view', role: 'family' } : viewer;

  const openForm = (initial) => { setDraft(initial || {}); setFormKey((k) => k + 1); setLightbox(null); setTab('add'); window.scrollTo(0, 0); };
  const go = (id) => { if (id === 'add') { openForm({}); return; } setTab(id); window.scrollTo(0, 0); };
  const openLightbox = (rec, idx, list) => setLightbox({ list, start: { id: rec.id, idx } });
  const removeRecord = async (rec) => {
    if (!window.confirm(`“${rec.title || fmtDate(rec.date)}” 기록을 삭제할까요?\n삭제하면 되돌릴 수 없어요.`)) return;
    try { await backend.deleteRecord(rec); setLightbox(null); toast('기록을 삭제했어요.'); } catch (e) { toast(errMsg(e)); }
  };

  const toastEl = toastMsg && (
    <div key={toastMsg.id} className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-28 md:bottom-8 max-w-[90vw] rounded-2xl bg-ink text-white text-sm px-5 py-3 shadow-soft fade-up" role="status">{toastMsg.text}</div>
  );

  // ── 화면 분기: 불러오는 중 → 로그인 → 승인 대기 → 앨범
  if (auth.status === 'loading') return <CenterCard><div className="text-5xl">👶</div><p className="mt-3 text-stone-400">앨범을 여는 중…</p></CenterCard>;
  if (auth.status === 'out' || !me) return <><LoginScreen firebaseReady={!!FB} error={auth.error} onGoogle={loginGoogle} onDemo={() => setMode('demo')} />{toastEl}</>;
  if (!approved) return <><PendingScreen key={me.uid} me={me} backend={backend} mode={mode} onLogout={logout} toast={toast} />{toastEl}</>;

  const navItems = NAV.filter((n) => n.id !== 'add' || writable);
  const pendingCount = isAdmin(me) ? users.filter((u) => u.status === 'pending').length : 0;
  const current = tab === 'add' && !writable ? 'home' : tab;
  const pickBaby = isAdmin(me) && !previewing ? changeBabyPhoto : null;
  const lightboxList = lightbox ? lightbox.list.map((r) => visible.find((v) => v.id === r.id)).filter(Boolean) : [];

  return (
    <div className="min-h-screen md:flex">
      {/* PC: 사이드바 */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 h-screen sticky top-0 p-5 border-r border-white bg-white/60 backdrop-blur">
        <div className="flex items-center gap-3 px-2">
          <BabyAvatar baby={baby} onPick={pickBaby} />
          <div>
            <p className="font-display text-lg text-ink leading-tight">{BABY.name}</p>
            <p className="text-xs text-stone-400">디지털 앨범</p>
          </div>
        </div>
        <nav className="mt-8 space-y-1.5">
          {navItems.map((n) => (
            <button key={n.id} onClick={() => go(n.id)} aria-current={current === n.id ? 'page' : undefined}
              className={cx('w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition',
                n.id === 'add' ? 'bg-peach-400 text-white shadow-soft hover:bg-peach-500 my-3'
                  : current === n.id ? 'bg-peach-100 text-peach-500' : 'text-stone-500 hover:bg-peach-50')}>
              <Icon name={n.icon} />{n.label}
              {n.id === 'family' && pendingCount > 0 && <span className="ml-auto text-xs bg-rose-400 text-white rounded-full px-2 py-0.5">{pendingCount}</span>}
            </button>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 px-2">
          <Avatar user={me} size="w-10 h-10" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate">{me.relation || me.displayName}</p>
            <p className="text-xs text-stone-400">{mode === 'demo' ? '체험 모드' : isAdmin(me) ? '관리자' : '가족'}</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* 모바일: 상단 바 */}
        <header className="md:hidden sticky top-0 z-30 bg-cream/85 backdrop-blur px-4 py-3 flex items-center gap-2.5 border-b border-white">
          <BabyAvatar baby={baby} onPick={pickBaby} size="w-9 h-9" rounded="rounded-xl" />
          <p className="font-display text-lg text-ink">{BABY.name} 앨범</p>
          {mode === 'demo' && <span className="ml-auto text-xs rounded-full bg-sky-50 text-sky-600 px-2.5 py-1 font-semibold">체험 모드</span>}
        </header>

        {previewing && (
          <div className="sticky top-[57px] md:top-0 z-20 bg-sky-50 border-b border-sky-100 text-sky-700 text-sm px-4 py-2.5 flex items-center justify-center gap-3">
            <Icon name="eye" className="w-4 h-4 shrink-0" />
            <span><b>{viewer.relation || viewer.displayName}</b> 님에게 보이는 화면이에요 ({visible.length}/{records.length}개 기록)</span>
            <button className="font-semibold underline shrink-0" onClick={() => setViewAs('')}>끝내기</button>
          </div>
        )}

        <main className="px-4 md:px-8 xl:px-12 pt-5 md:pt-8 pb-32 md:pb-12 max-w-7xl mx-auto">
          {current === 'home' && <TimelineView records={visible} viewer={actingViewer} onOpen={openLightbox} onAdd={openForm} />}
          {current === 'search' && <SearchView records={visible} allTags={allTags} onOpen={openLightbox} />}
          {current === 'add' && <RecordForm key={formKey} initial={draft} me={me} backend={backend} allTags={allTags} toast={toast}
            onDone={() => go('home')} onCancel={() => go('home')} />}
          {current === 'family' && <FamilyView users={users} records={records} me={me} backend={backend} viewAs={viewAs} setViewAs={setViewAs} toast={toast} />}
          {current === 'me' && <SettingsView me={me} mode={mode} users={users} records={visible} baby={baby} onPickBaby={pickBaby} onClearBaby={clearBabyPhoto} onLogout={logout} toast={toast} />}
        </main>

        {/* 모바일: 하단 내비게이션 */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-peach-50 pb-safe shadow-[0_-6px_24px_-12px_rgba(214,140,110,0.35)]">
          <div className="flex items-end justify-around px-2 h-16">
            {navItems.map((n) => (n.id === 'add' ? (
              <button key={n.id} onClick={() => go('add')} aria-label="기록 추가"
                className="-translate-y-4 w-14 h-14 rounded-full bg-peach-400 text-white shadow-soft flex items-center justify-center active:scale-95 transition">
                <Icon name="plus" className="w-7 h-7" />
              </button>
            ) : (
              <button key={n.id} onClick={() => go(n.id)} aria-current={current === n.id ? 'page' : undefined}
                className={cx('relative flex-1 h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium', current === n.id ? 'text-peach-500' : 'text-stone-400')}>
                <Icon name={n.icon} className="w-6 h-6" />{n.label}
                {n.id === 'family' && pendingCount > 0 && <span className="absolute top-2 right-1/4 w-4 h-4 text-[10px] leading-4 bg-rose-400 text-white rounded-full">{pendingCount}</span>}
              </button>
            )))}
          </div>
        </nav>
      </div>

      {lightbox && lightboxList.length > 0 && (
        <Lightbox list={lightboxList} start={lightbox.start} viewer={actingViewer} onClose={() => setLightbox(null)} onEdit={openForm} onDelete={removeRecord} />
      )}
      {toastEl}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
