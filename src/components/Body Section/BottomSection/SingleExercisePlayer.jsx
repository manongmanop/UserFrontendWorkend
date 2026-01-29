import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { Smile, Meh, Frown } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
// import "./WorkoutPlayer.css"; 
import { useUserAuth } from "../../../context/UserAuthContext";
const API_BASE = import.meta.env?.VITE_API_BASE_URL || "";
import { ExerciseCameraManager } from '../../../ExerciseCameraManager.jsx';

// --- Helpers ---
function normalizeUrl(p) {
  if (!p) return "";
  const s = String(p).replace(/\\/g, "/");
  if (s.startsWith("/uploads/")) return s;
  if (s.startsWith("uploads/")) return `/${s}`;
  return s;
}

// --- UI Sub-Components ---
const ProgressRing = ({ progress, size = 80, strokeWidth = 6 }) => {
  const center = size / 2, radius = center - strokeWidth, C = 2 * Math.PI * radius;
  const dashoffset = C - (progress / 100) * C;
  return (
    <svg width={size} height={size} className="progress-ring-svg">
      <circle className="progress-ring-background" cx={center} cy={center} r={radius} strokeWidth={strokeWidth} />
      <circle className="progress-ring-progress" cx={center} cy={center} r={radius} strokeWidth={strokeWidth} strokeDasharray={`${C} ${C}`} strokeDashoffset={dashoffset} />
    </svg>
  );
};

function CameraGuide({ mode = "gate", images = [], onAccept, onClose }) {
  const safeImages = (images || []).filter(Boolean);
  const [idx, setIdx] = useState(0);
  const go = (d) => {
    setIdx((i) => {
      const n = safeImages.length || 1;
      return ((i + d) % n + n) % n;
    });
  };

  return (
    <div className="guide-overlay" role="dialog" aria-modal="true">
      <div className="guide-card">
        <div className="guide-header">
          <h2 className="guide-title">คำแนะนำในการตั้งกล้อง</h2>
          <button className="guide-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="guide-body">
            <div className="guide-gallery">
                <img className="guide-image" src={safeImages[idx]} alt="guide" />
                {safeImages.length > 1 && <><button className="guide-nav guide-nav--left" onClick={() => go(-1)}>‹</button><button className="guide-nav guide-nav--right" onClick={() => go(1)}>›</button></>}
            </div>
             <button className="guide-accept-btn" onClick={onAccept}>เริ่มเลย</button>
        </div>
      </div>
    </div>
  );
}

export function submitProgramFeedback(programId, level) {
  // หมายเหตุ: ถ้าเล่นท่าเดียว อาจไม่ต้องส่ง programId หรือส่งเป็น null ก็ได้ ขึ้นอยู่กับ API
  return axios.patch(`/api/exercises/${programId}/feedback`, { level });
}

// --- Controls Component ---
const Controls = ({ onPrev, onNext, onTogglePause, isPaused, canPrev, mainButtonLabel, showPlayPause }) => {
    const [collapsed, setCollapsed] = useState(false);
    return (
        <footer className={`wp-controls ${collapsed ? 'is-collapsed' : ''}`}>
            <div className="wp-controls-handle" onClick={() => setCollapsed(!collapsed)}><div className="wp-handle-bar-line"/></div>
            <div className="wp-controls-body">
                <button className="wp-control-btn wp-control-btn-secondary" onClick={onPrev} disabled={!canPrev} style={{position:'relative', zIndex:10}}>
                     <span>ก่อนหน้า</span>
                </button>
                {showPlayPause && (
                    <button className={`wp-control-btn wp-control-btn-circle ${isPaused ? "play":"pause"}`} onClick={(e)=>{e.stopPropagation(); onTogglePause();}} style={{position:'relative', zIndex:10}}>
                        {isPaused ? <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg> : <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>}
                    </button>
                )}
                <button className="wp-control-btn wp-control-btn-primary" onClick={onNext} style={{position:'relative', zIndex:10}}>
                    <span>{mainButtonLabel}</span>
                </button>
            </div>
        </footer>
    );
};

/* =========================================
   SECTION 3: Main Component
   ========================================= */
