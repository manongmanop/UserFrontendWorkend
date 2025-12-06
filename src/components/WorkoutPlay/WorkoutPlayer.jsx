import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import "./WorkoutPlayer.css";
import guideImg from "../assets/Infographic.png";
import guideImg2 from "../assets/Infographic2.png";

/* =========================================
   SECTION 1: Helpers & Utilities
   ========================================= */
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

/* =========================================
   SECTION 2: UI Sub-Components
   ========================================= */
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
      <div className="guide-overlay" role="dialog" aria-modal="true">
        <div className="guide-card">
          <div className="guide-header">
            <h2 className="guide-title">คำแนะนำในการตั้งกล้องก่อนเริ่ม</h2>
            <p className="guide-subtitle">วางกล้องระดับเอว–หน้าอก มุมมองด้านข้าง ให้เห็นเต็มตัว</p>
            {mode === "peek" && <button type="button" className="guide-close-btn" onClick={onClose}>×</button>}
          </div>
          <div className="guide-body">
            {safeImages.length > 0 && (
              <div className="guide-gallery">
                <div className="guide-main">
                  <img className="guide-image" src={safeImages[idx]} alt={`Guide ${idx + 1}`} onClick={() => setPreview(idx)} onError={(e) => e.currentTarget.style.display = "none"} />
                  {hasMany && <><button className="guide-nav guide-nav--left" onClick={() => go(-1)}>‹</button><button className="guide-nav guide-nav--right" onClick={() => go(1)}>›</button></>}
                </div>
                {hasMany && <div className="guide-thumbs">{safeImages.map((src, i) => (<button key={i} className={`guide-thumb ${i === idx ? "is-active" : ""}`} onClick={() => setIdx(i)}><img src={src} alt="" /></button>))}</div>}
              </div>
            )}
            <div className="guide-checklist">
              <div className="guide-item"><div className="guide-icon">📷</div><div><div className="guide-text"><b>ตั้งกล้องกึ่งกลางลำตัวด้านข้าง</b></div><div className="guide-sub">ห่าง 2–3 เมตร เพื่อเก็บเต็มตัว</div></div></div>
              <div className="guide-item"><div className="guide-icon">💡</div><div><div className="guide-text">แสงสว่างพอ</div><div className="guide-sub">ฉากหลังโล่ง เสื้อผ้าตัดกับฉากหลัง</div></div></div>
            </div>
          </div>
          {mode === "gate" && <div className="guide-actions"><button type="button" className="guide-accept-btn" onClick={onAccept}>ฉันเข้าใจแล้ว เริ่มเลย</button></div>}
        </div>
      </div>
      {preview != null && (
        <div className="lightbox" onClick={() => setPreview(null)}>
          <img src={safeImages[preview]} alt="" className="lightbox-img" />
        </div>
      )}
    </>
  );
}

/* =========================================
   SECTION 3: Main Component
   ========================================= */
