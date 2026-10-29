import React, { useEffect, useState } from "react";
import { banPhone, formatPhone, loadBannedPhones, unbanPhone } from "./phoneBan";

const errorMessage = (error) => error.code === "permission-denied"
  ? "벤리스트 접근 권한이 없습니다. 관리자 계정을 확인해 주세요."
  : error.message || "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

export default function BanListPanel() {
  const [entries, setEntries] = useState([]);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    loadBannedPhones().then((data) => { if (active) setEntries(data); })
      .catch((failure) => { if (active) setError(errorMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try { setEntries(await loadBannedPhones()); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setLoading(false); }
  };

  const add = async (event) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const blocked = await banPhone(phone);
      setEntries((current) => [...current, { id: blocked, phone: blocked }]
        .sort((left, right) => left.id.localeCompare(right.id)));
      setPhone("");
      setNotice(`${formatPhone(blocked)} 번호를 차단했습니다.`);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setPending(false); }
  };

  const remove = async (entry) => {
    if (pending || !window.confirm(`${formatPhone(entry.id)} 번호의 예약 차단을 해제할까요?`)) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      await unbanPhone(entry.id);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setNotice(`${formatPhone(entry.id)} 번호의 차단을 해제했습니다.`);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setPending(false); }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">등록된 전화번호로는 새 예약을 접수할 수 없습니다. 기존 예약은 유지됩니다.</p>
      <form onSubmit={add} className="flex flex-wrap items-end gap-3 rounded border bg-white p-4">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="ban-phone" className="mb-1 block text-sm font-medium">차단할 휴대폰 번호</label>
          <input id="ban-phone" type="tel" autoComplete="off" value={phone}
            onChange={(event) => setPhone(event.target.value)} placeholder="010-1234-5678"
            className="w-full rounded border px-3 py-2" required disabled={pending} />
        </div>
        <button type="submit" disabled={pending || loading}
          className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50">
          {pending ? "처리 중..." : "번호 차단"}
        </button>
      </form>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">차단 번호 목록 ({entries.length}개)</h2>
        <button type="button" onClick={refresh} disabled={pending || loading}
          className="rounded border px-3 py-1 text-sm disabled:opacity-50">새로고침</button>
      </div>
      {loading ? <p className="text-sm text-gray-500">차단 목록을 불러오는 중입니다.</p>
        : !entries.length && !error ? <p className="text-sm text-gray-500">등록된 차단 번호가 없습니다.</p> : null}
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between gap-3 rounded border bg-white p-3">
            <span className="font-medium">{formatPhone(entry.id)}</span>
            <button type="button" onClick={() => remove(entry)} disabled={pending || loading}
              aria-label={`${formatPhone(entry.id)} 차단 해제`}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50">차단 해제</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
