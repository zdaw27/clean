import { KAKAO_API, CONFIRM_TEMPLATE, PICKUP_GUIDE_TEMPLATE, ADMIN_PHONE } from "./config";

async function send(to, name, templateCode, changeWord) {
  try {
    const response = await fetch(`${KAKAO_API}/kakao/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: (to || "").replace(/\D/g, ""),
        name,
        templateCode,
        ...(changeWord ? { changeWord } : {}),
      }),
    });
    const data = await response.json();
    return {
      ok: response.ok && data.code === "1000",
      key: data.messageKey || "-",
      reason: data.description || data.error || `HTTP ${response.status}: ${JSON.stringify(data)}`,
    };
  } catch (error) {
    // 결과가 불확실한 요청을 자동 재시도하면 중복 발송될 수 있다.
    return { ok: false, key: "-", reason: `응답 확인 실패: ${error.message}` };
  }
}

export async function sendConfirmationMessages({ phone, name, visit, area }) {
  const changeWord = { var1: visit, var2: phone, var3: area };
  return Promise.all([
    { label: "손님", to: phone, name },
    { label: "사장님", to: ADMIN_PHONE, name: "관리자" },
  ].map(async (recipient) => {
    const confirmation = await send(recipient.to, recipient.name, CONFIRM_TEMPLATE, changeWord);
    // 수신자별 확정 알림 접수 성공 후 안내문을 접수한다. 실제 도착 순서는 보장되지 않는다.
    const guide = confirmation.ok
      ? await send(recipient.to, recipient.name, PICKUP_GUIDE_TEMPLATE)
      : { ok: false, skipped: true, reason: "예약확정 발송을 확인하지 못해 보내지 않음" };
    return { ...recipient, confirmation, guide };
  }));
}
