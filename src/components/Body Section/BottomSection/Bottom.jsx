import React, { useState, useEffect } from "react";
import { Target, Zap, Timer, Award } from "lucide-react";
import axios from "axios";
import { useUserAuth } from "../../../context/UserAuthContext";
import ExercisePreviewModal from "./ExercisePreviewModal.jsx";
import "./Bottom.css";

// ==== (OPTIONAL) ถ้าโปรเจ็กต์คุณมี getMediaUrl อยู่แล้ว ใช้อันเดิมได้เลย ====
const API_BASE = (import.meta.env?.VITE_API_BASE_URL || "").replace(/\/$/, "");
const getMediaUrl = (p) => {
  if (!p) return "";
  const s = String(p).replace(/\\/g, "/");
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/uploads/") || s.startsWith("/stream/")) return API_BASE ? `${API_BASE}${s}` : s;
  if (s.startsWith("uploads/")) return API_BASE ? `${API_BASE}/${s}` : `/${s}`;
  return API_BASE ? `${API_BASE}/uploads/${s}` : `/uploads/${s}`;
};

function Bottom() {
  const { user } = useUserAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(getCurrentDayName().toLowerCase());
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dayOffset, setDayOffset] = useState(0);
  // NEW: state & handlers สำหรับพรีวิว
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewId, setPreviewId] = useState(null);

  const openPreview = (id) => { setPreviewId(id); setPreviewOpen(true); };
  const closePreview = () => setPreviewOpen(false);

  // ปรับ path ให้ตรงกับหน้าที่ใช้เล่นจริงของคุณ
  const handleStartExercise = (id) => {
    // ตัวอย่าง: ไปหน้าเล่นแบบเดี่ยว
    window.location.href = `/exercise/${id}`;
  };

  function getCurrentDayName() {
    return new Date().toLocaleDateString("en-US", { weekday: "long" });
  }

  // --- Data Fetching Effect ---
  useEffect(() => {
    if (!user?.uid) {
      setWorkoutPlan(null);
      setLoading(false);
      return;
    }
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [planRes, exRes] = await Promise.all([
          axios.get(`/api/workoutplan/${user.uid}`),
          axios.get(`/api/exercises`),
        ]);
        setWorkoutPlan(planRes.data);
        setExercises(exRes.data);
      } catch (err) {
        console.error("โหลดข้อมูลล้มเหลว:", err);
        setError("ไม่สามารถโหลดข้อมูลได้ โปรดลองใหม่ภายหลัง");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  // --- Clock Tick Effect ---
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // --- Day Offset Effect ---
  // อัปเดต selectedDay (ชื่อวัน) เมื่อ dayOffset (ตัวเลข) เปลี่ยน
  useEffect(() => {
    const getDayNameFromOffset = () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + dayOffset);
      return targetDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    };
    setSelectedDay(getDayNameFromOffset());
  }, [dayOffset]);

  // =========== Loading, Error, and Empty States ===========
  if (!user) {
    return (
      <div className="empty-container">
        <div className="empty-icon">🔑</div>
        <h2>โปรดเข้าสู่ระบบ</h2>
        <p>คุณต้องเข้าสู่ระบบเพื่อดูแผนการออกกำลังกายของคุณ</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>กำลังโหลดแผนการออกกำลังกายของคุณ…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
      </div>
    );
  }
  if (!workoutPlan || workoutPlan.plans.length === 0) {
    return (
      <div className="empty-container">
        <div className="empty-icon">📝</div>
        <h2>ไม่พบแผนการออกกำลังกาย</h2>
        <p>เมื่อสร้างแผนแล้ว รายการของคุณจะแสดงที่นี่</p>
      </div>
    );
  }

  // =========== Helper Functions ===========
  const exById = new Map(exercises.map((ex) => [String(ex._id || ex.id), ex]));

  const toSeconds = (val) => {
    if (val == null) return 0;
    if (typeof val === "number") return Math.round(val * 60);
    const s = String(val).trim();
    if (/^\d+:\d+$/.test(s)) {
      const [mm, ss] = s.split(":").map((n) => parseInt(n, 10));
      return (mm || 0) * 60 + (ss || 0);
    }
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    return 0;
  };

  const fmtMMSS = (secs) => {
    const s = Math.max(0, Math.floor(Number(secs || 0)));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const getMetaFromExercise = (ex) => {
    const mode = String(ex.type || "").toLowerCase();
    if (mode === "time") {
      const targetSeconds =
        toSeconds(ex.value) || toSeconds(ex.duration) || toSeconds(ex.time) || toSeconds(ex.minutes);
      return { kind: "time", targetSeconds };
    }
    const reps =
      Number(
        (ex.value && typeof ex.value !== "object" ? ex.value : undefined) ??
        ex.reps ??
        ex.count ??
        ex.targetReps ??
        0
      ) || 0;
    return { kind: "reps", targetReps: reps };
  };

  const getProgressColor = (p) => (p < 30 ? "#ff4757" : p < 70 ? "#ffa726" : "#4caf50");

  const getDayNameThai = (en) => {
    const map = {
      monday: "จันทร์", tuesday: "อังคาร", wednesday: "พุธ",
      thursday: "พฤหัส", friday: "ศุกร์", saturday: "เสาร์", sunday: "อาทิตย์",
    };
    return map[en.toLowerCase()] || en;
  };

  const getDateForDay = () => {
    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const day = targetDate.getDate();
    const monthIndex = targetDate.getMonth();
    const thaiMonth = thaiMonths[monthIndex];
    return `${day} ${thaiMonth}`;
  };

  const handlePrevDay = () => {
    setDayOffset(currentOffset => Math.max(-5, currentOffset - 1));
  };

  const handleNextDay = () => {
    setDayOffset(currentOffset => Math.min(5, currentOffset + 1));
  };

  const calcExerciseCalories = (w) => {
    if (w.kind === "reps") {
      if (w.caloriesForTarget > 0 && w.target > 0) {
        const perRep = w.caloriesForTarget / w.target;
        return w.performed * perRep;
      }
      if (w.caloriesPerRep > 0) return w.performed * w.caloriesPerRep;
      return w.performed * 0.5;
    } else {
      if (w.caloriesForTarget > 0 && w.target > 0) {
        return w.caloriesForTarget * (w.performed / w.target);
      }
      if (w.caloriesPerMinute > 0) {
        return (w.performed / 60) * w.caloriesPerMinute;
      }
      return (w.performed / 60) * 5;
    }
  };

  // =========== Data Processing for Rendering ===========
  const currentDayPlan = workoutPlan.plans.find((p) => p.day === selectedDay);

  const currentWorkouts = currentDayPlan
    ? currentDayPlan.exercises
      .map((pe) => {
        const exId = String(pe.exercise?._id || pe.exercise);
        const ex = exById.get(exId) || pe.exercise;
        if (!ex) return null;

        const meta = getMetaFromExercise(ex);

        let performed = 0, target = 0, progress = 0, isDone = false, unit = "", displayDone = "", displayTarget = "";
        if (meta.kind === "reps") {
          performed = Number(pe?.performed?.reps || 0);
          target = Number(meta.targetReps || 0);
          progress = target > 0 ? Math.min(performed / target, 1) : 0;
          isDone = performed >= target;
          unit = "ครั้ง";
          displayDone = `${performed}`;
          displayTarget = `${target}`;
        } else {
          performed = Number(pe?.performed?.seconds || 0);
          target = Number(meta.targetSeconds || 0);
          progress = target > 0 ? Math.min(performed / target, 1) : 0;
          isDone = performed >= target;
          unit = "เวลา";
          displayDone = fmtMMSS(performed);
          displayTarget = fmtMMSS(target);
        }

        return {
          id: ex._id || ex.id || exId,
          name: ex.name,
          image: ex.imageUrl || ex.image,
          kind: meta.kind,
          performed,
          target,
          isDone,
          progress,
          unit,
          displayDone,
          displayTarget,
          caloriesPerRep: Number(ex.caloriesPerRep ?? 0),
          caloriesPerMinute: Number(ex.caloriesPerMinute ?? 0),
          caloriesForTarget: Number(ex.caloriesBurned ?? 0)
        };
      })
      .filter(Boolean)
    : [];

  // =========== Aggregate Stats ===========
  const totalMinutes = Math.round(
    currentWorkouts
      .filter((w) => w.kind === "time")
      .reduce((a, w) => a + w.target, 0) / 60
  );

  const totalCaloriesBurned = currentWorkouts.reduce((sum, w) => sum + calcExerciseCalories(w), 0);

  return (
    <div className="bottom-container">
      {/* Header */}
      <div className="header-card">
        <div className="header-circle"></div>
        <div className="header-content">
          <div>
            <h1 className="header-title">
               แผนการออกกำลังกายประจำวัน
            </h1>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <Zap style={{ color: "#ffa726" }} size={24} />
          <div className="stat-value">{Math.round(totalCaloriesBurned)}</div>
          <div className="stat-label">แคลอรี่ที่เผาผลาญ</div>
        </div>
        <div className="stat-card">
          <Timer style={{ color: "#4caf50" }} size={24} />
          <div className="stat-value">{totalMinutes}</div>
          <div className="stat-label">เวลาทั้งหมด</div>
        </div>
        <div className="stat-card">
          <Award style={{ color: "#667eea" }} size={24} />
          <div className="stat-value">{currentWorkouts.length}</div>
          <div className="stat-label">เป้าหมายจำนวนท่า</div>
        </div>
      </div>

      {/* Day Navigator */}
      <div className="day-navigator" style={{ textAlign: 'center', margin: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <button
          className="day-btn"
          onClick={handlePrevDay}
          disabled={dayOffset <= -5}
        >
          &lt; วันก่อนหน้า
        </button>
        <div style={{ fontWeight: 'bold', minWidth: '120px', textAlign: 'center' }}>
          <span className="day-name" style={{ display: 'block' }}>{getDayNameThai(selectedDay)}</span>
          <span className="day-date">{getDateForDay()}</span>
        </div>
        <button
          className="day-btn"
          onClick={handleNextDay}
          disabled={dayOffset >= 5}
        >
          วันถัดไป &gt;
        </button>
      </div>

      {/* Exercise List */}
      <div className="exercise-list">
        {currentWorkouts.length === 0 ? (
          <div className="rest-day-card">
            <h3>วันพัก</h3>
            <p>วันนี้ไม่มีท่าที่ต้องทำ พักผ่อนให้เต็มที่!</p>
          </div>
        ) : (
          currentWorkouts.map((ex, i) => {
            const percent = Math.round(ex.progress * 100);
            const kcal = calcExerciseCalories(ex);
            return (
              <div
                key={ex.id + "-" + i}
                className="exercise-card"
                onClick={() => openPreview(ex.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openPreview(ex.id)}
              >
                <div className="exercise-content">
                  <div className="exercise-image">
                    <img src={getMediaUrl(ex.image)} alt={ex.name} />
                  </div>
                  <div className="exercise-details">
                    <h3 className="exercise-name">{ex.name}</h3>
                    <div className="exercise-stats">
                      {ex.kind === "time" ? (
                        <>
                          <span>🎯 เป้าหมาย: {ex.displayTarget}</span>
                          <span>✅ ทำจริง: {ex.displayDone}</span>
                        </>
                      ) : (
                        <>
                          <span>🎯 เป้าหมาย: {ex.displayTarget} ครั้ง</span>
                          <span>✅ ทำจริง: {ex.displayDone} ครั้ง</span>
                        </>
                      )}
                      <span className="muscle-badge">🔥 {kcal.toFixed(1)} kcal</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${percent}%`, background: getProgressColor(percent) }}
                      ></div>
                    </div>
                    <div className="progress-low">
                      {ex.isDone ? "สำเร็จแล้ว" : "ยังไม่ถึงเป้าหมาย Keep Going!"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Exercise Preview Modal */}
      <ExercisePreviewModal
        open={previewOpen}
        id={previewId}
        onClose={closePreview}
        onStart={handleStartExercise}
      />
    </div>
  );
}

export default Bottom;