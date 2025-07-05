import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainFormPage from "./MainFormPage";  // 신청 폼
import AdminPage from "./AdminPage";       // 관리자 페이지

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainFormPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}
