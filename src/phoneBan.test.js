import { collection, doc, getDoc, getDocs, runTransaction, deleteDoc, serverTimestamp } from "firebase/firestore";
import { banPhone, unbanPhone, normalizePhone, formatPhone, loadBannedPhones, checkPhoneBan } from "./phoneBan";

jest.mock("./firebase", () => ({ db: {}, auth: { currentUser: { uid: "test-admin" } } }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn((db, name) => name), doc: jest.fn((db, name, id) => ({ name, id })),
  getDoc: jest.fn(), getDocs: jest.fn(), deleteDoc: jest.fn(), runTransaction: jest.fn(), serverTimestamp: jest.fn(() => "server-time"),
}));

beforeEach(() => {
  jest.clearAllMocks();
  collection.mockImplementation((db, name) => name);
  doc.mockImplementation((db, name, id) => ({ name, id }));
  serverTimestamp.mockReturnValue("server-time");
});

test.each(["010-1234-5678", "010 1234 5678", "010.1234.5678", "+82 10-1234-5678", "0082 10 1234 5678"])(
  "표기가 다른 번호 %s를 같은 차단 키로 처리한다", (value) => {
    expect(normalizePhone(value)).toBe("01012345678");
    expect(formatPhone(value)).toBe("010-1234-5678");
  }
);

test("차단 번호와 서버 시각만 저장한다", async () => {
  const transaction = { get: jest.fn().mockResolvedValue({ exists: () => false }), set: jest.fn() };
  runTransaction.mockImplementation((db, callback) => callback(transaction));
  await expect(banPhone("010-1234-5678")).resolves.toBe("01012345678");
  expect(transaction.set).toHaveBeenCalledWith({ name: "bannedPhones", id: "01012345678" },
    { phone: "01012345678", createdAt: "server-time" });
});

test("중복 차단 요청은 기존 기록을 덮어쓰지 않는다", async () => {
  const transaction = { get: jest.fn().mockResolvedValue({ exists: () => true }), set: jest.fn() };
  runTransaction.mockImplementation((db, callback) => callback(transaction));
  await expect(banPhone("010 1234 5678")).rejects.toThrow("이미 차단된 번호");
  expect(transaction.set).not.toHaveBeenCalled();
});

test("잘못된 번호는 DB 요청 전에 거부한다", async () => {
  await expect(banPhone("12345")).rejects.toThrow("휴대폰 번호");
  expect(runTransaction).not.toHaveBeenCalled();
  expect(doc).not.toHaveBeenCalled();
});

test("차단 해제도 같은 정규화 키를 사용한다", async () => {
  await unbanPhone("+82 10-1234-5678");
  expect(deleteDoc).toHaveBeenCalledWith({ name: "bannedPhones", id: "01012345678" });
});

test("다시 불러온 차단 목록은 DB 기록으로 구성한다", async () => {
  getDocs.mockResolvedValue({ docs: [
    { id: "01099999999", data: () => ({ phone: "01099999999" }) },
    { id: "01012345678", data: () => ({ phone: "01012345678" }) },
  ] });
  expect((await loadBannedPhones()).map((entry) => entry.id)).toEqual(["01012345678", "01099999999"]);
});

test("예약 전에는 번호 한 건의 차단 여부만 조회한다", async () => {
  getDoc.mockResolvedValue({ exists: () => true });
  await expect(checkPhoneBan("010-1234-5678")).resolves.toBe(true);
  expect(getDoc).toHaveBeenCalledWith({ name: "bannedPhones", id: "01012345678" });
  expect(getDocs).not.toHaveBeenCalled();
});
