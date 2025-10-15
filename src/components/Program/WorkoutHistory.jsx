// components/Program/WorkoutHistory.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";

// (ถ้ามี Auth context)
import { useUserAuth } from "../../context/UserAuthContext"; // ถ้าโปรเจกต์ยังไม่มี ให้ลบการ import นี้ออกและใช้ uid จาก props/params แทน

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "";

export default function WorkoutHistory({ uid: uidProp }) {
  // ดึง uid อย่างยืดหยุ่น: จาก props > จาก URL > จาก Auth context
  const params = useParams();
  const { user } = (typeof useUserAuth === "function" ? useUserAuth() : { user: null });
  const uid = uidProp || params.userId || user?.uid || "demo-uid";

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({}); // { [sessionId]: { session, logs } }

  const fmtDate = (d) =>
    new Date(d).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

  const fmtMin = (s) => `${Math.round((s || 0) / 60)} นาที`;

  useEffect(() => {
    if (!uid) {
      setErr("จำเป็นต้องมีรหัสผู้ใช้ (uid)");
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setErr("");
      try {
        // ดึงรายการ session ล่าสุด (เช่น 30 รายการ)
        const { data } = await axios.get(`${API_BASE}/api/workout_sessions`, {
          params: { uid, limit: 30 },
        });
        setSessions(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e?.response?.data?.message || e.message || "โหลดประวัติไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const toggleExpand = async (id) => {
    setExpandedId((cur) => (cur === id ? null : id));
    if (!details[id]) {
      try {
        const { data } = await axios.get(`${API_BASE}/api/workout_sessions/${id}`);
        setDetails((d) => ({ ...d, [id]: data }));
      } catch (e) {
        // ไม่ทำให้หน้าล่ม แค่ไม่โชว์รายละเอียด
      }
    }
  };

  if (loading) return <div className="p-6">กำลังโหลดประวัติของคุณ…</div>;
  if (err) return <div className="p-6 text-red-600">เกิดข้อผิดพลาด: {err}</div>;

  const isEmpty = sessions.length === 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ประวัติการออกกำลังกาย</h1>

        {/* ปุ่มไปสรุปรวม “หน้าเดียว” ตาม flow ใหม่ */}
        <Link
          to={`/summary/program/${uid}`}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-gray-50"
        >
          ดูสรุปรวมล่าสุด
        </Link>
      </header>

      {isEmpty && (
        <div className="rounded-lg border p-6 text-center">
          <div className="text-lg font-medium">ยังไม่มีประวัติการออกกำลังกาย</div>
          <div className="text-gray-600 mt-1">เริ่มออกกำลังกาย แล้วกลับมาดูสถิติได้ที่นี่</div>
        </div>
      )}

      {!isEmpty && (
        <div className="space-y-4">
          {sessions.map((s) => {
            const percent =
              s.totalExercises > 0
                ? Math.round(((s.completedExercises || 0) / s.totalExercises) * 100)
                : 0;
            const isOpen = expandedId === s._id;
            const d = details[s._id]; // { session, logs }

            return (
              <div key={s._id} className="rounded-lg border overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleExpand(s._id)}
                  className="w-full text-left p-4 hover:bg-gray-50 flex items-center justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <div className="font-medium">
                      {s.origin?.kind === "program" ? (s.origin?.program?.name || s.snapshot?.programName || "โปรแกรม") : "Daily Workout"}
                    </div>
                    <div className="text-sm text-gray-600">
                      {fmtDate(s.startedAt)} · สถานะ: {s.status} · สำเร็จ {s.completedExercises}/{s.totalExercises} ท่า · {fmtMin(s.totalSeconds)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">{percent}%</div>
                </button>

                {isOpen && (
                  <div className="border-t p-4 bg-white">
                    {!d && <div className="text-gray-600">กำลังโหลดรายละเอียด…</div>}

                    {d && (
                      <>
                        {/* แถบข้อมูล session โดยรวม */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-gray-500">เริ่ม</div>
                            <div className="font-medium">{fmtDate(d.session?.startedAt)}</div>
                          </div>
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-gray-500">จบ</div>
                            <div className="font-medium">
                              {d.session?.endedAt ? fmtDate(d.session.endedAt) : "-"}
                            </div>
                          </div>
                          <div className="rounded-md border p-3">
                            <div className="text-xs text-gray-500">เวลารวม</div>
                            <div className="font-medium">{fmtMin(d.session?.totalSeconds || 0)}</div>
                          </div>
                        </div>

                        {/* ตาราง logs รายท่า */}
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-600 border-b">
                                <th className="py-2 pr-3">ลำดับ</th>
                                <th className="py-2 pr-3">ท่า</th>
                                <th className="py-2 pr-3">Target</th>
                                <th className="py-2 pr-3">ทำจริง</th>
                                <th className="py-2 pr-3">Kcal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(d.logs || []).map((log) => {
                                const targetStr = log.target?.type === "reps"
                                  ? `${log.target?.value ?? ""} ครั้ง`
                                  : `${log.target?.value ?? ""} วิ`;
                                const perfStr =
                                  log.performed?.reps
                                    ? `${log.performed.reps} ครั้ง`
                                    : `${log.performed?.seconds || 0} วิ`;
                                return (
                                  <tr key={log._id} className="border-b last:border-0">
                                    <td className="py-2 pr-3">{log.order ?? "-"}</td>
                                    <td className="py-2 pr-3">{log.name || log.exercise?.name || "-"}</td>
                                    <td className="py-2 pr-3">{targetStr}</td>
                                    <td className="py-2 pr-3">{perfStr}</td>
                                    <td className="py-2 pr-3">{log.calories || 0}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
