import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import "./WorkoutPlayer.css";
import guideImg from "../assets/Infographic.png";
import guideImg2 from "../assets/Infographic2.png";


/* ========= Helpers ========= */
function normalizeUrl(p) {
  if (!p) return "";
  const s = String(p).replace(/\\/g, "/");
  if (s.startsWith("/uploads/")) return s;
  if (s.startsWith("uploads/")) return `/${s}`;
  return s;
}

function parseDurationMs(ex) {
  const { type, value, time, duration } = ex || {};
  const pick = time ?? duration ?? value;
  const toSeconds = (val) => {
    if (typeof val === "number") return val;
    if (val == null) return 0;
    const s = String(val).trim();
    if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    const parts = s.split(":").map((n) => parseInt(n, 10) || 0);
    if (parts.length === 2) { const [mm, ss] = parts; return mm * 60 + ss; }
    if (parts.length === 3) { const [hh, mm, ss] = parts; return hh * 3600 + mm * 60 + ss; }
    return 0;
  };
  if (type === "time") return Math.max(0, toSeconds(pick)) * 1000;
  if (type === "reps") {
    const reps = typeof pick === "number" ? pick : parseInt(pick, 10) || 0;
    return Math.max(0, reps) * 2000;
  }
  return 0;
}


/* ========= Progress Ring ========= */
const ProgressRing = ({ progress, size = 80, strokeWidth = 6 }) => {
  const center = size / 2, radius = center - strokeWidth, C = 2 * Math.PI * radius;
  const dashoffset = C - (progress / 100) * C;
  return (
    <svg width={size} height={size} className="progress-ring-svg">
      <circle className="progress-ring-background" cx={center} cy={center} r={radius} strokeWidth={strokeWidth} />
      <circle className="progress-ring-progress" cx={center} cy={center} r={radius} strokeWidth={strokeWidth}
        style={{ strokeDasharray: `${C} ${C}`, strokeDashoffset: dashoffset, transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
    </svg>
  );
};

/* ========= CameraGuide (ใช้คลาสจาก CSS) ========= */
function CameraGuide({ mode = "gate", images = [], onAccept, onClose }) {
  const safeImages = (images || []).filter(Boolean);
  const hasMany = safeImages.length > 1;

  const [idx, setIdx] = React.useState(0);
  const [preview, setPreview] = React.useState(null);

  const go = React.useCallback((d) => {
    setIdx((i) => {
      const n = safeImages.length || 1;
      return ((i + d) % n + n) % n;
    });
  }, [safeImages.length]);

  React.useEffect(() => {
    const onKey = (e) => {
      if (preview != null) {
        if (e.key === "Escape") setPreview(null);
        if (e.key === "ArrowRight") setPreview((p) => (p + 1) % safeImages.length);
        if (e.key === "ArrowLeft") setPreview((p) => (p - 1 + safeImages.length) % safeImages.length);
        return;
      }
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, preview, safeImages.length]);

  return (
    <>
      <div className="guide-overlay" role="dialog" aria-modal="true" aria-label="คำแนะนำการตั้งกล้อง">
        <div className="guide-card">
          <div className="guide-header">
            <h2 className="guide-title">คำแนะนำในการตั้งกล้องก่อนเริ่ม</h2>
            <p className="guide-subtitle">วางกล้องระดับเอว–หน้าอก มุมมองด้านข้าง ให้เห็นเต็มตัว แสงเพียงพอ ฉากหลังโล่ง</p>

            {/* โหมด peek ให้ปุ่มกากบาทปิด */}
            {mode === "peek" && (
              <button type="button" className="guide-close-btn" aria-label="ปิดไกด์" onClick={onClose}>×</button>
            )}
          </div>

          <div className="guide-body">
            {safeImages.length > 0 && (
              <div className="guide-gallery">
                <div className="guide-main">
                  <img
                    className="guide-image"
                    src={safeImages[idx]}
                    alt={`Infographic ${idx + 1}`}
                    loading="lazy"
                    onClick={() => setPreview(idx)}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                  {hasMany && (
                    <>
                      <button type="button" className="guide-nav guide-nav--left" aria-label="ภาพก่อนหน้า" onClick={() => go(-1)}>‹</button>
                      <button type="button" className="guide-nav guide-nav--right" aria-label="ภาพถัดไป" onClick={() => go(1)}>›</button>
                    </>
                  )}
                </div>

                {hasMany && (
                  <div className="guide-thumbs" role="tablist" aria-label="เลือกภาพ">
                    {safeImages.map((src, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`guide-thumb ${i === idx ? "is-active" : ""}`}
                        role="tab"
                        aria-selected={i === idx}
                        onClick={() => setIdx(i)}
                        title={`ภาพที่ ${i + 1}`}
                      >
                        <img src={src} alt={`Thumb ${i + 1}`} loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="guide-checklist">
              <div className="guide-item">
                <div className="guide-icon">📷</div>
                <div><div className="guide-text"><b>ตั้งกล้องกึ่งกลางลำตัวด้านข้าง</b></div><div className="guide-sub">ห่าง 2–3 เมตร เพื่อเก็บเต็มตัว</div></div>
              </div>
              <div className="guide-item">
                <div className="guide-icon">💡</div>
                <div><div className="guide-text">แสงสว่างพอ</div><div className="guide-sub">ฉากหลังโล่ง เสื้อผ้าตัดกับฉากหลัง</div></div>
              </div>
            </div>
          </div>

          {/* gate เท่านั้นที่มีปุ่ม “เริ่มเลย” */}
          {mode === "gate" && (
            <div className="guide-actions">
              <button type="button" className="guide-accept-btn" onClick={onAccept}>ฉันเข้าใจแล้ว เริ่มเลย</button>
            </div>
          )}
        </div>
      </div>

      {preview != null && (
        <div className="lightbox" onClick={() => setPreview(null)} aria-label="ตัวอย่างภาพแบบขยาย">
          <img src={safeImages[preview]} alt={`Preview ${preview + 1}`} className="lightbox-img" />
          {hasMany && (
            <>
              <button type="button" className="guide-nav guide-nav--left"
                onClick={(e) => { e.stopPropagation(); setPreview((p) => (p - 1 + safeImages.length) % safeImages.length); }}
                aria-label="ภาพก่อนหน้า">‹</button>
              <button type="button" className="guide-nav guide-nav--right"
                onClick={(e) => { e.stopPropagation(); setPreview((p) => (p + 1) % safeImages.length); }}
                aria-label="ภาพถัดไป">›</button>
            </>
          )}
        </div>
      )}
    </>
  );
}



/* ========= Main ========= */
export default function WorkoutPlayer() {
  const { programId } = useParams();
  //   const guideKey = React.useMemo(() => `hasSeenGuide:${programId}`, [programId]);
  /* Data & UI State */
  const [program, setProgram] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showGuide, setShowGuide] = useState(true);
  const [guideMode, setGuideMode] = useState("gate"); // 'gate' | 'peek'
  const [wasPausedByGuide, setWasPausedByGuide] = useState(false);
  // เก็บ phase ที่ถูก pause ตอนเปิดไกด์
  const pausedPhaseRef = useRef(null); // 'intro' | 'rest' | 'play' | 'countdown' | null
  /* Flow flags */
  const [currentExercise, setCurrentExercise] = useState(0);
  const [isIntro, setIsIntro] = useState(false);
  const [introProgress, setIntroProgress] = useState(0);
  const [introRemaining, setIntroRemaining] = useState(0);
  const introIntervalRef = useRef(null);
  const introTimerRef = useRef(null);
  const introTotalMsRef = useRef(0);
  const introRemainingMsRef = useRef(0);
  const introLastStartTsRef = useRef(0);
  const INTRO_BASE_SEC = 30;

  const [isCounting, setIsCounting] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const [isPlaying, setIsPlaying] = useState(false);
  const [exerciseProgress, setExerciseProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const progressIntervalRef = useRef(null);
  const autoNextTimerRef = useRef(null);
  const currentDurationMsRef = useRef(0);
  const remainingMsRef = useRef(0);
  const lastStartTsRef = useRef(0);

  const [isResting, setIsResting] = useState(false);
  const [restProgress, setRestProgress] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);
  const restIntervalRef = useRef(null);
  const restTimerRef = useRef(null);
  const restTotalMsRef = useRef(0);
  const restRemainingMsRef = useRef(0);
  const restLastStartTsRef = useRef(0);
  const REST_BASE_SEC = 20;
  const nextIndexRef = useRef(null);

  const [isPaused, setIsPaused] = useState(false);

  /* Camera */
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [cameraError, setCameraError] = useState("");


  // ⬆️ บนสุดของ component
  const overlayResumeArmedRef = useRef(false);
  useEffect(() => {
    if (isPaused && isResting && !showGuide) {
      overlayResumeArmedRef.current = false;
      const t = setTimeout(() => { overlayResumeArmedRef.current = true; }, 180);
      return () => clearTimeout(t);
    }
  }, [isPaused, isResting, showGuide]);

  const safeResumeFromOverlay = () => {
    if (!overlayResumeArmedRef.current) return;
    togglePause();
  };

  /* Load program */
  useEffect(() => {
  let ignore = false;
  (async () => {
    try {
      setIsLoading(true); setLoadError(null);
      const res = await axios.get(`/api/workout_programs/${programId}`);
      if (ignore) return;

      setProgram(res.data);
      const list = Array.isArray(res.data?.workoutList) ? res.data.workoutList : [];
      setExercises(list.map((it) => ({
        ...it,
        imageUrl: normalizeUrl(it.imageUrl || it.image),
        video: normalizeUrl(it.videoUrl || it.video),
      })));
      setCurrentExercise(0);

      stopCamera(); 
      resetWorkoutTimers(); 
      resetRestTimers(); 
      resetIntroTimers();
      setIsPaused(false); 
      setIsResting(false); 
      setIsPlaying(false); 
      setIsCounting(false);
    } catch (e) {
      if (ignore) return;
      setLoadError({ where: "program", message: e?.message || "program fetch failed" });
      setProgram(null); setExercises([]);
    } finally {
      if (!ignore) setIsLoading(false);
    }
  })();
  return () => {
    ignore = true;
    stopCamera(); 
    resetWorkoutTimers(); 
    resetRestTimers(); 
    resetIntroTimers();
  };
}, [programId]);

  // เปิดไกด์แบบ peek และ "หยุดทุกอย่าง" เหมือนปุ่มหยุด
  const openGuidePeek = () => {
    setShowGuide(true);
    setGuideMode("peek");
    pausedPhaseRef.current = null;

    if (isIntro && !isPaused) {
      pauseIntroTimers(); setIsPaused(true); pausedPhaseRef.current = "intro";
    } else if (isResting && !isPaused) {
      pauseRestTimers(); setIsPaused(true); pausedPhaseRef.current = "rest";
    } else if (isPlaying && !isPaused) {
      pauseWorkoutTimers(); setIsPaused(true); pausedPhaseRef.current = "play";
    } else if (isCounting) {
      // หยุด countdown ชั่วคราว
      setIsCounting(false);
      pausedPhaseRef.current = "countdown";
    }
  };

  // ปิดไกด์ (เฉพาะโหมด peek) แล้ว resume กลับไปที่เดิม
  const handleCloseGuide = () => {
    setShowGuide(false);
    if (guideMode !== "peek") return;

    const phase = pausedPhaseRef.current;
    pausedPhaseRef.current = null;

    switch (phase) {
      case "intro":
        setIsPaused(false);
        setTimeout(() => resumeIntroTimers(), 50);
        break;
      case "rest":
        setIsPaused(false);
        setTimeout(() => resumeRestTimers(), 50);
        break;
      case "play":
        setIsPaused(false);
        setTimeout(() => resumeWorkoutTimers(), 50);
        break;
      case "countdown":
        // กลับไปนับต่อ
        setIsCounting(true);
        break;
      default:
        // ไม่ได้ pause อะไรไว้
        break;
    }
  };
  /* Countdown */
 useEffect(() => {
  if (!isCounting) return;
  if (countdown > 0) {
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  } else {
    setIsCounting(false);
    setIsPlaying(true);
    setIsPaused(false);
    startWorkoutTimersForCurrent(); // เริ่มจับเวลาเล่นท่า
  }
}, [isCounting, countdown]);


  /* Camera open/close */
  useEffect(() => {
    let mounted = true;
    const open = async () => {
      try {
        setCameraStatus("loading"); setCameraError("");
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (!mounted) return;
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        startDrawLoop(); setCameraStatus("active");
      } catch (err) {
        console.error("camera error:", err);
        if (mounted) { setCameraStatus("error"); setCameraError(err?.message || "ไม่สามารถเปิดกล้องได้"); }
      }
    };
    if (isPlaying && !isPaused) open(); else stopCamera();
    return () => { mounted = false; };
  }, [isPlaying, isPaused]);

  const startDrawLoop = () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    const draw = () => {
      if (!video || !canvas) return;
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }
      ctx.save(); ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };
    cancelAnimationFrame(rafRef.current || 0); rafRef.current = requestAnimationFrame(draw);
  };
  const stopCamera = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const s = streamRef.current;
    if (s) { s.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStatus("idle"); setCameraError("");
  };
  // === [ADD] Config API base ===
  const API_BASE = import.meta.env?.VITE_API_BASE_URL || ""; // ถ้า dev ใช้ proxy ไว้แล้ว ใช้ "" ได้

  // === [ADD] Session state ===
  const sessionIdRef = useRef(null);

  // === [ADD] ดึง uid ผู้ใช้ (ถ้าคุณมี Firebase Auth) ===
  // - ถ้าไฟล์นี้ยังไม่ได้ import ก็เพิ่ม: import { useUserAuth } from '../context/UserAuthContext';
  const { user } = (typeof useUserAuth === 'function' ? useUserAuth() : { user: null });
  const uid = user?.uid || "t8Enu17J6PSZUG5BC2M21UtinH52";

  // === [ADD] แปลง exercises ปัจจุบันเป็น snapshot ใช้ตอน start session ===
  function buildSnapshotFromExercises(list) {
    return (list || []).map((it, i) => ({
      exercise: it.exercise?._id || it._id || it.exercise, // รองรับหลายรูปแบบที่คุณเก็บ
      name: it.name,
      type: it.type,
      value: it.value ?? it.time ?? it.duration,
      order: i
    }));
  }

  // === [ADD] เริ่ม session ถ้ายังไม่มี (รองรับ 'program' | 'daily') ===
  async function startSessionIfNeeded(kind = "program") {
    if (sessionIdRef.current) return sessionIdRef.current;

    const snapshotExercises = buildSnapshotFromExercises(exercises);
    const body = {
      uid,
      origin: kind === "program" ? { kind: "program", programId } : { kind: "daily" },
      snapshot: {
        programName: program?.name,
        exercises: snapshotExercises
      },
      totalExercises: snapshotExercises.length
    };

    const res = await axios.post(`${API_BASE}/api/workout_sessions/start`, body);
    sessionIdRef.current = res.data?._id;
    return sessionIdRef.current;
  }

  // === [ADD] บันทึกผลของ “ท่าหนึ่ง” ===
  async function logExerciseResult({
    order,
    exerciseDoc,
    performedSeconds = 0,
    performedReps = 0,
    calories = 0,
    kind = "program" // หรือ 'daily' ถ้าหน้านี้คือโหมดรายวัน
  }) {
    const sessionId = await startSessionIfNeeded(kind);

    const targetType = exerciseDoc?.type;
    const targetValue = exerciseDoc?.value ?? exerciseDoc?.time ?? exerciseDoc?.duration;

    await axios.post(`${API_BASE}/api/workout_sessions/${sessionId}/log-exercise`, {
      uid,
      order,
      exerciseId: exerciseDoc?._id || exerciseDoc?.exercise,
      name: exerciseDoc?.name,
      target: { type: targetType, value: String(targetValue ?? "") },
      performed: { seconds: performedSeconds, reps: performedReps },
      calories
    });
  }

  // === [ADD] ปิด session (เมื่อครบโปรแกรม/จบการเล่น) ===
  async function finishSession() {
    if (!sessionIdRef.current) return null;
    const { data } = await axios.patch(
      `${API_BASE}/api/workout_sessions/${sessionIdRef.current}/finish`,
      {}
    );
    return data;
  }

  /* Workout timers */
  const clearProgressInterval = () => { if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; } };
  const clearAutoNextTimer = () => { if (autoNextTimerRef.current) { clearTimeout(autoNextTimerRef.current); autoNextTimerRef.current = null; } };
  const resetWorkoutTimers = () => { clearProgressInterval(); clearAutoNextTimer(); currentDurationMsRef.current = 0; remainingMsRef.current = 0; lastStartTsRef.current = 0; setExerciseProgress(0); setTimeRemaining(0); };

  const startWorkoutTimersForCurrent = () => {
    const cur = exercises[currentExercise]; if (!cur) return;
    const durationMs = parseDurationMs(cur); if (durationMs <= 0) return;
    currentDurationMsRef.current = durationMs; remainingMsRef.current = durationMs; lastStartTsRef.current = Date.now();

    clearProgressInterval();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastStartTsRef.current;
      const rem = Math.max(0, currentDurationMsRef.current - elapsed);
      remainingMsRef.current = rem;
      const progress = 100 - (rem / currentDurationMsRef.current) * 100;
      setExerciseProgress(progress); setTimeRemaining(Math.ceil(rem / 1000));
      if (rem <= 0) { clearProgressInterval(); onWorkoutEnded(); }
    }, 100);

    clearAutoNextTimer();
    autoNextTimerRef.current = setTimeout(() => { clearProgressInterval(); onWorkoutEnded(); }, remainingMsRef.current);
  };

  const pauseWorkoutTimers = () => { if (lastStartTsRef.current) { const elapsed = Date.now() - lastStartTsRef.current; remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed); } clearProgressInterval(); clearAutoNextTimer(); };
  const resumeWorkoutTimers = () => {
    if (remainingMsRef.current <= 0 || currentDurationMsRef.current <= 0) return;
    lastStartTsRef.current = Date.now();
    clearProgressInterval();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastStartTsRef.current;
      const rem = Math.max(0, remainingMsRef.current - elapsed);
      const total = currentDurationMsRef.current;
      setExerciseProgress(100 - (rem / total) * 100);
      setTimeRemaining(Math.ceil(rem / 1000));
      if (rem <= 0) { clearProgressInterval(); onWorkoutEnded(); }
    }, 100);
    clearAutoNextTimer();
    autoNextTimerRef.current = setTimeout(() => { clearProgressInterval(); onWorkoutEnded(); }, remainingMsRef.current);
  };

  /* Rest timers */
  const resetRestTimers = () => {
    if (restIntervalRef.current) { clearInterval(restIntervalRef.current); restIntervalRef.current = null; }
    if (restTimerRef.current) { clearTimeout(restTimerRef.current); restTimerRef.current = null; }
    restTotalMsRef.current = 0; restRemainingMsRef.current = 0; restLastStartTsRef.current = 0;
    setRestProgress(0); setRestRemaining(0);
  };
  const startRest = (nextIndex, baseSec = REST_BASE_SEC) => {
    setIsResting(true); setIsIntro(false); setIsCounting(false); setIsPlaying(false); setIsPaused(false);
    nextIndexRef.current = nextIndex;
    restTotalMsRef.current = Math.max(1, baseSec) * 1000;
    restRemainingMsRef.current = restTotalMsRef.current;
    restLastStartTsRef.current = Date.now();
    setRestProgress(0); setRestRemaining(Math.ceil(restRemainingMsRef.current / 1000));

    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    restIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - restLastStartTsRef.current;
      const rem = Math.max(0, restTotalMsRef.current - elapsed);
      restRemainingMsRef.current = rem;
      setRestProgress(100 - (rem / restTotalMsRef.current) * 100);
      setRestRemaining(Math.ceil(rem / 1000));
      if (rem <= 0) { clearInterval(restIntervalRef.current); endRest(); }
    }, 100);

    if (restTimerRef.current) clearTimeout(restTimerRef.current);
    restTimerRef.current = setTimeout(() => { if (restIntervalRef.current) clearInterval(restIntervalRef.current); endRest(); }, restRemainingMsRef.current);
  };
