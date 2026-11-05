import React from "react";

export default class AppErrorBoundary extends React.Component {
  state = { failed: false, message: "" };

  static getDerivedStateFromError(error) {
    return { failed: true, message: String(error?.message || error || "알 수 없는 화면 오류").slice(0, 500) };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main role="alert" style={{ padding: 24, maxWidth: 640, margin: "40px auto", fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>화면을 열지 못했습니다.</h1>
        <p style={{ margin: "16px 0" }}>아래 버튼으로 다시 열어 주세요. 같은 문제가 반복되면 오류 내용을 전달해 주세요.</p>
        <button type="button" style={{ padding: "10px 18px", border: "1px solid #999", borderRadius: 6 }}
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.set("retry", Date.now().toString());
            window.location.replace(url.toString());
          }}>다시 열기</button>
        <details style={{ marginTop: 20 }}><summary>오류 내용 보기</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{this.state.message}</pre></details>
      </main>
    );
  }
}
