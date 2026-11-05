import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { onAuthStateChanged } from "firebase/auth";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

jest.mock("./firebase", () => ({ auth: {} }));
jest.mock("firebase/auth", () => ({ onAuthStateChanged: jest.fn() }));
jest.mock("react-router-dom", () => ({ Navigate: jest.fn(() => <p>로그인 이동</p>) }), { virtual: true });
let container, root, observer, failure, unsubscribe;
const originalAct = global.IS_REACT_ACT_ENVIRONMENT;
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  unsubscribe = jest.fn();
  onAuthStateChanged.mockImplementation((auth, next, error) => { observer = next; failure = error; return unsubscribe; });
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove();
  jest.clearAllTimers(); jest.useRealTimers(); global.IS_REACT_ACT_ENVIRONMENT = originalAct;
});
const render = () => act(async () => root.render(<ProtectedRoute><h1>관리자 화면</h1></ProtectedRoute>));

test("저장된 로그인 복원 전에는 로그인 화면으로 보내지 않고 복원 후 관리자 화면을 표시한다", async () => {
  await render();
  expect(container.querySelector('[role="status"]')).not.toBeNull();
  expect(Navigate).not.toHaveBeenCalled();
  await act(async () => observer({ uid: "existing-admin" }));
  expect(container.querySelector("h1").textContent).toBe("관리자 화면");
  expect(Navigate).not.toHaveBeenCalled();
});

test("로그인 복원이 끝나 실제로 로그아웃 상태일 때만 로그인 화면으로 보낸다", async () => {
  await render();
  await act(async () => observer(null));
  expect(Navigate.mock.calls.at(-1)[0]).toMatchObject({ to: "/admin-login", replace: true });
});

test("로그인 복원이 지연돼도 흰 화면 대신 재시도를 표시하고 뒤늦게 복원되면 정상 진입한다", async () => {
  await render();
  await act(async () => jest.advanceTimersByTime(15000));
  expect(container.querySelector('[role="alert"]').textContent).toContain("로그인 정보를 불러오지 못했습니다");
  expect(Navigate).not.toHaveBeenCalled();
  await act(async () => observer({ uid: "existing-admin" }));
  expect(container.querySelector("h1").textContent).toBe("관리자 화면");
});

test("인증 복원 오류는 화면에 안내하고 인증 관찰을 해제한다", async () => {
  await render();
  await act(async () => failure(new Error("storage unavailable")));
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  expect(Navigate).not.toHaveBeenCalled();
  await act(async () => root.render(null));
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});

test("인증 구독 시작 자체가 실패해도 화면이 비지 않는다", async () => {
  onAuthStateChanged.mockImplementation(() => { throw new Error("storage denied"); });
  await render();
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
});
