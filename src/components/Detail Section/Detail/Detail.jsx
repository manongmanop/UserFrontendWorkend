import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import "./detail.css";
import { IoIosFitness, IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { AiFillFire } from "react-icons/ai";
import { MdAccessTime } from "react-icons/md";
import Swal from "sweetalert2";
import axios from "axios";
import Sidebar from "../../Sidebar Section/Sidebar.jsx";

// ---------- Helper Functions ----------
const API_BASE = (import.meta.env?.VITE_API_BASE_URL || "").replace(/\/$/, "");

export const getMediaUrl = (p) => {
  if (!p) return "";
  let s = String(p).replace(/\\/g, "/");
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/uploads/") || s.startsWith("/stream/")) {
    return API_BASE ? `${API_BASE}${s}` : s;
  }
  if (s.startsWith("uploads/")) {
    return API_BASE ? `${API_BASE}/${s}` : `/${s}`;
  }
  return API_BASE ? `${API_BASE}/uploads/${s}` : `/uploads/${s}`;
};

export const getImageUrl = (imageName) => getMediaUrl(imageName);

const formatSecondsToTime = (totalSeconds) => {
  const secondsValue = Number(totalSeconds || 0);
  if (secondsValue < 60) return `${secondsValue} วินาที`;
  const minutes = Math.floor(secondsValue / 60);
  const seconds = secondsValue % 60;
  return seconds === 0 ? `${minutes} นาที` : `${minutes} นาที ${seconds} วินาที`;
};

const convertValueToSeconds = (value) => {
  return Math.round(Number(value || 0) * 60);
};

const formatTimeFromValue = (value) => {
  const totalSeconds = convertValueToSeconds(value);
  return formatSecondsToTime(totalSeconds);
};

const getDurationDisplay = (workout) => {
  const parts = [];
  if (workout.sets) parts.push(`${workout.sets} เซ็ต`);
  if (workout.reps) parts.push(`${workout.reps} ครั้ง`);
  if (workout.duration) {
    parts.push(workout.duration < 60 ? `${workout.duration} วินาที` : `${Math.floor(workout.duration / 60)} นาที ${workout.duration % 60 !== 0 ? (workout.duration % 60) + ' วินาที' : ''}`.trim());
  }
  if (workout.rest) parts.push(`พัก ${workout.rest} วิ`);

  if (parts.length > 0) return parts.join(' | ');

  if (workout.type === "time") {
    return formatTimeFromValue(workout.value);
  }
  if (workout.type === "reps") {
    return `${workout.value} ครั้ง`;
  }
  return String(workout.value || "");
};

// ---------- Workout Modal Component ----------
const WorkoutDetailModal = ({
  workout,
  onClose,
  currentIndex,
  totalWorkouts,
  onPrev,
  onNext,
}) => {
  if (!workout) return null;

  const durationDisplay = getDurationDisplay(workout);
  const descriptionText = workout.description || "No description provided.";
  const caloriesValue = workout.caloriesBurned || 0;
  const videoRef = useRef(null);

  // ✅ Fetch exclusively from document's 'muscles' array
  const rawTag = workout.exercise && workout.exercise.muscles
    ? workout.exercise.muscles
    : workout.muscles || [];

  const muscleTags = Array.isArray(rawTag)
    ? rawTag.flatMap(t => t.split(",").map(s => s.trim()).filter(Boolean))
    : typeof rawTag === "string"
      ? rawTag.split(",").map(s => s.trim()).filter(Boolean)
      : [];

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const playNow = async () => {
      try {
        v.currentTime = 0;
        await v.play();
      } catch (e) {
        console.debug('autoplay blocked:', e?.message || e);
      }
    };
    playNow();
    return () => { try { v.pause(); } catch { } };
  }, [workout]);

  const progressPercentage = (currentIndex / totalWorkouts) * 100;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>

        {/* Floating Close Button */}
        <button className="modal-close-fab" onClick={onClose}>×</button>

        <div className="modal-media-section">
          <div className="media-wrapper">
            {workout?.videoUrl || workout?.video ? (
              <video
                ref={videoRef}
                className="modal-video-player"
                src={getMediaUrl(workout.videoUrl || workout.video)}
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img
                src={getMediaUrl(workout.imageUrl || workout.image)}
                alt={workout.name}
                className="modal-image-display"
              />
            )}
            <div className="media-overlay-gradient"></div>

            <div className="modal-progress-bar-container">
              <div className="modal-progress-track">
                <div className="modal-progress-fill" style={{ width: `${progressPercentage}%` }}></div>
              </div>
              <span className="modal-progress-text">{currentIndex} / {totalWorkouts}</span>
            </div>
          </div>
        </div>

        <div className="modal-content-body">
          <div className="modal-header-row">
            <h2 className="workout-modal-title">{workout.name}</h2>
            <div className="modal-muscle-badges" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {muscleTags.length > 0 ? muscleTags.map((tag, i) => (
                <span key={i} className="modal-muscle-badge">{tag}</span>
              )) : (
                <span className="modal-muscle-badge">กล้ามเนื้อ</span>
              )}
            </div>
          </div>

          <div className="modal-stats-row">
            <div className="modal-stat-pill">
              <MdAccessTime /> {durationDisplay}
            </div>
            {caloriesValue > 0 && (
              <div className="modal-stat-pill fire">
                <AiFillFire /> {caloriesValue} kcal
              </div>
            )}
          </div>

          <div className="modal-desc-section">
            <h3>คำแนะนำ</h3>
            <p>{descriptionText}</p>
          </div>

          <div className="modal-nav-actions">
            <button className="nav-circle-btn prev" onClick={onPrev} disabled={currentIndex === 1}>
              <IoIosArrowBack />
            </button>
            <button className="nav-circle-btn next" onClick={onNext} disabled={currentIndex === totalWorkouts}>
              <IoIosArrowForward />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- Main Component ----------
