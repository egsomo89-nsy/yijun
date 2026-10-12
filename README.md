# 유이준 디지털 앨범

2026년 10월 6일 18:55, 수원 시온여성병원에서 태어난 유이준의 성장 기록을 가족과 함께 보는 설치형 웹앱(PWA)입니다.

- 화면: React 18 + Tailwind CSS (CDN, 빌드 과정 없음)
- 데이터: Firebase (구글 로그인 · Firestore · Storage), 프로젝트 `yijun-3757c`
- 배포: GitHub → Vercel

## 폴더 구성

| 파일 | 역할 |
| --- | --- |
| `public/index.html` | 시작 페이지. React · Tailwind · Babel 을 CDN 으로 불러옵니다. |
| `public/app.jsx` | 화면 전체(타임라인, 기록 폼, 검색, 가족 공유, 로그인). |
| `public/firebase.js` | Firebase 초기화와 로그인 · Firestore · Storage 함수. `firebaseConfig` 가 여기 있습니다. |
| `public/sw.js`, `manifest.webmanifest`, `icons/` | 앱 설치와 오프라인 실행을 위한 PWA 파일. |
| `api/autofill.js` | ✨ 자동 채우기 서버 함수. 사진을 Gemini 에 보내 제목 · 메모 초안을 받습니다. |
| `vercel.json` | Vercel 배포 설정. 빌드 없이 `public/` 폴더를 그대로 올립니다. |
| `firestore.rules`, `storage.rules` | Firebase 보안 규칙. **콘솔에 직접 게시해야 합니다.** |
| `firebase.json`, `.firebaserc` | (선택) Firebase CLI 로 규칙을 게시할 때만 사용합니다. |

## 1. 내 PC 에서 실행

```bash
python -m http.server 5173 --directory public
```

브라우저에서 <http://localhost:5173> 을 엽니다. (파일을 더블클릭해서 여는 `file://` 방식은 동작하지 않습니다.)

로그인 화면의 **“로그인 없이 체험 모드로 둘러보기”** 를 누르면 Firebase 설정 없이 모든 기능을 바로 써 볼 수 있습니다. 체험 모드의 데이터는 그 브라우저의 LocalStorage 에만 저장됩니다.

## 2. Firebase 콘솔 설정 (한 번만)

[Firebase 콘솔](https://console.firebase.google.com/project/yijun-3757c)에서:

1. **Authentication → 로그인 방법 → Google** 사용 설정
2. **Firestore Database → 데이터베이스 만들기** (위치는 `asia-northeast3 (서울)` 권장) → **규칙** 탭에 `firestore.rules` 내용을 붙여넣고 게시
3. **Storage → 시작하기** → **규칙** 탭에 `storage.rules` 내용을 붙여넣고 게시

Firestore 를 만들지 않으면 구글 로그인 후 다시 로그인 화면으로 돌아옵니다.

## 3. GitHub 에 올리기

저장소는 **Private(비공개)** 로 만드는 것을 권합니다.

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "유이준 디지털 앨범"
```

GitHub 에서 빈 저장소를 만든 뒤, 안내되는 `git remote add origin …` 과 `git push -u origin main` 을 실행합니다.

## 4. Vercel 로 배포

1. [vercel.com](https://vercel.com) → **Add New → Project** → 방금 올린 GitHub 저장소를 Import
2. 설정은 건드리지 않고 **Deploy** (`vercel.json` 이 빌드 없이 `public/` 을 올리도록 지정해 둡니다)
3. 배포가 끝나면 `https://<프로젝트 이름>.vercel.app` 주소가 생깁니다.
4. **Firebase 콘솔 → Authentication → 설정 → 승인된 도메인**에 그 주소(`<프로젝트 이름>.vercel.app`)를 추가합니다. 추가하지 않으면 구글 로그인이 막힙니다.
5. **엄마나 아빠가 가장 먼저 로그인**합니다. 처음 로그인한 사람이 관리자가 되고 ‘탄생’ 기록이 자동으로 만들어집니다.

이후에는 GitHub 에 push 할 때마다 Vercel 이 자동으로 다시 배포합니다.

## 5. ✨ 자동 채우기 설정 (선택)

기록 폼의 제목 · 메모 입력란 오른쪽 ✨ 버튼은 올린 사진을 보고 초안을 써 줍니다. Google Gemini API 를 쓰며, 키를 등록해야 동작합니다.

1. [Google AI Studio](https://aistudio.google.com/apikey) 에서 API 키를 만듭니다.
2. Vercel → 프로젝트 → **Settings → Environment Variables** 에서 이름 `GEMINI_API_KEY`, 값에 그 키를 넣고 저장합니다.
3. **Deployments** 에서 최신 배포를 **Redeploy** 합니다. (환경 변수는 다시 배포해야 적용됩니다.)

- 키는 서버 함수 `api/autofill.js` 안에서만 쓰이고 화면 코드나 GitHub 에는 들어가지 않습니다. **키를 코드에 직접 적지 마세요.**
- 기록 작성 권한이 있는 승인된 가족만 쓸 수 있고, 누를 때마다 사진(최대 4장, 영상은 장면 3컷)이 Gemini 로 전송됩니다.
- 모델을 바꾸려면 환경 변수 `GEMINI_MODEL` 에 모델 이름을 넣습니다.
- 내 PC 에서 `python -m http.server` 로 실행할 때는 서버 함수가 없어서 동작하지 않습니다.

## 6. 가족 초대

1. 가족에게 Vercel 주소를 보냅니다.
2. 가족이 구글 계정으로 로그인하면 “승인 대기” 상태가 됩니다.
3. 관리자가 **가족** 메뉴에서 관계(외할머니, 삼촌 등)를 등록하고 승인하면 입장합니다.
4. 배우자가 가입하면 **가족 → 수정**에서 권한을 “관리자”로 올려 줄 수 있습니다.

휴대폰에서는 브라우저 메뉴의 “홈 화면에 추가 / 앱 설치”로 앱처럼 설치할 수 있습니다(앱 안의 **내 정보** 화면에 안내가 있습니다).

## 알아 둘 점

- 앱 파일을 수정해 다시 배포할 때는 `public/sw.js` 의 `VERSION` 값을 올려 주세요. 설치된 앱이 새 파일을 확실히 받습니다.
- Vercel 이 커밋마다 만드는 **미리보기 주소**는 승인된 도메인이 아니라서 구글 로그인이 되지 않습니다. 운영 주소에서 확인하세요.
- **공개 범위**(가족 전체 / 부모·조부모 / 부모만)는 화면에서 걸러 보여 주는 방식입니다. 보안 규칙으로 막는 것은 “승인된 가족인지”까지입니다.
- 사진 · 영상 한 개의 최대 크기는 300MB 입니다(`storage.rules`).
- 다른 Firebase 프로젝트로 옮기려면 `public/firebase.js` 의 `firebaseConfig` 만 바꾸면 됩니다.
