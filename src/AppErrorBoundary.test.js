import React, { act } from "react";
import { createRoot } from "react-dom/client";
import AppErrorBoundary from "./AppErrorBoundary";
let container, root;
const originalAct = global.IS_REACT_ACT_ENVIRONMENT;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove(); jest.restoreAllMocks(); global.IS_REACT_ACT_ENVIRONMENT = originalAct;
});
test("정상 화면은 그대로 표시한다", async () => {
  await act(async () => root.render(<AppErrorBoundary><h1>예약 목록</h1></AppErrorBoundary>));
  expect(container.querySelector("h1").textContent).toBe("예약 목록");
});
test("화면 실행 오류가 나면 흰 화면 대신 다시 열기와 오류 내용을 표시한다", async () => {
  const BrokenPage = () => { throw new Error("render failed in browser"); };
  await act(async () => root.render(<AppErrorBoundary><BrokenPage /></AppErrorBoundary>));
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  expect(container.querySelector("button").textContent).toBe("다시 열기");
  expect(container.querySelector("pre").textContent).toBe("render failed in browser");
});