function TrainingCard() {
  const { id } = useParams();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorkoutIndex, setSelectedWorkoutIndex] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;

    Swal.fire({
      title: "กำลังโหลดข้อมูลการฝึก...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    axios
      .get(`/api/workout_programs/${id}`)
      .then((res) => {
        setProgram(res.data);
        console.log("✅ ได้ข้อมูล:", res.data);
      })
      .catch((err) => {
        console.error("❌ เกิดข้อผิดพลาด:", err);
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถโหลดข้อมูลการฝึกได้" });
      })
      .finally(() => {
        setLoading(false);
        Swal.close();
      });
  }, [id]);

  const handleWorkoutClick = (item, idx) => {
    setSelectedWorkoutIndex(idx);
    setSelectedWorkout(program.workoutList[idx]);
    setIsModalOpen(true);
  };

  const handlePrevWorkout = () => {
    if (selectedWorkoutIndex > 0) {
      const newIndex = selectedWorkoutIndex - 1;
      setSelectedWorkoutIndex(newIndex);
      setSelectedWorkout(program.workoutList[newIndex]);
    }
  };

  const handleNextWorkout = () => {
    if (selectedWorkoutIndex < program.workoutList.length - 1) {
      const newIndex = selectedWorkoutIndex + 1;
      setSelectedWorkoutIndex(newIndex);
      setSelectedWorkout(program.workoutList[newIndex]);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedWorkout(null);
    setSelectedWorkoutIndex(null);
  };

  const handleStartWorkout = (workoutName) => {
    const formattedWorkoutName = workoutName.replace(/\s+/g, "_");
    navigate(`/detail/${formattedWorkoutName}`); // ✅ ใช้ react-router ดีกว่า window.location
  };
  const { programId } = useParams();
  // ✅ แสดง Sidebar เสมอ แล้วค่อยสลับเนื้อหาตามสถานะโหลด/ข้อมูล
  return (
    <>
      <Sidebar />

      {loading ? (
        <div className="detail-loading">
          <div className="spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      ) : !program ? (
        <div className="detail-error">
          <p>ไม่พบข้อมูลการฝึก</p>
          <button onClick={() => navigate(-1)}>ย้อนกลับ</button>
        </div>
      ) : (
        <div className="detail-page-container">
          {/* 1. Hero Section (Full Width) */}
          <div className="detail-hero">
            <div className="hero-image-wrapper">
              {program.image && (
                <img
                  src={getMediaUrl(program.imageUrl || program.image)}
                  alt={program.name}
                  className="hero-bg-image"
                />
              )}
              <div className="hero-overlay"></div>
            </div>

            <div className="hero-content">
              {/* <button className="back-btn" onClick={() => navigate(-1)}>
                <span className="back-icon">❮</span> ย้อนกลับ
              </button> */}

              <div className="hero-text">
                <h1 className="program-title-hero">{program.name}</h1>
                <p className="program-desc-hero">{program.description}</p>

                <div className="hero-badges">
                  <div className="hero-badge">
                    <MdAccessTime /> {program.duration} นาที
                  </div>
                  <div className="hero-badge fire">
                    <AiFillFire /> {program.caloriesBurned} kcal
                  </div>
                  <div className="hero-badge count">
                    <IoIosFitness /> {program.workoutList?.length || 0} ท่า
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Content Body */}
          <div className="detail-body">
            <div className="workout-section-header">
              <h3>📋 รายการท่าออกกำลังกาย</h3>
              <span className="workout-count-label">{program.workoutList?.length} ท่า | ประมาณ {program.duration} นาที</span>
            </div>

            <div className="workout-card-list">
              {program.workoutList.length > 0 ? (
                program.workoutList.map((item, idx) => {
                  // ✅ Fetch exclusively from document's 'muscles' array
                  const rawTag = item.exercise && item.exercise.muscles
                    ? item.exercise.muscles
                    : item.muscles || [];

                  const muscleTags = Array.isArray(rawTag)
                    ? rawTag.flatMap(t => t.split(",").map(s => s.trim()).filter(Boolean))
                    : typeof rawTag === "string"
                      ? rawTag.split(",").map(s => s.trim()).filter(Boolean)
                      : [];

                  const parts = [];
                  if (item.sets) parts.push(`${item.sets} เซ็ต`);
                  if (item.reps) parts.push(`${item.reps} ครั้ง`);
                  if (item.duration) {
                    parts.push(item.duration < 60 ? `${item.duration} วินาที` : `${Math.floor(item.duration / 60)} นาที ${item.duration % 60 !== 0 ? (item.duration % 60) + ' วินาที' : ''}`.trim());
                  }
                  if (item.rest) parts.push(`พัก ${item.rest} วิ`);

                  const setRepDisplay = parts.length > 0 ? parts.join(' | ') : (item.type === 'time' ? formatTimeFromValue(item.value) : `${item.value} ครั้ง`);

                  return (
                    <div
                      key={idx}
                      className="workout-card-item"
                      onClick={() => handleWorkoutClick(item, idx)}
                    >
                      <div className="index-number">{String(idx + 1).padStart(2, '0')}</div>

                      <div className="workout-card-image">
                        {item?.imageUrl || item?.image ? (
                          <img
                            src={getMediaUrl(item?.imageUrl || item?.image)}
                            alt={item?.name}
                            loading="lazy"
                          />
                        ) : (
                          <div className="placeholder-img" />
                        )}
                      </div>

                      <div className="workout-card-info">
                        <h4 className="workout-card-name">{item?.name || "ท่าออกกำลังกาย"}</h4>
                        <div className="muscle-tags-container" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {muscleTags.length > 0 ? muscleTags.map((tag, i) => (
                            <span key={i} className="muscle-tag">{tag}</span>
                          )) : (
                            <span className="muscle-tag">กล้ามเนื้อ</span>
                          )}
                        </div>
                      </div>

                      <div className="workout-card-meta">
                        <span className="workout-meta-value">{setRepDisplay}</span>
                        {/* <span className="arrow-indicator">➔</span> */}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-list">No exercises found</div>
              )}
            </div>

            <div className="detail-action-area">
              <Link
                to={`/WorkoutPlayer/${program._id}`}
                className="start-workout-fab-btn"
              >
                <span>เริ่มออกกำลังกาย</span>
                <div className="btn-shine"></div>
              </Link>
            </div>
          </div>

          {isModalOpen && selectedWorkout && (
            <WorkoutDetailModal
              workout={selectedWorkout}
              onClose={closeModal}
              currentIndex={selectedWorkoutIndex + 1}
              totalWorkouts={program.workoutList.length}
              onPrev={handlePrevWorkout}
              onNext={handleNextWorkout}
              onStartWorkout={handleStartWorkout}
              getMediaUrl={getMediaUrl}
            />
          )}
        </div>
      )}
    </>
  );
}

export default TrainingCard;
