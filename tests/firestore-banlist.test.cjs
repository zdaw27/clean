const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { initializeApp, deleteApp } = require("firebase/app");
const { getFirestore, connectFirestoreEmulator, doc, collection, getDoc, getDocs, getCountFromServer, setDoc, updateDoc, addDoc, deleteDoc, serverTimestamp, terminate } = require("firebase/firestore");

const project = "demo-clean-banlist";
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!host || !/^127\.0\.0\.1:\d+$/.test(host)) throw new Error("로컬 Firestore 에뮬레이터에서만 실행할 수 있습니다.");
const apps = [];
function client(uid) {
  const app = initializeApp({ projectId: project, apiKey: "emulator-only" }, uid || "anonymous");
  const db = getFirestore(app);
  const [hostname, port] = host.split(":");
  connectFirestoreEmulator(db, hostname, Number(port), uid ? { mockUserToken: { sub: uid } } : undefined);
  apps.push({ app, db });
  return db;
}
const anonymous = client();
const admin = client("ban-test-admin");
const member = client("ban-test-member");
const phone = "01012345678";
async function denied(action) { await assert.rejects(action, (error) => error.code === "permission-denied"); }
async function seed(collectionName, id, fields) {
  const response = await fetch(`http://${host}/v1/projects/${project}/databases/(default)/documents/${collectionName}/${id}`, {
    method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, { stringValue: value }])) }),
  });
  assert.equal(response.ok, true);
}
async function loadRules(filename) {
  const content = await fs.readFile(filename, "utf8");
  const response = await fetch(`http://${host}/emulator/v1/projects/${project}:securityRules`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rules: { files: [{ name: "firestore.rules", content }] } }),
  });
  assert.equal(response.ok, true, await response.text());
}
async function reset() {
  const response = await fetch(`http://${host}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: "DELETE" });
  assert.equal(response.ok, true);
  await seed("users", "ban-test-admin", { role: "admin" });
  await seed("users", "ban-test-member", { role: "member" });
  await seed("reservations", "existing", { phone, items: "기존 예약 유지" });
}

async function oldDataPermissions() {
  const operations = {
    adminReadExisting: () => getDoc(doc(admin, "reservations", "existing")),
    adminListExisting: () => getDocs(collection(admin, "reservations")),
    adminCountExisting: () => getCountFromServer(collection(admin, "reservations")),
    adminUpdateExisting: () => updateDoc(doc(admin, "reservations", "existing"), { items: "수정 검증" }),
    adminDeleteExisting: () => deleteDoc(doc(admin, "reservations", "existing")),
    memberReadExisting: () => getDoc(doc(member, "reservations", "existing")),
    memberUpdateExisting: () => updateDoc(doc(member, "reservations", "existing"), { items: "거부 검증" }),
    memberDeleteExisting: () => deleteDoc(doc(member, "reservations", "existing")),
    anonymousReadExisting: () => getDoc(doc(anonymous, "reservations", "existing")),
    ownUserRead: () => getDoc(doc(member, "users", "ban-test-member")),
    ownUserUpdate: () => updateDoc(doc(member, "users", "ban-test-member"), { name: "프로필 검증" }),
    otherUserRead: () => getDoc(doc(member, "users", "ban-test-admin")),
    otherUserUpdate: () => updateDoc(doc(member, "users", "ban-test-admin"), { name: "거부 검증" }),
    unrelatedCreate: () => setDoc(doc(member, "unrelated", "new"), { value: "유지 검증" }),
    unrelatedRead: () => getDoc(doc(member, "unrelated", "new")),
    nestedReservationCreate: () => setDoc(doc(member, "reservations", "existing", "notes", "new"), { memo: "하위 경로 유지" }),
    legacyReservationWithoutPhone: () => addDoc(collection(anonymous, "reservations"), { name: "기존 형식 유지" }),
  };
  const results = {};
  for (const [name, operation] of Object.entries(operations)) {
    await reset();
    await seed("bannedPhones", phone, { phone });
    try { await operation(); results[name] = "allowed"; }
    catch (error) { results[name] = error.code; }
  }
  return results;
}

test("기존 운영 규칙과 비교해 기존 데이터 권한이 동일하고 신규 차단만 적용된다", async (t) => {
  await loadRules("firestore.rules.before-banlist");
  const before = await oldDataPermissions();
  await loadRules("firestore.rules");
  const after = await oldDataPermissions();
  await t.test("기존 예약 조회·목록·집계·수정·삭제, users 및 다른 경로 권한 17종이 원본과 동일하다", () => {
    assert.deepEqual(after, before);
    assert.equal(after.adminReadExisting, "allowed");
    assert.equal(after.adminUpdateExisting, "allowed");
    assert.equal(after.adminDeleteExisting, "allowed");
    assert.equal(after.memberReadExisting, "permission-denied");
  });
  await reset();
  const marker = doc(admin, "bannedPhones", phone);
  const data = { phone, createdAt: serverTimestamp() };
  await t.test("차단 목록 관리는 기존 관리자만 허용하고 인증된 일반 사용자의 우회 생성도 거부한다", async () => {
    await denied(() => getDocs(collection(anonymous, "bannedPhones")));
    await denied(() => getDocs(collection(member, "bannedPhones")));
    await denied(() => setDoc(doc(member, "bannedPhones", phone), data));
    await denied(() => setDoc(doc(anonymous, "bannedPhones", phone), data));
    await setDoc(marker, data);
    assert.equal((await getDocs(collection(admin, "bannedPhones"))).size, 1);
    assert.equal((await getDoc(doc(anonymous, "bannedPhones", phone))).exists(), true);
    assert.equal((await getDoc(doc(anonymous, "bannedPhones", "01099999999"))).exists(), false);
  });
  await t.test("공개 예약과 로그인한 사용자의 직접 저장 모두 차단 번호 표기를 바꿔도 거부한다", async () => {
    for (const db of [anonymous, member, admin]) {
      for (const value of [phone, "010-1234-5678", "010 1234 5678", "010.1234.5678", "+82 10-1234-5678", "0082 10 1234 5678"]) {
        await denied(() => addDoc(collection(db, "reservations"), { phone: value, phoneDigits: "01099999999" }));
      }
    }
    assert.equal((await getDocs(collection(admin, "reservations"))).size, 1);
    assert.equal((await getDoc(doc(admin, "reservations", "existing"))).data().items, "기존 예약 유지");
  });
  await t.test("미차단 번호 접수와 차단 해제 후 재접수가 가능하고 기존 예약은 남는다", async () => {
    await addDoc(collection(anonymous, "reservations"), { phone: "010-9999-9999" });
    await denied(() => deleteDoc(doc(member, "bannedPhones", phone)));
    await deleteDoc(marker);
    await addDoc(collection(anonymous, "reservations"), { phone: "010-1234-5678" });
    assert.equal((await getDocs(collection(admin, "reservations"))).size, 3);
  });
});

after(async () => {
  await Promise.all(apps.map(async ({ app, db }) => { await terminate(db); await deleteApp(app); }));
});
