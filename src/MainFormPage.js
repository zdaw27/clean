import React, { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export default function App() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [entrance, setEntrance] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [items, setItems] = useState("");

  const handleAddressSearch = () => {
    new window.daum.Postcode({
      oncomplete: (data) => {
        setAddress(data.address);
      },
    }).open();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "reservations"), {
        name,
        phone,
        address,
        detailAddress,
        entrance,
        date,
        timeSlot,
        items,
        createdAt: Timestamp.now(),
      });
      alert("신청이 완료되었습니다!");
      // 폼 초기화
      setName(""); setPhone(""); setAddress(""); setDetailAddress("");
      setEntrance(""); setDate(""); setTimeSlot(""); setItems("");
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("저장에 실패했습니다.");
    }
  };

  return (
    <div className="relative min-h-screen text-neutral-900">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${process.env.PUBLIC_URL}/bg-laundry2.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      ></div>

      <div className="relative min-h-screen z-10">
        <main className="max-w-lg mx-auto px-6 pt-10 pb-20 bg-white/80 backdrop-blur-sm rounded-lg">
          <div className="text-center">
            <img
              src={`${process.env.PUBLIC_URL}/logo.png`}
              alt="헌옷총각 메인 이미지"
              className="w-full max-h-80 object-contain mx-auto mb-6"
            />
            <h1 className="text-2xl font-semibold mb-2">헌옷 수거 신청</h1>
            <p className="text-sm text-neutral-600">수거 희망일과 정보를 입력해 주세요</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <div>
              <label className="block text-sm mb-1">수거자명</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-4 py-2" required />
            </div>

            <div>
              <label className="block text-sm mb-1">휴대폰 번호</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-4 py-2" required />
            </div>

            <div>
              <label className="block text-sm mb-1">수거 주소</label>
              <div className="flex space-x-2">
                <input value={address} readOnly
                  className="flex-1 border border-neutral-300 rounded-md px-4 py-2 bg-neutral-100"
                  placeholder="주소를 검색해주세요" />
                <button type="button" onClick={handleAddressSearch}
                  className="px-4 py-2 bg-black text-white rounded-md hover:bg-neutral-800">
                  주소 검색
                </button>
              </div>
              <input value={detailAddress} onChange={(e) => setDetailAddress(e.target.value)}
                placeholder="상세 주소" className="mt-2 w-full border border-neutral-300 rounded-md px-4 py-2" />
            </div>

            <div>
              <label className="block text-sm mb-1">출입 방법</label>
              <input value={entrance} onChange={(e) => setEntrance(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-4 py-2" />
            </div>

            <div>
              <label className="block text-sm mb-1">수거 희망일</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-4 py-2" required />
            </div>

            <div>
              <label className="block text-sm mb-1">수거 희망 시간대</label>
              <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-4 py-2" required>
                <option value="">선택하세요</option>
                <option>시간 무관</option>
                <option>오전 9시 ~ 12시</option>
                <option>오후 12시 ~ 3시</option>
                <option>오후 3시 ~ 6시</option>
                <option>오후 6시 이후</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">보유 물품 종류</label>
              <textarea value={items} onChange={(e) => setItems(e.target.value)}
                rows={3} className="w-full border border-neutral-300 rounded-md px-4 py-2 resize-none"
                placeholder="예: 남성 의류, 여성 의류 등" />
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">
              ※ 20kg 이상부터 수거 가능합니다.<br />
              수거 가능 여부는 신청 확인 후 연락드립니다.
            </p>

            <button type="submit"
              className="w-full bg-black text-white py-3 rounded-md text-sm hover:bg-neutral-800 transition">
              신청하기
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
