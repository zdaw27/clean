import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

export default function AdminPage() {
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    const fetchReservations = async () => {
      const q = query(collection(db, "reservations"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReservations(data);
    };

    fetchReservations();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">수거 신청 목록</h1>
      <ul className="space-y-4">
        {reservations.map((res) => (
          <li key={res.id} className="p-4 border rounded bg-white shadow">
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
