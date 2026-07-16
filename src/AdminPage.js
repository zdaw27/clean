// src/AdminPage.js
import React, { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import {
  collection,
  getDocs,
  getCountFromServer,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { KAKAO_API, CONFIRM_TEMPLATE, ADMIN_PHONE } from "./config";

const PAGE_SIZE = 20;

export default function AdminPage() {
  const [reservations, setReservations] = useState([]); // 화면에 불러온 것만
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [totalCount, setTotalCount] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visitDate, setVisitDate] = useState({}); // 예약별 방문일시 입력값
  const [sendingId, setSendingId] = useState(null); // 확정발송 진행중인 예약 id

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    // 총 건수는 집계쿼리로 한 방 (컬렉션 전체를 읽지 않음 → read 비용 거의 0)
    try {
      const snap = await getCountFromServer(collection(db, "reservations"));
      setTotalCount(snap.data().count);
    } catch (e) {
      setTotalCount(null);
    }
    await loadFirstPage();
  };

  const loadFirstPage = async () => {
    setLoading(true);
    const q = query(
      collection(db, "reservations"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setReservations(data);
    setLastDoc(snap.docs[snap.docs.length - 1] || null);
    setHasMore(snap.docs.length === PAGE_SIZE);
    setLoading(false);
  };

  const loadMore = async () => {
    if (!lastDoc || loading) return;
    setLoading(true);
    const q = query(
      collection(db, "reservations"),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setReservations((prev) => [...prev, ...data]);
    setLastDoc(snap.docs[snap.docs.length - 1] || lastDoc);
    setHasMore(snap.docs.length === PAGE_SIZE);
    setLoading(false);
  };

  // 날짜(신청일) 선택 시 → 그날(한국시간) 접수된 예약만 Firestore에서 쿼리.
  // createdAt 범위 쿼리라 그날 매칭분만 읽음 (전체 스캔 X). KST 자정~다음날 자정.
  const searchByDate = async (dateStr) => {
    setLoading(true);
    try {
      const start = new Date(`${dateStr}T00:00:00+09:00`); // KST 그날 00:00
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000); // 다음날 00:00
      const snap = await getDocs(
        query(
          collection(db, "reservations"),
          where("createdAt", ">=", Timestamp.fromDate(start)),
          where("createdAt", "<", Timestamp.fromDate(end)),
          orderBy("createdAt", "desc")
        )
      );
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReservations(data);
      setHasMore(false);
      setLastDoc(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const d = e.target.value;
    setSelectedDate(d);
    if (d) searchByDate(d); // 날짜 선택 → 그 신청일(접수일) 예약만
    else loadFirstPage(); // 날짜 지우면 → 최근 목록으로 복귀
  };

  // 텍스트 검색은 현재 보이는 목록(최근 페이지 또는 날짜쿼리 결과) 안에서 동작.
  // 날짜는 위 handleDateChange에서 Firestore 쿼리로 처리하므로 여기선 안 함.
  const filtered = reservations.filter((res) => {
    const kw = search.toLowerCase();
    return (
      !kw ||
      res.name?.toLowerCase().includes(kw) ||
      res.phone?.includes(search) ||
      res.address?.toLowerCase().includes(kw)
    );
  });

  const handleDelete = async (id) => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "reservations", id));
      setReservations((prev) => prev.filter((r) => r.id !== id));
      setTotalCount((c) => (typeof c === "number" ? c - 1 : c));
    }
  };

  // CSV는 받을 때만 1회 전체 읽기 (가끔 쓰는 기능이라 평소 read 비용엔 영향 없음)
  const handleDownloadCSV = async () => {
    setLoading(true);
    const snap = await getDocs(
      query(collection(db, "reservations"), orderBy("createdAt", "desc"))
    );
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setLoading(false);

    const headers = ["이름", "전화", "주소", "출입방법", "희망일", "시간대", "물품", "신청시각"];
    const rows = all.map((res) => [
      res.name,
      res.phone,
      `${res.address ?? ""} ${res.detailAddress ?? ""}`,
      res.entrance,
      res.date,
      res.timeSlot,
      res.items,
      res.createdAt?.toDate?.().toLocaleString() || "",
    ]);
    const csvContent =
      "﻿" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reservations.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 예약 확정 알림톡 발송 (손님 + 사장님 동시)
  const sendConfirm = async (res) => {
    const visit = (visitDate[res.id] ?? `${res.date ?? ""} ${res.timeSlot ?? ""}`).trim();
    if (!visit) {
      alert("방문일시를 입력해 주세요.");
      return;
    }
    if (!window.confirm(`${res.name}님에게 확정 알림을 보낼까요?\n방문일시: ${visit}`)) return;
    setSendingId(res.id);
    try {
      // 뿌리오 실제 응답(code 1000)만 성공으로 인정. 네트워크 오류/기타 응답은 실패 처리(fail-closed).
      const send = (to, label) =>
        fetch(`${KAKAO_API}/kakao/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: (to || "").replace(/-/g, ""),
            name: label,
            templateCode: CONFIRM_TEMPLATE,
            changeWord: { var1: visit },
          }),
        })
          .then((r) => r.json())
          .then((d) => ({
            ok: d.code === "1000",
            key: d.messageKey || "-",
            reason: d.description || d.error || JSON.stringify(d),
          }))
          .catch((e) => ({ ok: false, key: "-", reason: "네트워크 오류: " + e.message }));

      const [cust, admin] = await Promise.all([
        send(res.phone, res.name), // 손님
        send(ADMIN_PHONE, "관리자"), // 사장님 (확인용)
      ]);

      if (cust.ok && admin.ok) {
        alert(
          `✅ 접수 성공 (손님 + 사장님)\n방문일시: ${visit}\n\n` +
          `손님 ${res.phone} · messageKey ${cust.key}\n사장님 ${ADMIN_PHONE} · messageKey ${admin.key}\n\n` +
          `※ 실제 도착 여부는 뿌리오 '발송결과'에서 상태 확인`
        );
      } else {
        alert(
          `⚠️ 일부/전체 실패 — 다시 확인하세요\n\n` +
          `손님: ${cust.ok ? "성공 ✓" : "실패 ✗ (" + cust.reason + ")"}\n` +
          `사장님: ${admin.ok ? "성공 ✓" : "실패 ✗ (" + admin.reason + ")"}`
        );
      }
    } finally {
      setSendingId(null);
    }
  };

  const handleLogout = () => {
    signOut(auth).then(() => (window.location.href = "/admin-login"));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
        <h1 className="text-2xl font-bold">
          🛠 수거 신청 목록
          {totalCount !== null ? ` (전체 ${totalCount}건)` : ""}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="이름/전화/주소 검색 (불러온 목록 내)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border px-2 py-1 rounded"
          />
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            title="신청일(접수일)로 검색"
            className="border px-2 py-1 rounded"
          />
          <button
            onClick={handleDownloadCSV}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            CSV 다운로드(전체)
          </button>
          <button
            onClick={handleLogout}
            className="bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-800"
          >
            로그아웃
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-3">
        화면에 {reservations.length}건 불러옴 · 검색결과 {filtered.length}건
      </p>

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
            <p className="text-xs text-gray-500">
              신청시각: {res.createdAt?.toDate?.().toLocaleString()}
            </p>

            <div className="mt-3 pt-3 border-t">
              <div className="text-xs text-gray-500 mb-1">
                확정 방문일시{" "}
                <span className="text-gray-400">
                  (기본 = 손님 희망 {res.date} {res.timeSlot} · 안 맞으면 수정하세요)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={visitDate[res.id] ?? `${res.date ?? ""} ${res.timeSlot ?? ""}`.trim()}
                  onChange={(e) =>
                    setVisitDate((p) => ({ ...p, [res.id]: e.target.value }))
                  }
                  placeholder="예: 7월 15일 (화) 오후 2시"
                  className="border px-2 py-1 rounded text-sm flex-1 min-w-[200px]"
                />
                <button
                  onClick={() =>
                    setVisitDate((p) => ({
                      ...p,
                      [res.id]: `${res.date ?? ""} ${res.timeSlot ?? ""}`.trim(),
                    }))
                  }
                  className="text-xs text-blue-600 underline whitespace-nowrap"
                >
                  손님 희망일로
                </button>
                <button
                  onClick={() => sendConfirm(res)}
                  disabled={sendingId === res.id}
                  className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 disabled:opacity-50 whitespace-nowrap"
                >
                  {sendingId === res.id ? "발송중..." : "확정 알림 보내기"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 text-center">
        {hasMore ? (
          <button
            onClick={loadMore}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "불러오는 중..." : "더 보기"}
          </button>
        ) : (
          <p className="text-sm text-gray-400">마지막입니다.</p>
        )}
      </div>
    </div>
  );
}
