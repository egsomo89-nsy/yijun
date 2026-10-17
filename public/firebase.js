/* ============================================================================
 * 유이준 디지털 앨범 — Firebase 연동 모듈 (Web SDK v10 Modular, CDN 방식)
 * ----------------------------------------------------------------------------
 *  - Authentication : 구글 계정 로그인
 *  - Firestore      : 성장 기록(records) · 가족 프로필(users) 저장 및 실시간 동기화
 *  - Storage        : 사진 · 영상 파일 업로드 후 다운로드 URL 발급
 *
 * 이 파일은 ES 모듈로 로드되며, UI(app.jsx)에서 쓸 함수들을
 * window.AlbumFirebase 로 내보냅니다.
 * ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  onAuthStateChanged, signOut as fbSignOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, addDoc, setDoc, getDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1) Firebase 프로젝트 설정
//    다른 프로젝트로 옮기려면 Firebase 콘솔 > 프로젝트 설정 > 내 앱 > SDK 설정에서
//    복사한 값으로 아래 객체만 교체하면 됩니다. (예: apiKey: "YOUR_API_KEY")
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBA5zIGmV9t2D4lfy1wdBQkOt1jrHxv4e4",
  authDomain: "yijun-3757c.firebaseapp.com",
  projectId: "yijun-3757c",
  storageBucket: "yijun-3757c.firebasestorage.app",
  messagingSenderId: "1007948202508",
  appId: "1:1007948202508:web:59f90c6ba93390c0f06429",
  measurementId: "G-K4XC4W3VHT",
};

// ─────────────────────────────────────────────────────────────────────────────
// 2) 초기화
// ─────────────────────────────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Firestore: 오프라인에서도 마지막으로 본 기록을 볼 수 있도록 로컬 캐시를 켭니다.
// (지원하지 않는 브라우저에서는 기본 getFirestore 로 대체)
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (e) {
  db = getFirestore(app);
}
const storage = getStorage(app);

const recordsCol = collection(db, "records");
const usersCol = collection(db, "users");

// ─────────────────────────────────────────────────────────────────────────────
// 3) 인증 (구글 로그인)
// ─────────────────────────────────────────────────────────────────────────────
async function signInGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    // 팝업이 막힌 환경(일부 인앱 브라우저 등)에서는 리다이렉트 방식으로 재시도
    if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, provider);
    } else {
      throw e;
    }
  }
}

const signOut = () => fbSignOut(auth);
const watchAuth = (cb) => onAuthStateChanged(auth, cb);
/** 서버 함수(/api/autofill)에 본인 확인용으로 보내는 로그인 토큰 */
const getIdToken = () => (auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(""));

/**
 * 로그인 직후 호출: users/{uid} 프로필 문서가 없으면 만듭니다.
 *  - 앨범에 아직 관리자가 없으면(meta/app 문서 없음) → 첫 로그인 사용자가 '관리자'
 *  - 그 외에는 '승인 대기(pending)' 상태로 가입 → 관리자가 관계 등록 후 승인
 */
async function ensureUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  if ((await getDoc(userRef)).exists()) return { isNewAdmin: false };

  const base = {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "이름 없음",
    photoURL: user.photoURL || "",
    requestNote: "",
    createdAt: Date.now(),
  };

  const metaRef = doc(db, "meta", "app");
  if (!(await getDoc(metaRef)).exists()) {
    try {
      const batch = writeBatch(db);
      batch.set(metaRef, { adminUid: user.uid, createdAt: Date.now() });
      batch.set(userRef, { ...base, status: "approved", role: "admin", relation: "", group: "parents", permission: "edit" });
      await batch.commit();
      return { isNewAdmin: true };
    } catch (e) {
      // 동시에 다른 사람이 먼저 관리자가 된 경우 → 일반 가입으로 진행
    }
  }

  await setDoc(userRef, { ...base, status: "pending", role: "family", relation: "", group: "relatives", permission: "view" });
  return { isNewAdmin: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) 가족 프로필 (users 컬렉션)
// ─────────────────────────────────────────────────────────────────────────────
/** 내 프로필 실시간 구독 — 관리자가 승인하면 즉시 화면이 바뀝니다. */
const watchUser = (uid, cb, onError) =>
  onSnapshot(doc(db, "users", uid), (snap) => cb(snap.exists() ? snap.data() : null), onError);

