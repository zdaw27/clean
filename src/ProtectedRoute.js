import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState({ loading: true, user: null, failed: false });
  useEffect(() => {
    let active = true;
    let unsubscribe;
    const timeout = setTimeout(() => {
      if (active) setSession({ loading: false, user: null, failed: true });
    }, 15000);
    const finish = (next) => {
      clearTimeout(timeout);
      if (active) setSession(next);
    };
    try {
      unsubscribe = onAuthStateChanged(auth,
        (user) => finish({ loading: false, user, failed: false }),
        () => finish({ loading: false, user: null, failed: true }));
    } catch (_) {
      finish({ loading: false, user: null, failed: true });
    }
    return () => { active = false; clearTimeout(timeout); unsubscribe?.(); };
  }, []);

  if (session.loading) return <p role="status" className="p-6 text-center">로그인 상태를 확인하는 중입니다.</p>;
  if (session.failed) return (
    <div role="alert" className="p-6 text-center space-y-3">
      <p>로그인 정보를 불러오지 못했습니다. 연결 상태를 확인한 후 다시 시도해 주세요.</p>
      <button type="button" className="rounded border px-4 py-2" onClick={() => window.location.reload()}>다시 시도</button>
      <p><a className="underline" href="#/admin-login">로그인 화면으로 이동</a></p>
    </div>
  );
  if (!session.user) {
    return <Navigate to="/admin-login" replace />;
  }

  return children;
}
