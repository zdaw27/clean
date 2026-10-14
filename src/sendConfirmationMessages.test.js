import { sendConfirmationMessages } from "./sendConfirmationMessages";
import { CONFIRM_TEMPLATE, PICKUP_GUIDE_TEMPLATE, ADMIN_PHONE } from "./config";

const reservation = { phone: "010 0000 0001", name: "테스트", visit: "10월 20일 오후 2시", area: "경기 성남시" };
const reply = (code = "1000", ok = true) => ({
  ok, status: ok ? 200 : 500,
  json: async () => ({ code, messageKey: "mock-key", description: "mock response" }),
});
const originalFetch = global.fetch;
beforeEach(() => { global.fetch = jest.fn().mockResolvedValue(reply()); });
afterEach(() => { global.fetch = originalFetch; });
const bodies = () => global.fetch.mock.calls.map(([, options]) => JSON.parse(options.body));

test("손님과 사장님에게 정정본의 변수 3개와 변수 없는 안내문을 각각 보낸다", async () => {
  const results = await sendConfirmationMessages(reservation);
  expect(CONFIRM_TEMPLATE).toBe("ppur_2026100316222647407687651");
  expect(PICKUP_GUIDE_TEMPLATE).toBe("ppur_2026100620153047407389628");
  expect(global.fetch).toHaveBeenCalledTimes(4);
  for (const to of ["01000000001", ADMIN_PHONE]) {
    const messages = bodies().filter((body) => body.to === to);
    expect(messages.map((body) => body.templateCode)).toEqual([CONFIRM_TEMPLATE, PICKUP_GUIDE_TEMPLATE]);
    expect(messages[0].changeWord).toEqual({ var1: reservation.visit, var2: reservation.phone, var3: reservation.area });
    expect(messages[1]).not.toHaveProperty("changeWord");
  }
  expect(results.every(({ confirmation, guide }) => confirmation.ok && guide.ok)).toBe(true);
});

test("손님 확정이 거절되면 손님 안내문만 건너뛰고 사장님 발송은 계속한다", async () => {
  global.fetch.mockImplementation(async (_, options) => {
    const body = JSON.parse(options.body);
    return reply(body.to === "01000000001" ? "4000" : "1000");
  });
  const [customer, admin] = await sendConfirmationMessages(reservation);
  expect(global.fetch).toHaveBeenCalledTimes(3);
  expect(customer.confirmation.ok).toBe(false);
  expect(customer.guide.skipped).toBe(true);
  expect(admin.guide.ok).toBe(true);
});

test("HTTP 오류는 본문의 code가 1000이어도 성공으로 취급하지 않는다", async () => {
  global.fetch.mockResolvedValue(reply("1000", false));
  const results = await sendConfirmationMessages(reservation);
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(results.every(({ confirmation, guide }) => !confirmation.ok && guide.skipped)).toBe(true);
});

test("안내문 네트워크 오류는 부분 실패로 남기고 확정 알림을 재발송하지 않는다", async () => {
  global.fetch.mockImplementation(async (_, options) => {
    if (JSON.parse(options.body).templateCode === PICKUP_GUIDE_TEMPLATE) throw new Error("connection lost");
    return reply();
  });
  const results = await sendConfirmationMessages(reservation);
  expect(global.fetch).toHaveBeenCalledTimes(4);
  expect(results.every(({ confirmation, guide }) => confirmation.ok && !guide.ok && !guide.skipped)).toBe(true);
  expect(results[0].guide.reason).toContain("connection lost");
});
