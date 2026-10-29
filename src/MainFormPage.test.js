import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { addDoc } from "firebase/firestore";
import MainFormPage from "./MainFormPage";
import { checkPhoneBan } from "./phoneBan";

jest.mock("./firebase", () => ({ db: {}, auth: {} }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(), addDoc: jest.fn(), Timestamp: { now: () => "test-time" },
}));
jest.mock("./phoneBan", () => ({
  ...jest.requireActual("./phoneBan"), checkPhoneBan: jest.fn(),
}));

const originalFetch = global.fetch;
const originalActEnvironment = global.IS_REACT_ACT_ENVIRONMENT;
let container, root;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ code: "1000" }) });
  jest.clearAllMocks();
  checkPhoneBan.mockResolvedValue(false);
  jest.spyOn(window, "alert").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
  container = document.createElement("div"); document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove();
  global.fetch = originalFetch;
  global.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
  jest.restoreAllMocks();
});

async function ready() {
  await act(async () => root.render(<MainFormPage />));
  await act(async () => Simulate.change(container.querySelector('input[required]'), { target: { value: "테스트" } }));
  await act(async () => Simulate.change(container.querySelector('input[type="tel"]'), { target: { value: "010-1234-5678" } }));
  await act(async () => Simulate.change(container.querySelector('input[type="date"]'), { target: { value: "2026-11-20" } }));
  await act(async () => Simulate.change(container.querySelector('input[type="checkbox"]'), { target: { checked: true } }));
}

test("차단 번호는 기존 예약 DB 저장과 알림톡 발송을 실행하지 않는다", async () => {
  checkPhoneBan.mockResolvedValue(true);
  await ready();
  await act(async () => Simulate.submit(container.querySelector("form")));
  expect(addDoc).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
  expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("예약을 접수할 수 없습니다"));
  expect(container.querySelector('input[type="tel"]').value).toBe("010");
  expect(container.querySelector('button[type="submit"]').disabled).toBe(false);
});

test("차단 확인이 실패하면 예약을 접수한 것으로 처리하지 않는다", async () => {
  checkPhoneBan.mockRejectedValue(new Error("연결 실패"));
  await ready();
  await act(async () => Simulate.submit(container.querySelector("form")));
  expect(addDoc).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
});

test("허용된 예약만 저장한 뒤 기존 접수 알림을 발송한다", async () => {
  addDoc.mockResolvedValue({ id: "test-reservation" });
  await ready();
  await act(async () => Simulate.submit(container.querySelector("form")));
  expect(addDoc.mock.calls[0][1].phone).toBe("010-1234-5678");
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(window.alert).toHaveBeenCalledWith("신청이 완료되었습니다!");
});

test("저장 확인 중 여러 번 제출해도 예약을 중복 접수하지 않는다", async () => {
  let finish;
  addDoc.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  await ready();
  await act(async () => {
    Simulate.submit(container.querySelector("form"));
    Simulate.submit(container.querySelector("form"));
  });
  expect(addDoc).toHaveBeenCalledTimes(1);
  expect(container.querySelector('button[type="submit"]').disabled).toBe(true);
  await act(async () => finish({ id: "test-reservation" }));
});

test("차단 조회 직후 DB에서 접수가 거부되면 알림을 보내지 않고 입력값을 유지한다", async () => {
  addDoc.mockRejectedValue({ code: "permission-denied" });
  await ready();
  await act(async () => Simulate.submit(container.querySelector("form")));
  expect(global.fetch).not.toHaveBeenCalled();
  expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("예약을 접수할 수 없습니다"));
  expect(container.querySelector('input[required]').value).toBe("테스트");
  expect(container.querySelector('button[type="submit"]').disabled).toBe(false);
});

test("주소 검색과 상세 입력은 기존 필드 그대로 저장하고 접수 후 초기화한다", async () => {
  addDoc.mockResolvedValue({ id: "test-reservation" });
  const previousDaum = window.daum;
  window.daum = { Postcode: jest.fn(function ({ oncomplete }) { this.open = () => oncomplete({ address: "테스트시 테스트구 테스트로 1" }); }) };
  try {
    await ready();
    await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent === "주소 검색").click());
    for (const [selector, value] of [
      ['input[placeholder^="상세주소"]', "301호"],
      ['input[placeholder^="아파트/건물명"]', "테스트아파트"],
      ['textarea', "헌옷 30kg"],
    ]) await act(async () => Simulate.change(container.querySelector(selector), { target: { value } }));
    await act(async () => Simulate.submit(container.querySelector("form")));
    expect(addDoc.mock.calls[0][1]).toEqual({ name: "테스트", phone: "010-1234-5678", address: "테스트시 테스트구 테스트로 1", detailAddress: "301호", entrance: "테스트아파트", date: "2026-11-20", items: "헌옷 30kg", createdAt: "test-time" });
    expect(container.querySelector('input[required]').value).toBe("");
    expect(container.querySelector('input[placeholder="주소를 검색해주세요"]').value).toBe("");
    expect(container.querySelector('input[type="checkbox"]').checked).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  } finally { window.daum = previousDaum; }
});
