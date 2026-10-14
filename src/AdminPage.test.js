import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { getDocs, getCountFromServer } from "firebase/firestore";
import AdminPage from "./AdminPage";
import { ADMIN_PHONE, CONFIRM_TEMPLATE, PICKUP_GUIDE_TEMPLATE } from "./config";

// 실제 DB/인증은 연결하지 않는다. 화면과 발송 함수는 실제 코드를 사용한다.
jest.mock("./firebase", () => ({ db: {}, auth: {} }));
jest.mock("firebase/auth", () => ({ signOut: jest.fn() }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(), query: jest.fn(), where: jest.fn(), orderBy: jest.fn(),
  limit: jest.fn(), startAfter: jest.fn(), deleteDoc: jest.fn(), doc: jest.fn(),
  getDocs: jest.fn(), getCountFromServer: jest.fn(), Timestamp: { fromDate: jest.fn() },
}));

const originalFetch = global.fetch;
const originalActEnvironment = global.IS_REACT_ACT_ENVIRONMENT;
let container;
let root;
const sample = {
  name: "화면테스트", phone: "010 0000 0002", date: "2026-10-20", timeSlot: "오후 2시",
  address: "경기 성남시 분당구 예시로 10", detailAddress: "가상 101동 202호",
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true, status: 200, json: async () => ({ code: "1000", messageKey: "mock-key" }),
  });
  jest.spyOn(window, "confirm").mockReturnValue(true);
  jest.spyOn(window, "alert").mockImplementation(() => {});
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  global.fetch = originalFetch;
  global.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

async function loadReservations(selected = sample) {
  const data = [
    { ...sample, name: "다른예약", phone: "01000000001", address: "서울 강남구 다른길 20" },
    selected,
  ];
  getCountFromServer.mockResolvedValue({ data: () => ({ count: data.length }) });
  getDocs.mockResolvedValue({ docs: data.map((value, index) => ({ id: `fake-${index}`, data: () => value })) });
  await act(async () => root.render(<AdminPage />));
  return container.querySelectorAll("li")[1];
}

async function click(row, text) {
  const button = [...row.querySelectorAll("button")].find((element) => element.textContent === text);
  expect(button).toBeDefined();
  await act(async () => button.click());
}

test.each([
  ["경기 성남시 분당구 예시로 10", "경기 성남시"],
  ["서울 구로구 예시로 10", "서울 구로구"],
  ["대구 중구 예시로 10", "대구 중구"],
])("예약 확정 버튼이 선택한 예약의 연락처·희망일·지역(%s)을 전송한다", async (address, area) => {
  const row = await loadReservations({ ...sample, address });
  await click(row, "확정 알림 보내기");
  const requests = global.fetch.mock.calls.map(([, options]) => JSON.parse(options.body));
  expect(requests).toHaveLength(4);
  for (const to of ["01000000002", ADMIN_PHONE]) {
    const messages = requests.filter((request) => request.to === to);
    expect(messages.map((message) => message.templateCode)).toEqual([CONFIRM_TEMPLATE, PICKUP_GUIDE_TEMPLATE]);
    expect(messages[0].changeWord).toEqual({
      var1: "2026-10-20 오후 2시", var2: sample.phone, var3: area,
    });
    expect(messages[1]).not.toHaveProperty("changeWord");
  }
  expect(requests.some(({ to }) => to === "01000000001")).toBe(false);
  expect(JSON.stringify(requests)).not.toContain(sample.detailAddress);
  expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("4통 모두 발송 접수 성공"));
});

test("관리자가 방문일시를 수정하면 희망일 대신 수정한 값을 보낸다", async () => {
  const row = await loadReservations();
  const input = row.querySelector('input[type="text"]');
  await act(async () => Simulate.change(input, { target: { value: "  10월 22일 오전 11시  " } }));
  await click(row, "확정 알림 보내기");
  const confirmations = global.fetch.mock.calls.map(([, options]) => JSON.parse(options.body))
    .filter(({ templateCode }) => templateCode === CONFIRM_TEMPLATE);
  expect(confirmations).toHaveLength(2);
  expect(confirmations.every(({ changeWord }) => changeWord.var1 === "10월 22일 오전 11시")).toBe(true);
});

test("연락처가 잘못된 예약은 버튼을 눌러도 발송 요청을 만들지 않는다", async () => {
  const row = await loadReservations({ ...sample, phone: "010-****-0002" });
  await click(row, "확정 알림 보내기");
  expect(global.fetch).not.toHaveBeenCalled();
  expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("전화번호가 올바르지 않아"));
});

test("발송 확인창에서 취소하면 어떤 메시지도 보내지 않는다", async () => {
  const row = await loadReservations();
  window.confirm.mockReturnValue(false);
  await click(row, "확정 알림 보내기");
  expect(global.fetch).not.toHaveBeenCalled();
});
