// 카톡서버 API 주소 — 로컬(개발)에선 localhost, 배포(프로덕션)에선 실서버(DO)로 자동 전환.
// 프로덕션 = DigitalOcean 서버(싱가포르, 고정IP 168.144.101.2) + sslip.io HTTPS.
export const KAKAO_API =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8090"
    : "https://168.144.101.2.sslip.io";

// 승인된 뿌리오 알림톡 템플릿
export const CONFIRM_TEMPLATE = "ppur_2026070110590215156978809"; // 예약완(확정 후), [*1*]=방문일
export const ADMIN_PHONE = "01088289952"; // 사장님 수신번호