export default function WorkoutPlayer() {
  const { programId } = useParams();

  // --- Constants ---
  const REST_BASE_SEC = 20;
  const REST_MAX_SEC = 150;
  const API_BASE = import.meta.env?.VITE_API_BASE_URL || "";

  // --- State: Data & Status ---
  const [program, setProgram] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // --- State: Guide & Flow ---
  const [showGuide, setShowGuide] = useState(true);
  const [guideMode, setGuideMode] = useState("gate");
  const pausedPhaseRef = useRef(null);
  const overlayResumeArmedRef = useRef(false);

  // --- State: Workout Progress ---
  const [currentExercise, setCurrentExercise] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Phase Flags
  const [isCounting, setIsCounting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isResting, setIsResting] = useState(false);

  const [countdownAction, setCountdownAction] = useState("startNew");
  // --- State: Timers (Progress & Countdown) ---
  const [countdown, setCountdown] = useState(3);
  const [exerciseProgress, setExerciseProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [restProgress, setRestProgress] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);

  // --- State: Camera ---
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [cameraError, setCameraError] = useState("");

  // --- Refs ---
  const progressIntervalRef = useRef(null);
  const autoNextTimerRef = useRef(null);
  const currentDurationMsRef = useRef(0);
  const remainingMsRef = useRef(0);
  const lastStartTsRef = useRef(0);

  const restIntervalRef = useRef(null);
  const restTimerRef = useRef(null);
  const restTotalMsRef = useRef(0);
  const restRemainingMsRef = useRef(0);
  const restLastStartTsRef = useRef(0);
  const nextIndexRef = useRef(null);
  const overallProgressFillRef = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const sessionIdRef = useRef(null);
  const exerciseVideoRef = useRef(null);

  // --- Auth ---
  const { user } = (typeof useUserAuth === 'function' ? useUserAuth() : { user: null });
  const uid = user?.uid || "t8Enu17J6PSZUG5BC2M21UtinH52";

  /* =========================================
     SECTION 4: Effects (Data, Camera, Resume)
     ========================================= */

  // Load Program Data
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
        // Initial Reset
        setCurrentExercise(0);
        stopCamera();
        resetAllTimers();
        setIsPaused(false); setIsResting(false); setIsPlaying(false); setIsCounting(false);
        // --- Do NOT start rest phase or session here ---
        // Wait for user to click "ฉันเข้าใจแล้ว เริ่มเลย"
      } catch (e) {
        if (ignore) return;
        setLoadError({ where: "program", message: e?.message || "Failed to load" });
      } finally {
        if (!ignore) setIsLoading(false);
      }
    })();
    return () => {
      ignore = true;
      stopCamera();
      resetAllTimers();
    };
  }, [programId]);

  // Prevent accidental resume on overlay click
  useEffect(() => {
    if (isPaused && isResting && !showGuide) {
      overlayResumeArmedRef.current = false;
      const t = setTimeout(() => { overlayResumeArmedRef.current = true; }, 180);
      return () => clearTimeout(t);
    }
  }, [isPaused, isResting, showGuide]);

  // Camera Management
  useEffect(() => {
    let mounted = true;
    const openCamera = async () => {
      try {
        setCameraStatus("loading"); setCameraError("");
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (!mounted) return;
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        startDrawLoop(); setCameraStatus("active");
      } catch (err) {
        if (mounted) { setCameraStatus("error"); setCameraError(err?.message || "Camera failed"); }
      }
    };

    if (isPlaying && !isPaused) openCamera();
    else stopCamera();

    return () => { mounted = false; };
  }, [isPlaying, isPaused]);

  // Countdown Logic
  useEffect(() => {
  if (!isCounting) return;

  if (countdown > 0) {
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  } else {
    // countdown = 0
    setIsCounting(false);
    setIsPaused(false);

    if (countdownAction === "startNew") {
      setIsPlaying(true);
      startWorkoutTimersForCurrent();
    } else if (countdownAction === "resumeWorkout") {
      setIsPlaying(true);
      resumeWorkoutTimers();
    } else if (countdownAction === "resumeRest") {
      setIsResting(true);
      resumeRestTimers();
    }
  }
}, [isCounting, countdown, countdownAction]);


  useEffect(() => {
    const videoEl = exerciseVideoRef.current;
    if (!videoEl) return;

    if (isPaused) {
      videoEl.pause(); // สั่งหยุด
    } else {
      // สั่งเล่นต่อ (ใช้ catch เพื่อกัน Error กรณีเปลี่ยนท่าเร็วๆ)
      videoEl.play().catch(() => { });
    }
  }, [isPaused]);

  /* =========================================
     SECTION 5: Logic & Timers
     ========================================= */

  const resetAllTimers = () => {
    resetWorkoutTimers();
    resetRestTimers();
  };

  // --- Session & API ---
  function buildSnapshotFromExercises(list) {
    return (list || []).map((it, i) => ({
      exercise: it.exercise?._id || it._id || it.exercise,
      name: it.name,
      type: it.type,
      value: it.value ?? it.time ?? it.duration,
      order: i
    }));
  }

  async function startSessionIfNeeded(kind = "program") {
    if (sessionIdRef.current) return sessionIdRef.current;
    const snapshotExercises = buildSnapshotFromExercises(exercises);
    const body = {
      uid,
      origin: { kind: "program", programId },
      snapshot: { programName: program?.name, exercises: snapshotExercises.map(x => String(x.exercise)) },
      totalExercises: snapshotExercises.length
    };
    const res = await axios.post(`${API_BASE}/api/workout_sessions/start`, body);
    sessionIdRef.current = res.data?._id;
    return sessionIdRef.current;
  }

  async function logExerciseResult({ order, exerciseDoc, performedSeconds = 0 }) {
    const sessionId = await startSessionIfNeeded("program");
    const targetType = exerciseDoc?.type;
    const targetValue = exerciseDoc?.value ?? exerciseDoc?.time ?? exerciseDoc?.duration;

    await axios.post(`${API_BASE}/api/workout_sessions/${sessionId}/log-exercise`, {
      uid, order,
      exerciseId: exerciseDoc?._id || exerciseDoc?.exercise,
      name: exerciseDoc?.name,
      target: { type: targetType, value: String(targetValue ?? "") },
      performed: { seconds: performedSeconds, reps: 0 },
      calories: 0
    });
  }

  async function finishSession() {
    if (!sessionIdRef.current) return;
    await axios.patch(`${API_BASE}/api/workout_sessions/${sessionIdRef.current}/finish`, {});
  }

  // --- Workout Logic ---
  const resetWorkoutTimers = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    progressIntervalRef.current = null; autoNextTimerRef.current = null;
    currentDurationMsRef.current = 0; remainingMsRef.current = 0;
    setExerciseProgress(0); setTimeRemaining(0);
  };

  const startWorkoutTimersForCurrent = () => {
    const cur = exercises[currentExercise]; if (!cur) return;
    const durationMs = parseDurationMs(cur);
    if (durationMs <= 0) { onWorkoutEnded(); return; }

    currentDurationMsRef.current = durationMs;
    remainingMsRef.current = durationMs;
    resumeWorkoutTimers();
  };

  const pauseWorkoutTimers = () => {
    // 1. หยุด Loop การนับเวลา
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    progressIntervalRef.current = null; autoNextTimerRef.current = null;

    // if (lastStartTsRef.current) {
    //   const elapsed = Date.now() - lastStartTsRef.current;
    //   remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
    //   updateWorkoutUI(remainingMsRef.current);
    // }
    stopCamera();
  };

  const resumeWorkoutTimers = () => {
    if (remainingMsRef.current <= 0) return;
    lastStartTsRef.current = Date.now();
    const resumeFromMs = remainingMsRef.current;

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastStartTsRef.current;
      const rem = Math.max(0, resumeFromMs - elapsed);
      remainingMsRef.current = rem;
      updateWorkoutUI(rem);
      if (rem <= 0) { clearInterval(progressIntervalRef.current); onWorkoutEnded(); }
    }, 100);

    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    autoNextTimerRef.current = setTimeout(() => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      remainingMsRef.current = 0;
      onWorkoutEnded();
    }, resumeFromMs);
  };

  const updateWorkoutUI = (ms) => {
    setExerciseProgress(100 - (ms / currentDurationMsRef.current) * 100);
    setTimeRemaining(Math.ceil(ms / 1000));
  };

  const onWorkoutEnded = async () => {
    try {
      const cur = exercises[currentExercise];
      const totalMs = currentDurationMsRef.current || parseDurationMs(cur);
      const remainMs = Math.max(0, remainingMsRef.current || 0);
      const performedSeconds = Math.round((totalMs - remainMs) / 1000);

      await logExerciseResult({ order: currentExercise, exerciseDoc: cur, performedSeconds });
    } catch (e) { console.warn("Log failed", e); }

    resetWorkoutTimers();
    stopCamera();
    setIsPlaying(false); setIsPaused(false);

    if (currentExercise < exercises.length - 1) {
      startRest(currentExercise + 1, REST_BASE_SEC);
    } else {
      setIsCounting(false);
      alert("🎉 เสร็จสิ้นการออกกำลังกายแล้ว!");
      try { await finishSession(); } catch (e) { }
      window.location.assign(`/summary/program/${uid}`);
    }
  };

  // --- Rest Logic ---
  const resetRestTimers = () => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    if (restTimerRef.current) clearTimeout(restTimerRef.current);
    restIntervalRef.current = null; restTimerRef.current = null;
    restTotalMsRef.current = 0; restRemainingMsRef.current = 0;
    setRestProgress(0); setRestRemaining(0);
  };

  const startRest = (nextIndex, baseSec = REST_BASE_SEC) => {
    setIsResting(true); setIsCounting(false); setIsPlaying(false); setIsPaused(false);
    nextIndexRef.current = nextIndex;
    const initialMs = Math.min(Math.max(1, baseSec), REST_MAX_SEC) * 1000;
    restTotalMsRef.current = initialMs;
    restRemainingMsRef.current = initialMs;
    resumeRestTimers();
  };

  const pauseRestTimers = () => {
    // 1. หยุด Loop การนับเวลา
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    if (restTimerRef.current) clearTimeout(restTimerRef.current);
    restIntervalRef.current = null; restTimerRef.current = null;

    // if (restLastStartTsRef.current) {
    //   const elapsed = Date.now() - restLastStartTsRef.current;
    //   restRemainingMsRef.current = Math.max(0, restRemainingMsRef.current - elapsed);
    //   updateRestUI(restRemainingMsRef.current);
    // }
    stopCamera();
  };

  const resumeRestTimers = () => {
    if (restRemainingMsRef.current <= 0) return;
    if (restRemainingMsRef.current < 2000) {
      restRemainingMsRef.current = 2000;
      setRestRemaining(2);
    }

    restLastStartTsRef.current = Date.now();
    const resumeFromMs = restRemainingMsRef.current;

    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    restIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - restLastStartTsRef.current;
      const rem = Math.max(0, resumeFromMs - elapsed);
      restRemainingMsRef.current = rem;
      updateRestUI(rem);
      if (rem <= 0) { clearInterval(restIntervalRef.current); endRest(); }
    }, 100);

    if (restTimerRef.current) clearTimeout(restTimerRef.current);
    restTimerRef.current = setTimeout(() => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
      endRest();
    }, resumeFromMs);
  };

  const updateRestUI = (ms) => {
    setRestProgress(100 - (ms / restTotalMsRef.current) * 100);
    setRestRemaining(Math.ceil(ms / 1000));
  };

  const addRestSeconds = (sec = 10) => {
    const REST_MAX_MS = REST_MAX_SEC * 1000;
    const deltaMs = Math.max(0, sec) * 1000;

    const nextRemaining = Math.min(REST_MAX_MS, Math.max(0, restRemainingMsRef.current) + deltaMs);
    const nextTotal = Math.min(REST_MAX_MS, Math.max(nextRemaining, Math.max(0, restTotalMsRef.current) + deltaMs));
    restRemainingMsRef.current = nextRemaining;
    restTotalMsRef.current = nextTotal;

    // Re-arm timers to reflect the new duration
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    if (restTimerRef.current) clearTimeout(restTimerRef.current);
    restIntervalRef.current = null; restTimerRef.current = null;

    updateRestUI(restRemainingMsRef.current);
    if (!isPaused && isResting) {
      resumeRestTimers();
    }
  };

  const endRest = () => {
  resetRestTimers();
  setIsResting(false);
  setIsPaused(false);
  const nextIdx = nextIndexRef.current;
  if (nextIdx != null && nextIdx < exercises.length) {
    setCurrentExercise(nextIdx);
    setCountdownAction("startNew");   // ✅ เริ่มท่าใหม่
    setIsCounting(true);
    setCountdown(3);
  } else {
    onWorkoutEnded();
  }
};

  // --- Interaction Handlers ---
  const togglePause = () => {
  if (isResting) {
    // ช่วงพัก: pause / resume ตามปกติ (ไม่ต้องขึ้น 3-2-1 ก็ได้)
    if (isPaused) {
      resumeRestTimers();
      setIsPaused(false);
    } else {
      pauseRestTimers();
      setIsPaused(true);
    }
  } else if (isPlaying) {
    if (isPaused) {
      // ✅ RESUME จาก pause ระหว่างเล่นท่า
      // แทนที่จะ resume ทันที → ขึ้น 3-2-1 ก่อน
      setCountdown(3);
      setCountdownAction("resumeWorkout");
      setIsCounting(true);
    } else {
      // กดหยุด
      pauseWorkoutTimers();
      setIsPaused(true);
    }
  }
};


  const safeResumeFromOverlay = () => {
    if (overlayResumeArmedRef.current) togglePause();
  };

  const handleNext = () => {
  if (isResting) {
    endRest();
    return;
  }

  if (isCounting) {
    // กำลัง 3-2-1 อยู่ แล้วผู้ใช้กด "เริ่มเลย"
    setIsCounting(false);
    setIsPaused(false);

    if (countdownAction === "startNew") {
      setIsPlaying(true);
      startWorkoutTimersForCurrent();
    } else if (countdownAction === "resumeWorkout") {
      setIsPlaying(true);
      resumeWorkoutTimers();
    } else if (countdownAction === "resumeRest") {
      setIsResting(true);
      resumeRestTimers();
    }
    return;
  }

  if (isPlaying) {
    // Force finish current
    currentDurationMsRef.current = currentDurationMsRef.current || 1;
    remainingMsRef.current = currentDurationMsRef.current;
    onWorkoutEnded();
    return;
  }
};


  const handlePrev = () => {
  stopCamera();
  resetAllTimers();
  const prev = Math.max(0, currentExercise - 1);
  setCurrentExercise(prev);
  setIsPaused(false);
  setIsResting(false);
  setIsPlaying(false);
  setIsCounting(false);

  if (prev === 0) {
    setIsResting(true);
    startRest(0, REST_BASE_SEC);
  } else {
    setCountdownAction("startNew");   // ✅ เริ่มท่าใหม่
    setIsCounting(true);
    setCountdown(3);
  }
};

  const handleAcceptGuide = async () => {
    const key = `hasSeenGuide:${programId}`;
    localStorage.setItem(key, "true");
    setShowGuide(false); setGuideMode("peek");
    try { await startSessionIfNeeded("program"); } catch (e) { }
    // Start initial rest phase ONLY after user confirms
    if (exercises.length > 0) {
      setCurrentExercise(0);
      setIsResting(true);
      setIsPlaying(false);
      setIsCounting(false);
      setIsPaused(false);
      startRest(0, REST_BASE_SEC);
    }
  };

  const handleCloseGuide = () => {
    setShowGuide(false);
    if (guideMode !== "peek") return;
    const phase = pausedPhaseRef.current;
    pausedPhaseRef.current = null;
    setIsPaused(false);
    if (phase === "rest") resumeRestTimers();
    if (phase === "play") resumeWorkoutTimers();
    if (phase === "countdown") setIsCounting(true);
  };

  const openGuidePeek = () => {
    setShowGuide(true); setGuideMode("peek"); pausedPhaseRef.current = null;
    if (isResting && !isPaused) { pauseRestTimers(); setIsPaused(true); pausedPhaseRef.current = "rest"; }
    else if (isPlaying && !isPaused) { pauseWorkoutTimers(); setIsPaused(true); pausedPhaseRef.current = "play"; }
    else if (isCounting) { setIsCounting(false); pausedPhaseRef.current = "countdown"; }
  };

  const startDrawLoop = () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return; // Note: Canvas ref is unused in render currently but kept for future logic
    // ... logic for drawing ...
  };

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStatus("idle");
  };

  /* =========================================
     SECTION 6: Render Components (In-file)
     ========================================= */

  if (isLoading) return <LoadingScreen />;
  if (!program || exercises.length === 0) return <ErrorScreen error={loadError} />;

  const current = exercises[currentExercise];
  const nextEx = currentExercise < exercises.length - 1 ? exercises[currentExercise + 1] : null;
  const overallProgress = ((currentExercise + exerciseProgress / 100) / exercises.length) * 100;

  // -- Render Helpers --
  const renderOverlay = () => (
    isPaused && isResting && !showGuide && (
      <div
        className="wp-overlay wp-overlay--dark"
        role="button"
        tabIndex={0}
        onClick={safeResumeFromOverlay} // คลิกพื้นที่ว่างก็เล่นต่อได้
      >
        <div className="wp-overlay-card" onClick={(e) => e.stopPropagation()}>
          {/* ^ e.stopPropagation() เพื่อไม่ให้คลิกที่การ์ดแล้วไปซ้อนกับคลิกพื้นหลัง */}
          <div className="wp-overlay-name">หยุดชั่วคราว</div>
          <button
            className="wp-overlay-play-btn"
            onClick={togglePause}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 4 }}>
              <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
            </svg>
          </button>
          <div className="wp-overlay-hint">กดปุ่มเพื่อเล่นต่อ</div>
        </div>
      </div>
    )
  );

  return (
    <div className="wp-container">
      {showGuide && <CameraGuide mode={guideMode} images={[guideImg, guideImg2]} onAccept={handleAcceptGuide} onClose={handleCloseGuide} />}

      <Header
        title={program.name}
        current={currentExercise + 1}
        total={exercises.length}
        progress={overallProgress}
        onBack={() => window.history.back()}
        onGuide={openGuidePeek}
      />

      {isCounting && (
        <div className="wp-countdown-overlay">
          <div className="wp-countdown-content">
            <h2 className="wp-exercise-name">{current?.name}</h2>
            <div className="wp-countdown-circle"><div key={countdown} className="wp-countdown-number">{countdown}</div></div>
            <p className="wp-countdown-text">เตรียมพร้อม...</p>
          </div>
        </div>
      )}

      {isPlaying && (
        <main className="wp-main">
          <div className="wp-exercise-header" style={{ marginTop: 32 }}>
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {current?.video || current?.imageUrl ?
                <video className="wp-exercise-video" src={current?.video} poster={current?.imageUrl} autoPlay muted playsInline loop/> :
                <div style={{ width: 400, height: 240, background: '#eee', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span>ไม่มีวิดีโอ</span></div>
              }
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: '100%',
                  maxWidth: 1000,
                  borderRadius: 12,
                  transform: 'scaleX(-1)'
                }}
              />
              {/* <video ref={exerciseVideoRef} className="hidden" playsInline muted width="640" height="480" /> */}
            </div>
            {cameraStatus === "loading" && <div className="wp-overlay wp-overlay--muted"><div className="wp-overlay-card">กำลังเตรียมกล้อง...</div></div>}
            {cameraStatus === "error" && <div className="wp-overlay wp-overlay--error"><div className="wp-overlay-card">เปิดกล้องไม่สำเร็จ</div></div>}
            {/* {renderOverlay()} */}
          </div>
        </main>
      )}

      {isResting && exercises[nextIndexRef.current ?? 0] && (
        <main className="wp-main">
          <div className="wp-scroll-area">
            <div className="wp-exercise-header">
              <h2 className="wp-current-exercise-name">{exercises[nextIndexRef.current]?.name}</h2>
              <div className="wp-exercise-stats">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="wp-time-remaining">
                    <span className="wp-time-number">{restRemaining}</span>
                    <span className="wp-time-unit">วินาที</span>
                  </div>
                  <button className="wp-btn wp-btn-primary" onClick={() => addRestSeconds(10)}>+10 วินาที</button>
                </div>
                <ProgressRing progress={restProgress} />
              </div>
            </div>

            <div className="wp-media-container">
              <video
                className="wp-media"
                src={exercises[nextIndexRef.current]?.video}
                poster={exercises[nextIndexRef.current]?.imageUrl}
                autoPlay muted playsInline loop
              />
            </div>
            {/* {isPaused && !showGuide && (
              <div className="wp-overlay wp-overlay--dark"
                role="button"
                tabIndex={0}
                onClick={safeResumeFromOverlay}
              >
                <div className="wp-overlay-card" onClick={(e) => e.stopPropagation()}>
                  <div className="wp-overlay-name">วินาทีวินาที</div>
                  <button
                    className="wp-overlay-play-btn"
                    onClick={togglePause}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                    </svg>
                    <span>วินาที?</span>
                  </button>

                </div>
              </div>
            )} */}
          </div>
        </main>
      )}

      <Controls
        onPrev={handlePrev}
        onNext={handleNext}
        onTogglePause={togglePause}
        isPaused={isPaused}
        canPrev={currentExercise > 0}
        mainButtonLabel={isResting ? "ข้ามพัก" : isCounting ? "เริ่มเลย" : isPlaying ? "จบท่านนี้" : "ถัดไป"}
        showPlayPause={isResting || isPlaying}
      />
    </div>
  );
}