/** 전체 가족 목록 실시간 구독 (승인된 가족만 읽을 수 있음) */
const watchUsers = (cb, onError) =>
  onSnapshot(usersCol, (snap) => cb(snap.docs.map((d) => d.data())), onError);

/** 이준이 프로필 사진(meta/baby) 실시간 구독 · 변경(관리자만) */
const watchBaby = (cb, onError) =>
  onSnapshot(doc(db, "meta", "baby"), (snap) => cb(snap.exists() ? snap.data() : null), onError);
const setBabyPhoto = (data) => setDoc(doc(db, "meta", "baby"), data, { merge: true });

const updateUser = (uid, data) => updateDoc(doc(db, "users", uid), data);
const removeUser = (uid) => deleteDoc(doc(db, "users", uid));

// ─────────────────────────────────────────────────────────────────────────────
// 5) 성장 기록 (records 컬렉션)
//    문서 구조: { date:'YYYY-MM-DD', title, memo, category, milestone, tags[],
//                 media:[{url,type,path,view?,viewPath?}], visibility, authorUid, authorName, createdAt }
// ─────────────────────────────────────────────────────────────────────────────
/** 조회: onSnapshot 으로 실시간 동기화 */
const watchRecords = (cb, onError) =>
  onSnapshot(
    query(recordsCol, orderBy("date", "desc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );

/** 추가: addDoc */
const addRecord = (data) => addDoc(recordsCol, data);

const updateRecord = (id, data) => updateDoc(doc(db, "records", id), data);

/** 삭제: 문서를 지운 뒤 Storage 에 올린 파일도 함께 정리 */
async function deleteRecord(record) {
  await deleteDoc(doc(db, "records", record.id));
  await deleteMedia((record.media || []).flatMap((m) => [m.path, m.viewPath]));
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) 사진 · 영상 업로드 (Storage)
// ─────────────────────────────────────────────────────────────────────────────
// 파일 이름이 매번 달라 내용이 바뀌지 않으므로, 브라우저가 오래 캐시해 두도록 합니다.
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const VIEW_MAX = 2048;

/** 화면 표시용 사본: 긴 변 2048px JPEG 로 줄임 (줄일 수 없거나 더 작아지지 않으면 null) */
async function makeViewCopy(file) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, VIEW_MAX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob && blob.size < file.size * 0.8 ? blob : null;
  } catch (e) {
    return null; // 브라우저가 읽지 못하는 형식이면 원본만 올림
  }
}

/** 파일 업로드: 원본 + (사진이면) 화면 표시용 사본 → 다운로드 URL */
async function uploadMedia(file, uid) {
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-60);
  const path = `records/${uid}/${Date.now()}_${safeName}`;
  const snapshot = await uploadBytes(ref(storage, path), file, { contentType: file.type, cacheControl: CACHE_CONTROL });
  const url = await getDownloadURL(snapshot.ref);
  const media = { url, path, type: file.type.startsWith("video/") ? "video" : "image" };

  const view = await makeViewCopy(file);
  if (view) {
    try {
      const viewPath = `${path}.view.jpg`;
      const viewSnap = await uploadBytes(ref(storage, viewPath), view, { contentType: "image/jpeg", cacheControl: CACHE_CONTROL });
      media.view = await getDownloadURL(viewSnap.ref);
      media.viewPath = viewPath;
    } catch (e) {
      // 사본 업로드에 실패해도 원본으로 보여 줌
    }
  }
  return media;
}

/** Storage 파일 삭제 (실패해도 앱 흐름은 막지 않음) */
async function deleteMedia(paths) {
  await Promise.all(
    (paths || []).filter(Boolean).map((p) => deleteObject(ref(storage, p)).catch(() => {}))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) UI(app.jsx)에서 사용할 수 있도록 전역으로 내보내기
// ─────────────────────────────────────────────────────────────────────────────
window.AlbumFirebase = {
  mode: "firebase",
  signInGoogle, signOut, watchAuth, getIdToken, ensureUserProfile,
  watchUser, watchUsers, updateUser, removeUser, watchBaby, setBabyPhoto,
  watchRecords, addRecord, updateRecord, deleteRecord,
  uploadMedia, deleteMedia,
};
