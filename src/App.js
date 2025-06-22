import React from "react";

export default function App() {
  return (
    <div className="relative min-h-screen text-neutral-900">
      {/* 배경 이미지 오버레이 */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/bg-laundry2.png')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      ></div>
      {/* 콘텐츠 오버레이 */}
       <div className="relative min-h-screen z-10">
    <main className="max-w-lg mx-auto px-6 pt-10 pb-20 bg-white/80 backdrop-blur-sm rounded-lg">
          <div className="text-center">
            <img
              src="/logo.png"
              alt="헌옷총각 메인 이미지"
              className="w-full max-h-80 object-contain mx-auto mb-6"
            />
            <h1 className="text-2xl font-semibold mb-2">헌옷 수거 신청</h1>
            <p className="text-sm text-neutral-600">수거 희망일과 정보를 입력해 주세요</p>
          </div>

          <form className="mt-10 space-y-5">
            <div>
              <label className="block text-sm mb-1">수거자명</label>
              <input
                type="text"
                className="w-full border border-neutral-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="이름을 입력해주세요"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">휴대폰 번호</label>
              <input
                type="tel"
                className="w-full border border-neutral-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="010-1234-5678"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">수거 주소</label>
              <input
                type="text"
                className="w-full border border-neutral-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="정확한 주소를 입력해주세요"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">출입 방법</label>
              <input
                type="text"
                className="w-full border border-neutral-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="공동현관 비밀번호 등"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">수거 희망일</label>
              <input
                type="date"
                className="w-full border border-neutral-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">수거 희망 시간대</label>
              <select className="w-full border border-neutral-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black">
                <option>시간 무관</option>
                <option>오전 9시 ~ 12시</option>
                <option>오후 12시 ~ 3시</option>
                <option>오후 3시 ~ 6시</option>
                <option>오후 6시 이후</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">보유 물품 종류</label>
              <textarea
                rows={3}
                className="w-full border border-neutral-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black resize-none"
                placeholder="예: 남성 의류, 여성 의류, 아동 의류 등"
              ></textarea>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">
              ※ 20kg 이상부터 수거 가능합니다.<br />
              수거 가능 여부는 신청 확인 후 연락드립니다.
            </p>

            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded-md text-sm hover:bg-neutral-800 transition"
            >
              신청하기
            </button>
          </form>
        </main>

        <footer className="text-center text-xs text-neutral-400 py-10">
          &copy; 2025 헌옷총각. All rights reserved.
        </footer>

        {/* 플로팅 카카오/네이버 버튼 */}
        <div className="fixed bottom-5 right-5 space-y-3 z-50">
          <a
            href="https://pf.kakao.com/_YOUR_KAKAO_ID"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-yellow-400 text-black text-sm font-semibold px-4 py-2 rounded shadow hover:bg-yellow-300"
          >
            카카오톡 문의
          </a>
          <a
            href="https://talk.naver.com/ct/wc1ehf"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded shadow hover:bg-green-400"
          >
            네이버 톡톡
          </a>
        </div>
      </div>
    </div>
  );
}