// --- Render Helper Components ---
const LoadingScreen = () => (
  <div className="wp-loading-screen">
    <div className="wp-loading-content">
      <div className="wp-spinner"><div className="wp-spinner-ring"></div><div className="wp-spinner-ring"></div><div className="wp-spinner-ring"></div></div>
      <div className="wp-loading-title">กำลังโหลดโปรแกรม...</div>
    </div>
  </div>
);

const ErrorScreen = ({ error }) => (
  <div className="wp-error-screen">
    <div className="wp-error-content">
      <div className="wp-error-icon">⚠️</div>
      <h2>ไม่พบข้อมูลโปรแกรม</h2>
      {error && <p>{error.message}</p>}
    </div>
  </div>
);

const Header = ({ title, current, total, progress, onBack, onGuide }) => (
  <header className="wp-header">
    <div className="wp-header-content">
      <button className="wp-back-btn" onClick={onBack}><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      <div className="wp-header-info">
        <h1 className="wp-program-title">{title}</h1>
        <div className="wp-progress-info">
          <span className="wp-exercise-counter">{current}/{total}</span>
          <div className="wp-overall-progress"><div className="wp-overall-progress-fill" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>
      <button className="wp-sound-btn" onClick={onGuide} title="เปิดไกด์">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.236c-.9.41-1.5 1.08-1.5 1.764V14" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="17" r="1" fill="currentColor" /></svg>
      </button>
    </div>
  </header>
);

const Controls = ({ onPrev, onNext, onTogglePause, isPaused, canPrev, mainButtonLabel, showPlayPause }) => (
  <footer className="wp-controls">
    <button className="wp-control-btn wp-control-btn-secondary" onClick={onPrev} disabled={!canPrev}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polygon points="19 20 9 12 19 4 19 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span>ก่อนหน้า</span>
    </button>
    {showPlayPause && (
      <button className={`wp-control-btn ${isPaused ? "wp-control-btn-play" : "wp-control-btn-pause"}`} onClick={(e) => { e.stopPropagation(); onTogglePause(); }}>
        {isPaused ?
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> :
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="6" y="4" width="4" height="16" stroke="currentColor" strokeWidth="2" /><rect x="14" y="4" width="4" height="16" stroke="currentColor" strokeWidth="2" /></svg>
        }
        <span>{isPaused ? "เล่น" : "หยุด"}</span>
      </button>
    )}
    <button className="wp-control-btn wp-control-btn-primary" onClick={onNext}>
      <span>{mainButtonLabel}</span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polygon points="5 4 15 12 5 20 5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  </footer>
);