export default function SingleExercisePlayer() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const { user } = useUserAuth();
  const uid = user?.uid;
  
  // State
  const [exercises, setExercises] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  // Workout State
  const [currentExercise, setCurrentExercise] = useState(0); // จะเป็น 0 เสมอเพราะมีท่าเดียว
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCounting, setIsCounting] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  // Timer & Progress
  const [exerciseProgress, setExerciseProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // Camera
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [showGuide, setShowGuide] = useState(true);

  // Refs
  const progressIntervalRef = useRef(null);
  const currentDurationMsRef = useRef(0);
  const remainingMsRef = useRef(0);
  const lastStartTsRef = useRef(0);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const sessionIdRef = useRef(null);
  const exerciseStartTimeRef = useRef(Date.now());
  const endingRef = useRef(false);

  // --- 1. Fetch Data ---
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setIsLoading(true);
        const res = await axios.get(`/api/exercises/${exerciseId}`);
        if (ignore) return;
        
        const exData = res.data;
        exData.imageUrl = normalizeUrl(exData.imageUrl || exData.image);
        exData.video = normalizeUrl(exData.videoUrl || exData.video);

        setExercises([exData]); // ใส่ Array เพื่อให้ logic เดิมทำงานได้
      } catch (e) {
        console.error("Load Error", e);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    })();
    return () => { ignore = true; stopCamera(); };
  }, [exerciseId]);

  // --- 2. Init Exercise ---
  useEffect(() => {
    if (!exercises[currentExercise]) return;

    exerciseStartTimeRef.current = Date.now();
    const duration = 60 * 1000; 
    currentDurationMsRef.current = duration;
    remainingMsRef.current = duration;

    // เริ่มเล่นทันที
    if (!isCounting) {
        setIsPlaying(true);
        resumeWorkoutTimers();
    }
  }, [currentExercise, exercises]);

  // --- 3. Camera Handling ---
  useEffect(() => {
    let mounted = true;
    const openCamera = async () => {
      try {
        setCameraStatus("loading");
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (!mounted) return;
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        setCameraStatus("active");
      } catch (err) {
        if (mounted) setCameraStatus("error");
      }
    };
    if (isPlaying && !isPaused) openCamera();
    else stopCamera();
    return () => { mounted = false; };
  }, [isPlaying, isPaused]);

  // --- 4. Countdown ---
  useEffect(() => {
    if (!isCounting) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    } else {
      setIsCounting(false);
      setIsPlaying(true);
      startWorkoutTimersForCurrent();
    }
  }, [isCounting, countdown]);

  // --- Logic Functions ---
  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStatus("idle");
  };

  const resetTimers = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = null;
    currentDurationMsRef.current = 0; 
    remainingMsRef.current = 0;
    setExerciseProgress(0); 
    setTimeRemaining(0);
  };

  const startWorkoutTimersForCurrent = () => {
    currentDurationMsRef.current = 60000; 
    remainingMsRef.current = 60000;
    resumeWorkoutTimers();
  };

  const resumeWorkoutTimers = () => {
    lastStartTsRef.current = Date.now();
    const resumeFromMs = remainingMsRef.current;
    
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastStartTsRef.current;
      const rem = Math.max(0, resumeFromMs - elapsed);
      remainingMsRef.current = rem;
      
      setExerciseProgress(100 - (rem / currentDurationMsRef.current) * 100);
      setTimeRemaining(Math.ceil(rem / 1000));

      if (rem <= 0) {
        clearInterval(progressIntervalRef.current);
        setTimeRemaining(0);
      }
    }, 100);
  };

  const pauseWorkoutTimers = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    stopCamera();
  };

  // --- Session Logic ---
  const isStartingSessionRef = useRef(false);
  async function startSessionIfNeeded() {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (isStartingSessionRef.current) return;
    isStartingSessionRef.current = true;
    try {
      const ex = exercises[0];
      if (!uid || !ex) throw new Error("Data not ready");

      const body = {
        uid,
        origin: { kind: "exercise", exerciseId: ex._id }, 
        snapshot: {
          programName: ex.name,
          exercises: [{
            exerciseId: ex._id,
            name: ex.name,
            target: { type: ex.type || "reps", value: Number(ex.value || 10) },
            order: 0
          }],
        },
      };
      
      const res = await axios.post(`/api/workout_sessions/start`, body);
      sessionIdRef.current = res.data?._id;
      return sessionIdRef.current;
    } catch (e) {
      console.error("Start Session Failed:", e);
    } finally {
      isStartingSessionRef.current = false;
    }
  }

  async function finishSession() {
      if(sessionIdRef.current) await axios.patch(`/api/workout_sessions/${sessionIdRef.current}/finish`, {}); 
  }

  // --- AI Callbacks ---
  const handleRepComplete = (side, count) => { 
      // Sound effect logic here
  };

  const handleSetComplete = () => {
    console.log("🎉 Single Exercise Complete!");
    onWorkoutEnded(); 
  };

  // --- Transition Logic ---
  const onWorkoutEnded = async () => {
    if (endingRef.current) return;
    endingRef.current = true;

    try {
        // Log Logic (เรียก API)
        await startSessionIfNeeded();
        // ... logExerciseResult ...
    } catch(e) {} finally {
        endingRef.current = false;
    }

    resetTimers();
    stopCamera();
    setIsPlaying(false);
    setIsCounting(false);
    
    try { await finishSession(); } catch(e){}
    setShowFeedbackModal(true);
  };

  // --- Handlers ---
  const handleTogglePause = () => {
    if (isPaused) {
        setCountdown(3);
        setIsCounting(true);
        setIsPaused(false);
    } else {
        pauseWorkoutTimers();
        setIsPaused(true);
    }
  };

  const handleNext = () => onWorkoutEnded(); 

  const handlePrev = () => {
     navigate(-1); // กลับหน้าเดิม
  };

  const handleAcceptGuide = () => {
    setShowGuide(false);
    // เริ่มต้น
    setIsCounting(true);
    setCountdown(3);
  };

  // Feedback
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const handlePickFeedback = async (level) => {
      // await submitProgramFeedback(exerciseId, level); // API Feedback สำหรับ Exercise
      navigate(`/summary/exercise/${uid}`); // ไปหน้าสรุปผล
  };
  
  // --- Render ---
  if (isLoading) return <div className="wp-loading-screen">Loading...</div>;
  const current = exercises[0];

  return (
    <div className="wp-container">
      {showGuide && <CameraGuide onAccept={handleAcceptGuide} onClose={() => navigate(-1)} />}

      <header className="wp-header">
        <div className="wp-header-content">
            <button className="wp-back-btn" onClick={() => navigate(-1)}>←</button>
            <div className="wp-header-info">
                <h1 className="wp-program-title">{current?.name}</h1>
            </div>
        </div>
      </header>

      {isCounting && (
        <div className="wp-countdown-overlay">
          <div className="wp-countdown-content">
            <h2 className="wp-exercise-name">{current?.name}</h2>
            <div className="wp-countdown-circle">{countdown}</div>
            <p>เตรียมตัว...</p>
          </div>
        </div>
      )}

      {!showFeedbackModal && (
        <main className="wp-main">
          <div className="wp-exercise-header">
            <h2 className="wp-current-exercise-name">{current?.name}</h2>
            <div className="wp-exercise-stats">
              <div className="wp-time-remaining">
                <span className="wp-time-number">{timeRemaining}</span>s
              </div>
              <ProgressRing progress={exerciseProgress} size={40} />
            </div>
          </div>

          <div className="media-content">
            
            {/* 1. วิดีโอตัวอย่าง */}
            <div className="video-wrapper exercise-video">
                {current?.video || current?.imageUrl ? (
                    <video className="video-player" src={current?.video} poster={current?.imageUrl} autoPlay muted loop playsInline />
                ) : <div className="wp-placeholder-video">No Video</div>}
                <div className="video-label">ท่าตัวอย่าง</div>
            </div>

            {/* ✅ 2. กล้องผู้ใช้ + AI Overlay (Layout ใหม่) */}
            <div className="video-wrapper camera-video-wrapper">
                
                {/* Layer 1: วิดีโอกล้องจริง (ต้องมี video element เพื่อให้กล้องทำงาน) */}
                <video 
                    ref={videoRef} 
                    className="video-player" 
                    autoPlay 
                    muted 
                    playsInline 
                    style={{ transform: 'scaleX(-1)' }} 
                />

                {/* Layer 2: AI Logic Overlay */}
                <div className="ai-overlay" style={{ pointerEvents: 'none' }}>
                    <ExerciseCameraManager
                        exerciseName={current?.name}
                        isActive={isPlaying && !isPaused && !isCounting}
                        targetReps={current?.value || 10}
                        onRepComplete={handleRepComplete}
                        onSetComplete={handleSetComplete}
                    />
                </div>

                {/* Layer 3: Label */}
                <div className="video-label">กล้องของคุณ</div>

                {/* Loading/Error */}
                {cameraStatus === "loading" && (
                    <div className="wp-overlay wp-overlay--muted">
                        <div className="wp-overlay-card">กำลังเตรียมกล้อง...</div>
                    </div>
                )}
                {cameraStatus === "error" && (
                    <div className="wp-overlay wp-overlay--error">
                        <div className="wp-overlay-card">เปิดกล้องไม่สำเร็จ</div>
                    </div>
                )}
            </div>

          </div>
        </main>
      )}

      {!showFeedbackModal && (
        <Controls 
            onPrev={handlePrev} 
            onNext={handleNext} 
            onTogglePause={handleTogglePause} 
            isPaused={isPaused} 
            canPrev={false} 
            mainButtonLabel="เสร็จสิ้น"
            showPlayPause={true}
        />
      )}

      {showFeedbackModal && (
        <div className="wp-overlay wp-overlay--dark">
             <div className="wp-feedback-card">
                <h2>ฝึกเสร็จสิ้น!</h2>
                <div className="wp-feedback-actions">
                    <button onClick={() => handlePickFeedback("easy")}>ง่าย</button>
                    <button onClick={() => handlePickFeedback("medium")}>ปานกลาง</button>
                    <button onClick={() => handlePickFeedback("hard")}>ยาก</button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
}