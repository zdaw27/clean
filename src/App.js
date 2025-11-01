// src/App.js
import React from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import MainFormPage from "./MainFormPage";
import AdminPage from "./AdminPage";
import AdminLoginPage from "./AdminLoginPage";
import ProtectedRoute from "./ProtectedRoute";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* "/" 대신 index 사용! */}
        <Route index element={<MainFormPage />} />
        {/* 로그인 페이지 */}
        <Route path="/admin-login" element={<AdminLoginPage />} />

        {/* 🔒 관리자 보호: 로그인 안 되어 있으면 리디렉션 */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