const pauseRestTimers = () => {
  if (restLastStartTsRef.current) {
    const elapsed = Date.now() - restLastStartTsRef.current;
    restRemainingMsRef.current = Math.max(0, restRemainingMsRef.current - elapsed);
  }
  if (restIntervalRef.current) { clearInterval(restIntervalRef.current); restIntervalRef.current = null; }
  if (restTimerRef.current) { clearTimeout(restTimerRef.current); restTimerRef.current = null; }
};
  const resumeRestTimers = () => {
  if (restRemainingMsRef.current <= 0) return;
  if (restRemainingMsRef.current < 2000) {
    restRemainingMsRef.current = 2000;
    setRestRemaining(Math.ceil(restRemainingMsRef.current / 1000));
  }
  restLastStartTsRef.current = Date.now();

  if (restIntervalRef.current) clearInterval(restIntervalRef.current);
  restIntervalRef.current = setInterval(() => {
    const elapsed = Date.now() - restLastStartTsRef.current;
    const rem = Math.max(0, restRemainingMsRef.current - elapsed);
    restRemainingMsRef.current = rem;
    setRestProgress(100 - (rem / restTotalMsRef.current) * 100);
    setRestRemaining(Math.ceil(rem / 1000));
    if (rem <= 0) { clearInterval(restIntervalRef.current); endRest(); }
  }, 100);

  if (restTimerRef.current) clearTimeout(restTimerRef.current);
  restTimerRef.current = setTimeout(() => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    endRest();
  }, restRemainingMsRef.current);
};

  const addRestSeconds = (sec = 10) => { restRemainingMsRef.current += sec * 1000; restTotalMsRef.current += sec * 1000; setRestRemaining(Math.ceil(restRemainingMsRef.current / 1000)); };
  const endRest = () => {
  resetRestTimers();
  setIsResting(false);
  setCurrentExercise(nextIndexRef.current ?? currentExercise + 1);
  setIsCounting(true);
  setCountdown(3);
};


  /* Intro timers */
  const resetIntroTimers = () => {
    if (introIntervalRef.current) { clearInterval(introIntervalRef.current); introIntervalRef.current = null; }
    if (introTimerRef.current) { clearTimeout(introTimerRef.current); introTimerRef.current = null; }
    introTotalMsRef.current = 0; introRemainingMsRef.current = 0; introLastStartTsRef.current = 0;
    setIntroProgress(0); setIntroRemaining(0);
  };
  const startIntro = (baseSec = INTRO_BASE_SEC) => {
  setIsIntro(true); setIsCounting(false); setIsPlaying(false); setIsResting(false); setIsPaused(false);
  stopCamera();

  introTotalMsRef.current = Math.max(1, baseSec) * 1000;
  introRemainingMsRef.current = introTotalMsRef.current;
  introLastStartTsRef.current = Date.now();
  setIntroProgress(0); 
  setIntroRemaining(Math.ceil(introRemainingMsRef.current / 1000));

  introIntervalRef.current = setInterval(() => {
    const elapsed = Date.now() - introLastStartTsRef.current;
    const rem = Math.max(0, introTotalMsRef.current - elapsed);
    introRemainingMsRef.current = rem;
    setIntroProgress(100 - (rem / introTotalMsRef.current) * 100);
    setIntroRemaining(Math.ceil(rem / 1000));
    if (rem <= 0) { clearInterval(introIntervalRef.current); endIntro(); }
  }, 100);

  introTimerRef.current = setTimeout(() => {
    if (introIntervalRef.current) clearInterval(introIntervalRef.current);
    endIntro();
  }, introRemainingMsRef.current);
};

 const pauseIntroTimers = () => {
  if (introLastStartTsRef.current) {
    const elapsed = Date.now() - introLastStartTsRef.current;
    introRemainingMsRef.current = Math.max(0, introRemainingMsRef.current - elapsed);
  }
  if (introIntervalRef.current) { clearInterval(introIntervalRef.current); introIntervalRef.current = null; }
  if (introTimerRef.current) { clearTimeout(introTimerRef.current); introTimerRef.current = null; }
};

  const resumeIntroTimers = () => {
  if (introRemainingMsRef.current <= 0) return;
  introLastStartTsRef.current = Date.now();
  if (introIntervalRef.current) clearInterval(introIntervalRef.current);
  introIntervalRef.current = setInterval(() => {
    const elapsed = Date.now() - introLastStartTsRef.current;
    const rem = Math.max(0, introRemainingMsRef.current - elapsed);
    introRemainingMsRef.current = rem;
    setIntroProgress(100 - (rem / introTotalMsRef.current) * 100);
    setIntroRemaining(Math.ceil(rem / 1000));
    if (rem <= 0) { clearInterval(introIntervalRef.current); endIntro(); }
  }, 100);
  if (introTimerRef.current) clearTimeout(introTimerRef.current);
  introTimerRef.current = setTimeout(() => {
    if (introIntervalRef.current) clearInterval(introIntervalRef.current);
    endIntro();
  }, introRemainingMsRef.current);
};
  const addIntroSeconds = (sec = 10) => { introRemainingMsRef.current += sec * 1000; introTotalMsRef.current += sec * 1000; setIntroRemaining(Math.ceil(introRemainingMsRef.current / 1000)); };
  const endIntro = () => {
  resetIntroTimers();
  setIsIntro(false);
  setIsCounting(true);
  setCountdown(3);
};

  /* End of one exercise */
  const onWorkoutEnded = async () => {
    //  1) บันทึกผลของท่าปัจจุบัน
    try {
      const cur = exercises[currentExercise];

      // คำนวณเวลาที่ทำจริง (วินาที) จากตัวจับเวลาใน component
      const totalMs = currentDurationMsRef.current || parseDurationMs(cur);
      const remainMs = Math.max(0, remainingMsRef.current || 0);
      const elapsedMs = Math.max(0, totalMs - remainMs);
      const performedSeconds = Math.round(elapsedMs / 1000);

      await logExerciseResult({
        order: currentExercise,
        exerciseDoc: cur,
        performedSeconds,
        performedReps: 0,   // ถ้ามีระบบนับ reps จริง ค่อยเสียบค่าจริง
        calories: 0,        // ถ้ามีสูตรคำนวณ สามารถใส่ได้
        kind: "program"     // หรือ 'daily' ถ้าหน้านี้เป็นรายวัน
      });
    } catch (e) {
      console.warn("logExercise failed", e);
    }

    //  2) ลอจิกเดิมของคุณ
    resetWorkoutTimers();
    stopCamera();
    setIsPlaying(false);
    setIsPaused(false);

    //  3) ไปท่าถัดไป หรือ ปิด session แล้วเด้งหน้า Result
    if (currentExercise < exercises.length - 1) {
      startRest(currentExercise + 1, REST_BASE_SEC);
    } else {
      setIsCounting(false);
      alert("🎉 เสร็จสิ้นการออกกำลังกายแล้ว!");

      try { await finishSession(); } catch (e) { console.warn("finishSession failed", e); }

      // ✅ ไปหน้า Summary หน้าเดียวหลังจากออกกำลังกายเสร็จ
      // WorkoutPlayer ใช้กับโปรแกรม -> ใช้ workoutType = 'program'
      // ถ้าในอนาคตมีหน้าเล่นแบบรายวัน ให้ส่ง 'daily' แทน
      const workoutType = 'program';
      window.location.assign(`/summary/${workoutType}/${uid}`);
    }

  };


  /* Navigation */
  const handleNext = () => {
    if (isIntro) {
      endIntro();
      return;
    }
    if (isResting) {
      endRest();
      return;
    }

    // กรณีผู้ใช้กด "ถัดไป" ตอนกำลังเล่นอยู่ => นับเป็น "ข้ามท่า"
    if (isPlaying) {
      try {
        const cur = exercises[currentExercise];
        // บังคับให้ elapsed = 0 โดยตั้ง remaining = total
        const totalMs = currentDurationMsRef.current || parseDurationMs(cur);
        currentDurationMsRef.current = totalMs;
        remainingMsRef.current = totalMs; // ทำให้ onWorkoutEnded() log performedSeconds = 0
      } catch (e) {
        // เงียบไว้ ไม่ให้กระทบ flow หลัก
      }
      onWorkoutEnded();
      return;
    }

    if (isCounting) {
  setIsCounting(false);
  setIsPlaying(true);
  startWorkoutTimersForCurrent();
  return;
}
  };
 const handlePrev = () => {
  stopCamera(); resetWorkoutTimers(); resetRestTimers(); resetIntroTimers();
  const prev = Math.max(0, currentExercise - 1);
  setCurrentExercise(prev);
  setIsPaused(false); setIsResting(false); setIsPlaying(false); setIsCounting(false);
  if (prev === 0) { setIsIntro(true); startIntro(INTRO_BASE_SEC); }
  else { setIsCounting(true); setCountdown(3); }
};
  const togglePause = () => {
    if (isIntro) { if (!isPaused) { pauseIntroTimers(); setIsPaused(true); } else { setIsPaused(false); setTimeout(() => resumeIntroTimers(), 50); } return; }
    if (isResting) { if (!isPaused) { pauseRestTimers(); setIsPaused(true); } else { setIsPaused(false); setTimeout(() => resumeRestTimers(), 50); } return; }
    if (isPlaying) { if (!isPaused) { pauseWorkoutTimers(); setIsPaused(true); } else { setIsPaused(false); setTimeout(() => resumeWorkoutTimers(), 50); } }
  };

  const guideKey = React.useMemo(() => `hasSeenGuide:${programId}`, [programId]);

  const handleAcceptGuide = async () => {
    localStorage.setItem(guideKey, "true");
    setShowGuide(false);
    setGuideMode("peek");

    // ✅ เริ่ม session ตั้งแต่ผู้ใช้กดเริ่ม
    try { await startSessionIfNeeded("program"); } catch (e) { console.warn("startSession failed", e); }

    if (!isIntro && !isCounting && !isPlaying && !isResting) {
      setIsIntro(true);
      startIntro(INTRO_BASE_SEC);
    }
  };

  // useEffect(() => {
  //   const seen = !!localStorage.getItem(guideKey);
  //   setShowGuide(!seen);
  //   setGuideMode(seen ? "peek" : "gate");
  // }, [guideKey]);

  /* Render */
  if (isLoading) {
    return (
      <div className="wp-loading-screen">
        <div className="wp-loading-content">
          <div className="wp-spinner">
            <div className="wp-spinner-ring"></div>
            <div className="wp-spinner-ring"></div>
            <div className="wp-spinner-ring"></div>
          </div>
          <div className="wp-loading-title">กำลังโหลดโปรแกรม...</div>
          <div className="wp-loading-subtitle">เตรียมกล้องและพื้นที่ให้พร้อมนะครับ</div>
        </div>
        <div className="wp-loading-bg">
          <div className="wp-loading-shape wp-loading-shape-1"></div>
          <div className="wp-loading-shape wp-loading-shape-2"></div>
          <div className="wp-loading-shape wp-loading-shape-3"></div>
        </div>
      </div>
    );
  }

  if (!program || exercises.length === 0) {
    return (
      <div className="wp-error-screen">
        <div className="wp-error-content">
          <div className="wp-error-icon">⚠️</div>
          <h2>ไม่พบข้อมูลโปรแกรมหรือท่าออกกำลังกาย</h2>
          {loadError && <p>{String(loadError.message || "")}</p>}
        </div>
      </div>
    );
  }

  const current = exercises[currentExercise];
  const nextEx = currentExercise < exercises.length - 1 ? exercises[currentExercise + 1] : null;
  const overallProgress = ((currentExercise + exerciseProgress / 100) / exercises.length) * 100;

  return (
    <div className="wp-container">
      {/* Guide Overlay */}
      {showGuide && (
        <CameraGuide
          mode={guideMode}                  // 'gate' | 'peek'
          images={[guideImg, guideImg2]}
          onAccept={handleAcceptGuide}      // ปุ่ม “ฉันเข้าใจแล้ว เริ่มเลย” ใช้เฉพาะ gate
          onClose={handleCloseGuide}        // กากบาทในโหมด peek
        />
      )}


      {/* Header */}
      <header className="wp-header">
        <div className="wp-header-content">
          <button className="wp-back-btn" onClick={() => window.history.back()} aria-label="ย้อนกลับ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="wp-header-info">
            <h1 className="wp-program-title">{program.name}</h1>
            <div className="wp-progress-info">
              <span className="wp-exercise-counter">{currentExercise + 1}/{exercises.length}</span>
              <div className="wp-overall-progress">
                <div className="wp-overall-progress-fill" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>
          </div>
          {/* <button
            className={`wp-sound-btn ${voiceEnabled ? "active" : ""}`}
            onClick={() => { setVoiceEnabled((v) => { const nv = !v; if (!nv) cancelSpeech(); return nv; }); }}
            title={voiceEnabled ? "ปิดเสียง" : "เปิดเสียง"}
            aria-label={voiceEnabled ? "ปิดเสียง" : "เปิดเสียง"}
          >
            {voiceEnabled ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button> */}
          <button
            className="wp-sound-btn"
            onClick={openGuidePeek}
            title="เปิดไกด์การตั้งกล้อง"
            aria-label="เปิดไกด์การตั้งกล้อง"
          >
            {/* help-circle icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.236c-.9.41-1.5 1.08-1.5 1.764V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="17" r="1" fill="currentColor" />
            </svg>
          </button>

        </div>
      </header>

      {/* Intro */}
      {isIntro && (
        <main className="wp-main">
          <div className="wp-exercise-header">
            <h2 className="wp-current-exercise-name">เตรียมตัวท่าแรก: {exercises[0]?.name}</h2>
            <div className="wp-exercise-stats">
              <div className="wp-time-remaining">
                <span className="wp-time-number">{introRemaining}</span>
                <span className="wp-time-unit">วินาที</span>
              </div>
              <ProgressRing progress={introProgress} />
            </div>
          </div>

          <div className="wp-media-container">
            <video
              key={exercises[0]?.video || exercises[0]?.imageUrl}
              className="wp-media"
              src={exercises[0]?.video || undefined}
              poster={exercises[0]?.imageUrl || undefined}
              autoPlay
              muted
              playsInline
              loop
              preload="metadata"
            />
            <div className="wp-overlay-hint">
              <small>ตัวอย่างท่า: {exercises[0]?.name}</small>
            </div>
          </div>


          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
            <button className="wp-btn wp-btn-primary" onClick={() => addIntroSeconds(10)}>เพิ่มเวลา +10 วิ</button>
          </div>

          {isPaused && isResting && !showGuide && (
            <div
              className="wp-overlay wp-overlay--dark"
              role="button"
              tabIndex={0}
              onClick={safeResumeFromOverlay}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); safeResumeFromOverlay(); }
              }}
            >
              <div className="wp-overlay-card">
                <div className="wp-overlay-name">หยุดชั่วคราว</div>
                <div className="wp-overlay-hint" style={{ position: "static" }}>กด “เล่น” เพื่อทำต่อ</div>
              </div>
            </div>
          )}

        </main>
      )}

      {/* Countdown */}
      {isCounting && (
        <div className="wp-countdown-overlay">
          <div className="wp-countdown-content">
            <h2 className="wp-exercise-name">{current?.name}</h2>
            <div className="wp-countdown-circle">
              <div key={countdown} className="wp-countdown-number">{countdown}</div>
            </div>
            <p className="wp-countdown-text">เตรียมพร้อม...</p>
            <div className="wp-countdown-dots"><div className="wp-dot"></div><div className="wp-dot"></div><div className="wp-dot"></div></div>
          </div>
        </div>
      )}

      {/* Workout (เปิดกล้อง) */}
      {isPlaying && (
        <main className="wp-main">
          <div className="wp-exercise-header">
            <h2 className="wp-current-exercise-name">{current?.name}</h2>
            <div className="wp-exercise-stats">
              <div className="wp-time-remaining">
                <span className="wp-time-number">{timeRemaining}</span>
                <span className="wp-time-unit">วินาที</span>
              </div>
              <ProgressRing progress={exerciseProgress} />
            </div>
          </div>

          <div className="wp-media-container">
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas ref={canvasRef} className="wp-media" />

            {cameraStatus === "loading" && (
              <div className="wp-overlay wp-overlay--muted">
                <div className="wp-overlay-card"><div className="wp-overlay-name">กำลังเปิดกล้อง…</div></div>
              </div>
            )}
            {cameraStatus === "error" && (
              <div className="wp-overlay wp-overlay--error">
                <div className="wp-overlay-card">
                  <div className="wp-overlay-name">ไม่สามารถเปิดกล้องได้</div>
                  <div className="wp-overlay-hint" style={{ position: "static" }}>
                    {cameraError || "กรุณาอนุญาตการใช้กล้อง และเปิดผ่าน HTTPS หรือ localhost"}
                  </div>
                </div>
              </div>
            )}

            {isPaused && isResting && !showGuide && (
              <div
                className="wp-overlay wp-overlay--dark"
                role="button"
                tabIndex={0}
                onClick={safeResumeFromOverlay}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); safeResumeFromOverlay(); }
                }}
              >
                <div className="wp-overlay-card">
                  <div className="wp-overlay-name">หยุดชั่วคราว</div>
                  <div className="wp-overlay-hint" style={{ position: "static" }}>กด “เล่น” เพื่อทำต่อ</div>
                </div>
              </div>
            )}

          </div>
        </main>
      )}

      {/* Rest */}
      {isResting && nextEx && (
        <main className="wp-main">
          <div className="wp-exercise-header">
            <h2 className="wp-current-exercise-name">พักระหว่างท่า</h2>
            <div className="wp-exercise-stats">
              <div className="wp-time-remaining">
                <span className="wp-time-number">{restRemaining}</span>
                <span className="wp-time-unit">วินาที</span>
              </div>
              <ProgressRing progress={restProgress} />
            </div>
          </div>

          <div className="wp-media-container">
            <video
              key={nextEx?.video || nextEx?.imageUrl}
              className="wp-media"
              src={nextEx?.video || undefined}
              poster={nextEx?.imageUrl || undefined}
              autoPlay
              muted
              playsInline
              loop
              preload="metadata"
            />
            <div className="wp-overlay-hint">
              <small>ตัวอย่างท่าถัดไป: {nextEx?.name}</small>
            </div>
          </div>


          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
            <button className="wp-btn wp-btn-primary" onClick={() => addRestSeconds(10)}>เพิ่มเวลาพัก +10 วิ</button>
          </div>

          {isPaused && !showGuide && (
            <div className="wp-overlay wp-overlay--dark">
              <div className="wp-overlay-card">
                <div className="wp-overlay-name">หยุดชั่วคราว</div>
                <div className="wp-overlay-hint" style={{ position: "static" }}>กด “เล่น” เพื่อทำต่อ</div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* Controls */}
      <footer className="wp-controls">
        <button className="wp-control-btn wp-control-btn-secondary" onClick={handlePrev} disabled={currentExercise === 0 && !isIntro}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <polygon points="19 20 9 12 19 4 19 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>ก่อนหน้า</span>
        </button>

        {(isIntro || isResting || isPlaying) && (
          <button
            className={`wp-control-btn ${isPaused ? "wp-control-btn-play" : "wp-control-btn-pause"}`}
            onMouseDown={(e) => e.stopPropagation()}   // กันคลิก bubble ตอนกดเมาส์
            onClick={(e) => {
              e.stopPropagation();                     // กัน bubble ตอน click ด้วย
              togglePause();
            }}
          >
            {isPaused ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <polygon
                  points="5 3 19 12 5 21 5 3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect
                  x="6"
                  y="4"
                  width="4"
                  height="16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect
                  x="14"
                  y="4"
                  width="4"
                  height="16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <span>{isPaused ? "เล่น" : "หยุด"}</span>
          </button>

        )}

        <button className="wp-control-btn wp-control-btn-primary" onClick={handleNext}>
          <span>{isIntro ? "ข้าม Intro" : isResting ? "ข้ามพัก" : isCounting ? "เริ่มเลย" : isPlaying ? "จบท่านี้" : "ถัดไป"}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <polygon points="5 4 15 12 5 20 5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </footer>
    </div>
  );
}
