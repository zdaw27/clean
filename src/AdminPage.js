// src/AdminPage.js
import React, { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { signOut } from "firebase/auth";

export default function AdminPage() {
  const [reservations, setReservations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    const q = query(collection(db, "reservations"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setReservations(data);
    setFiltered(data);
  };

  const handleSearch = (e) => {
    const keyword = e.target.value.toLowerCase();
    setSearch(keyword);
    applyFilters(keyword, selectedDate);
  };

  const handleDateChange = (e) => {
    const dateStr = e.target.value;
    setSelectedDate(dateStr);
    applyFilters(search, dateStr);
  };

  const applyFilters = (keyword, dateStr) => {
    const filteredData = reservations.filter((res) => {
      const matchesSearch =
        res.name?.toLowerCase().includes(keyword.toLowerCase()) ||
        res.phone?.includes(keyword) ||
        res.address?.toLowerCase().includes(keyword.toLowerCase());

      const matchesDate = dateStr
        ? res.createdAt?.toDate().toISOString().slice(0, 10) === dateStr
        : true;

      return matchesSearch && matchesDate;
    });

    setFiltered(filteredData);
  };

  const handleDelete = async (id) => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "reservations", id));
      fetchReservations();
    }
  };

  const handleDownloadCSV = () => {
    const headers = ["이름", "전화", "주소", "출입방법", "희망일", "시간대", "물품", "신청시각"];
    const rows = filtered.map(res => [
      res.name,
      res.phone,
      `${res.address} ${res.detailAddress}`,
      res.entrance,
      res.date,
      res.timeSlot,
      res.items,
      res.createdAt?.toDate().toLocaleString() || ""
    ]);
    const csvContent =
      "\uFEFF" + // UTF-8 with BOM
      [headers.join(","), ...rows.map(row => row.join(","))].join("\n");

    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reservations.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = () => {
    signOut(auth).then(() => window.location.href = "/admin-login");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
        <h1 className="text-2xl font-bold">🛠 수거 신청 목록 ({filtered.length}건)</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="이름/전화/주소 검색"
            value={search}
            onChange={handleSearch}
            className="border px-2 py-1 rounded"
          />
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="border px-2 py-1 rounded"
          />
          <button onClick={handleDownloadCSV} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
            CSV 다운로드
          </button>
          <button onClick={handleLogout} className="bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-800">
            로그아웃
          </button>
        </div>
      </div>

      <ul className="space-y-4">
        {filtered.map((res) => (
          <li key={res.id} className="p-4 border rounded bg-white shadow relative">
            <button
              onClick={() => handleDelete(res.id)}
              className="absolute top-2 right-2 text-sm text-red-500 hover:underline"
            >
              삭제
            </button>
            <p><strong>이름:</strong> {res.name}</p>
            <p><strong>전화:</strong> {res.phone}</p>
            <p><strong>주소:</strong> {res.address} {res.detailAddress}</p>
            <p><strong>출입방법:</strong> {res.entrance}</p>
            <p><strong>희망일:</strong> {res.date}</p>
            <p><strong>시간대:</strong> {res.timeSlot}</p>
            <p><strong>물품:</strong> {res.items}</p>
            <p className="text-xs text-gray-500">신청시각: {res.createdAt?.toDate().toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
