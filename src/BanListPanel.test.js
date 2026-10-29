import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import BanListPanel from "./BanListPanel";
import { banPhone, loadBannedPhones, unbanPhone } from "./phoneBan";

jest.mock("./phoneBan", () => ({
  banPhone: jest.fn(), unbanPhone: jest.fn(), loadBannedPhones: jest.fn(),
  formatPhone: (value) => value.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3"),
}));

let container, root;
const originalActEnvironment = global.IS_REACT_ACT_ENVIRONMENT;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  loadBannedPhones.mockResolvedValue([]);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  jest.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  jest.restoreAllMocks();
  global.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
});

test("번호를 등록하고 다시 화면을 열면 저장된 차단 목록이 표시된다", async () => {
  await act(async () => root.render(<BanListPanel />));
  banPhone.mockResolvedValue("01012345678");
  await act(async () => Simulate.change(container.querySelector("input"), { target: { value: "010-1234-5678" } }));
  await act(async () => Simulate.submit(container.querySelector("form")));
  expect(banPhone).toHaveBeenCalledWith("010-1234-5678");
  expect(container.querySelector("li").textContent).toContain("010-1234-5678");
  loadBannedPhones.mockResolvedValue([{ id: "01012345678" }]);
  await act(async () => root.render(null));
  await act(async () => root.render(<BanListPanel />));
  expect(container.querySelector("li").textContent).toContain("010-1234-5678");
});

test("차단 해제를 취소하면 유지하고 승인하면 목록에서 제거한다", async () => {
  loadBannedPhones.mockResolvedValue([{ id: "01012345678" }]);
  await act(async () => root.render(<BanListPanel />));
  window.confirm.mockReturnValue(false);
  await act(async () => container.querySelector("li button").click());
  expect(unbanPhone).not.toHaveBeenCalled();
  window.confirm.mockReturnValue(true);
  await act(async () => container.querySelector("li button").click());
  expect(unbanPhone).toHaveBeenCalledWith("01012345678");
  expect(container.querySelector("li")).toBeNull();
});

test("저장이 실패하면 차단 성공으로 표시하지 않는다", async () => {
  await act(async () => root.render(<BanListPanel />));
  banPhone.mockRejectedValue({ code: "permission-denied" });
  await act(async () => Simulate.change(container.querySelector("input"), { target: { value: "010-1234-5678" } }));
  await act(async () => Simulate.submit(container.querySelector("form")));
  expect(container.querySelector('[role="alert"]').textContent).toContain("접근 권한");
  expect(container.querySelector("li")).toBeNull();
});
