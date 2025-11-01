import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export default function App() {
  const [privacyText, setPrivacyText] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [entrance, setEntrance] = useState("");
  const [date, setDate] = useState("");
  const [items, setItems] = useState("");
  const [agree, setAgree] = useState(false);
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false);

  useEffect(() => {
    if (showPrivacyPopup) {
      fetch(`${process.env.PUBLIC_URL}/privacy.txt`)
        .then((res) => res.text())
        .then((text) => setPrivacyText(text))
        .catch(() => setPrivacyText("약관을 불러오는 데 실패했습니다."));
    }
  }, [showPrivacyPopup]);

  const handleAddressSearch = () => {
    new window.daum.Postcode({
      oncomplete: (data) => {
        setAddress(data.address);
      },
    }).open();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agree) {
      alert("개인정보 수집 및 이용에 동의해주세요.");
      return;
    }
    try {
      // Firebase에 저장
      await addDoc(collection(db, "reservations"), {
        name,
        phone,
        address,
        detailAddress,
        entrance,
        date,
        items,
        createdAt: Timestamp.now(),
      });

      // 카톡 발송 (사용자에게)
      try {
        console.log("📱 사용자 카톡 발송 시작:", phone);
        const userRes = await fetch("https://kakao-server.onrender.com/kakao/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: phone.replace(/-/g, ""),
            name: name,
            changeWord: { var1: `${name}님의 헌옷 수거 신청이 접수되었습니다.` }
          })
        });
        const userResult = await userRes.json();
        console.log("✅ 사용자 카톡 발송 결과:", userResult);
      } catch (kakaoError) {
        console.error("❌ 사용자 카톡 발송 실패:", kakaoError);
      }

      // 카톡 발송 (관리자에게)
      try {
        console.log("📱 관리자 카톡 발송 시작");
        const adminRes = await fetch("https://kakao-server.onrender.com/kakao/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "01088289952",
            name: "관리자",
            changeWord: { var1: `${name}님의 새로운 수거 신청 (${phone}, ${address})` }
          })
        });
        const adminResult = await adminRes.json();
        console.log("✅ 관리자 카톡 발송 결과:", adminResult);
      } catch (kakaoError) {
        console.error("❌ 관리자 카톡 발송 실패:", kakaoError);
      }

      alert("신청이 완료되었습니다!");
      setName(""); setPhone(""); setAddress(""); setDetailAddress("");
      setEntrance(""); setDate(""); setItems(""); setAgree(false);
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

          <div className="mt-10 text-sm text-neutral-700 leading-relaxed space-y-1">
            <p>1. 헌옷,신발,가방 총합 <strong>최소중량 20키로 이상부터 신청 가능</strong></p>
            <p>2. 헌책은 혼자 들 수 있는 만큼 박스나 노끈으로 단단히 묶어 현관 앞에 쌓아주세요</p>
            <p>3. 엘베 없는 지상/지하층은 <strong>수거 전에 1층으로 옮겨 주세요</strong></p>
            <p>4. 신청 완료 후 <strong>지역 담당자께서 순차적으로 연락 드려요</strong>. 감사합니다!</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm mb-1">방문 수거 가능지역 확인</label>
              <a href="https://cafe.naver.com/01088289952?iframe_url_utf8=%2FArticleRead.nhn%253Fclubid%3D24681202%2526articleid%3D335748%2526menuid%3D1" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">여기에서 확인하기</a>
            </div>

            <div>
              <label className="block text-sm mb-1">수거 물품 상세 정보 확인</label>
              <a href="https://cafe.naver.com/f-e/cafes/24681202/articles/111?boardtype=L&menuid=12&referrerAllArticles=false" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">여기에서 확인하기</a>
            </div>

            <div>
              <label className="block text-sm mb-1">수거자명</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-neutral-300 rounded-md px-4 py-2" required />
            </div>

            <div>
              <label className="block text-sm mb-1">휴대폰 번호</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-neutral-300 rounded-md px-4 py-2" required />
            </div>

            <div>
              <label className="block text-sm mb-1">수거 주소</label>
              <div className="flex space-x-2">
                <input value={address} readOnly className="flex-1 border border-neutral-300 rounded-md px-4 py-2 bg-neutral-100" placeholder="주소를 검색해주세요" />
                <button type="button" onClick={handleAddressSearch} className="px-4 py-2 bg-black text-white rounded-md hover:bg-neutral-800">주소 검색</button>
              </div>
              <input value={detailAddress} onChange={(e) => setDetailAddress(e.target.value)} placeholder="상세주소 (동호수를 정확히 입력해주세요)" className="mt-2 w-full border border-neutral-300 rounded-md px-4 py-2" />
              <input value={entrance} onChange={(e) => setEntrance(e.target.value)} placeholder="아파트/건물명 및 공동 현관 비밀번호" className="mt-2 w-full border border-neutral-300 rounded-md px-4 py-2" />
            </div>

            <div>
              <label className="block text-sm mb-1">수거 희망일 (일요일 휴무)</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-neutral-300 rounded-md px-4 py-2" required />
              <p className="text-xs text-neutral-500 mt-1">※ 희망일 예약 마감 시 빠른 날짜로 자동 예약됩니다</p>
            </div>

            <div>
              <label className="block text-sm mb-1">보유 물품 종류</label>
              <textarea value={items} onChange={(e) => setItems(e.target.value)} rows={3} className="w-full border border-neutral-300 rounded-md px-4 py-2 resize-none" placeholder="예: 헌옷, 신발, 가방 100리터 5봉지, 헌책 200권 등등" />
            </div>

            <div>
              <label className="block text-sm mb-1">후기 이벤트 안내</label>
              <a href="https://cafe.naver.com/f-e/cafes/24681202/articles/349651?referrerAllArticles=false" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">후기 작성 시 현금 16,000원 추가 입금 이벤트 참여 안내</a>
            </div>

            <div className="flex items-center space-x-2">
              <input type="checkbox" id="privacy" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <label htmlFor="privacy" className="text-sm">개인정보 수집 및 이용에 동의합니다. <button type="button" className="text-blue-600 underline text-xs" onClick={() => setShowPrivacyPopup(true)}>[자세히 보기]</button></label>
            </div>

            {showPrivacyPopup && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-y-auto">
                <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <h2 className="text-lg font-semibold mb-4">개인정보 수집 및 이용 동의</h2>
                  <div className="text-sm text-neutral-700 whitespace-pre-wrap mb-6" style={{ whiteSpace: 'pre-wrap' }}>
                    {privacyText}
                  </div>
                  <button onClick={() => setShowPrivacyPopup(false)} className="px-4 py-2 bg-black text-white rounded-md">닫기</button>
                </div>
              </div>
            )}

            <p className="text-xs text-neutral-500 leading-relaxed">
              ※ 20kg 이상부터 수거 가능합니다. <br />
              중량 미달 시 중량 충족 후 다시 문의해주세요.
            </p>

            <button type="submit" className="w-full bg-black text-white py-3 rounded-md text-sm hover:bg-neutral-800 transition">
              신청하기
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
