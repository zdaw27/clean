import { collection, deleteDoc, doc, getDoc, getDocs, runTransaction, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

export const BAN_COLLECTION = "bannedPhones";

export function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "").replace(/^(?:0082|82)(?=10)/, "0");
}

export function isMobilePhone(value) {
  return /^(010[0-9]{8}|01[16789][0-9]{7,8})$/.test(normalizePhone(value));
}

export function formatPhone(value) {
  return normalizePhone(value).replace(/^(01[016789])([0-9]{3,4})([0-9]{4})$/, "$1-$2-$3");
}

export async function checkPhoneBan(value) {
  const phone = normalizePhone(value);
  if (!isMobilePhone(phone)) throw new Error("휴대폰 번호를 정확히 입력해 주세요.");
  const marker = await getDoc(doc(db, BAN_COLLECTION, phone));
  return marker.exists();
}

export async function loadBannedPhones() {
  const snapshot = await getDocs(collection(db, BAN_COLLECTION));
  return snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export async function banPhone(value) {
  const phone = normalizePhone(value);
  if (!isMobilePhone(phone)) throw new Error("휴대폰 번호를 정확히 입력해 주세요.");
  if (!auth.currentUser) throw new Error("관리자 로그인이 필요합니다.");
  const ref = doc(db, BAN_COLLECTION, phone);
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists()) throw new Error("이미 차단된 번호입니다.");
    // 번호별 조회에 고객 정보나 관리자 식별자가 노출되지 않도록 최소 정보만 저장한다.
    transaction.set(ref, { phone, createdAt: serverTimestamp() });
  });
  return phone;
}

export async function unbanPhone(value) {
  const phone = normalizePhone(value);
  if (!isMobilePhone(phone)) throw new Error("휴대폰 번호를 정확히 입력해 주세요.");
  await deleteDoc(doc(db, BAN_COLLECTION, phone));
}
