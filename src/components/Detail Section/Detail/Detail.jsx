import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./detail.css";
import { AiFillFire } from "react-icons/ai";
import { MdAccessTime } from "react-icons/md";
import Swal from "sweetalert2";
import axios from "axios";
import Sidebar from "../../Sidebar Section/Sidebar.jsx";
import { Link } from 'react-router-dom';

const API_BASE = (import.meta.env?.VITE_API_BASE_URL || "").replace(/\/$/, "");

// Helper function to construct image URL
export const getMediaUrl = (p) => {
  if (!p) return ""; // null/undefined/"" → ""
  let s = String(p).replace(/\\/g, "/");

  // if already absolute url
  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  // allow served static paths
  if (s.startsWith("/uploads/") || s.startsWith("/stream/")) {
    // ถ้ามี API_BASE (ต่าง origin) ให้ prefix
    return API_BASE ? `${API_BASE}${s}` : s;
  }

  if (s.startsWith("uploads/")) {
    return API_BASE ? `${API_BASE}/${s}` : `/${s}`;
  }

  // fallback: treat as plain filename under /uploads
  return API_BASE ? `${API_BASE}/uploads/${s}` : `/uploads/${s}`;
};

// คงตัวนี้ไว้ให้โค้ดเดิมเรียกได้ (เรียกใช้ getMediaUrl ภายใน)
export const getImageUrl = (imageName) => getMediaUrl(imageName);
const getDurationDisplay = (workout) => {
  if (workout.type === "time") {
    // ✅ เปลี่ยนจาก formatSecondsToTime เป็น formatTimeFromValue
    return formatTimeFromValue(workout.value);
  }

  if (workout.type === "reps") {
    return `${workout.value} ครั้ง`;
  }

  return String(workout.value || "");
};

const formatSecondsToTime = (totalSeconds) => {
  const secondsValue = Number(totalSeconds || 0);

  if (secondsValue < 60) {
    return `${secondsValue} วินาที`;
  }

  const minutes = Math.floor(secondsValue / 60);
  const seconds = secondsValue % 60;

  if (seconds === 0) {
    return `${minutes} นาที`;
  } else {
    return `${minutes} นาที ${seconds} วินาที`;
  }
};
const convertValueToSeconds = (value) => {
  return Math.round(Number(value || 0) * 60);
};
const formatTimeFromValue = (value) => {
  const totalSeconds = convertValueToSeconds(value);
  return formatSecondsToTime(totalSeconds);
};
// ---------- Workout Modal Component ----------
const WorkoutDetailModal = ({
  workout,
  onClose,
  currentIndex,
  totalWorkouts,
  onPrev,
  onNext,
  // onStartWorkout,
}) => {
  if (!workout) return null;

  const durationDisplay = getDurationDisplay(workout);
  const descriptionText = workout.description || "No description provided.";
  const caloriesValue = workout.caloriesBurned || 0;
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // รีสตาร์ทและสั่งเล่น (muted + playsInline ช่วยให้ autoplay ได้บนมือถือ)
    const playNow = async () => {
      try {
        v.currentTime = 0;
        await v.play();
      } catch (e) {
        // ถ้าเบราว์เซอร์บล็อก autoplay จะมาที่นี่
        console.debug('autoplay blocked:', e?.message || e);
      }
    };
    playNow();
    return () => {
      try { v.pause(); } catch { }
    };
  }, [workout]);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-container">
        <div className="modal-content">
          <div className="modal-media">
            {workout?.videoUrl || workout?.video ? (
              <video
                ref={videoRef}
                className="modal-video"
                src={getMediaUrl(workout.videoUrl || workout.video)}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              // ถ้าต้องการภาพปกก่อนเริ่ม ให้คง poster ไว้ แต่สำหรับ autoplay แบบ GIF ไม่จำเป็น
              // poster={getMediaUrl(workout.imageUrl || workout.image)}
              />
            ) : (
              <img
                src={getMediaUrl(workout.imageUrl || workout.image)}
                alt={workout.name}
                className="modal-image"
              />
            )}
          </div>

          <div className="modal-details">
            <h2 className="workout-modal-name">{workout.name}</h2>

            <div className="modal-stats">
              <div className="modal-duration-item">
                <span className="modal-label">จำนวนที่ต้องทำ</span>
                <span className="modal-value">{durationDisplay}</span>
              </div>
              {caloriesValue > 0 && (
                <div className="modal-calories-item">
                  <span className="modal-label">เผาผลาญ (โดยประมาณ)</span>
                  <span className="modal-value">{caloriesValue} kcal</span>
                </div>
              )}
            </div>

            <h3 className="modal-section-title">รายละเอียด</h3>
            <p className="modal-description">{descriptionText}</p>
          </div>

          <div className="modal-footer">
            <div className="modal-navigation">
              <button className="nav-btn left" onClick={onPrev} disabled={currentIndex === 1} aria-label="ก่อนหน้า">&lt;</button>
              <span className="page-info">{currentIndex}/{totalWorkouts}</span>
              <button className="nav-btn right" onClick={onNext} disabled={currentIndex === totalWorkouts} aria-label="ถัดไป">&gt;</button>
            </div>
            <button className="modal-close-btn top-right" onClick={onClose} aria-label="ปิด">×</button>
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
        <p>⏳ กำลังโหลด...</p>
      ) : !program ? (
        <p>ไม่พบข้อมูลการฝึก</p>
      ) : (
        <div className="training-card">
          <div className="content-container">
            <div className="video-container">
              {program.image && <img src={getMediaUrl(program.imageUrl || program.image)} alt="Program" />}
            </div>

            <div className="info-container">
              <h2>{program.name}</h2>
              <p>{program.description}</p>
              <div className="details">
                <div className="detail-item">
                  <span className="icon"><MdAccessTime /></span>
                  <span className="text">ระยะเวลา</span>
                  <span className="value">{program.duration} นาที</span>
                </div>
                <div className="detail-item">
                  <span className="icon"><AiFillFire /></span>
                  <span className="text">เผาผลาญ</span>
                  <span className="value">{program.caloriesBurned} kcal</span>
                </div>
              </div>
            </div>
          </div>

          <div className="workout-list-section">
            <div className="workout-list-header">
              <h3>รายการท่าออกกำลังกาย</h3>
            </div>
            <ul className="workout-list">
              {program.workoutList.length > 0 ? (
                program.workoutList.map((item, idx) => (
                  <li
                    key={idx}
                    className="workout-list-item"
                    onClick={() => handleWorkoutClick(item, idx)}
                  >
                    <div className="workout-image-container">
                      {item?.imageUrl || item?.image ? (
                        <img
                          src={getMediaUrl(item?.imageUrl || item?.image)}
                          alt={item?.name || "exercise"}
                          className="workout-image"
                          loading="lazy"
                        />
                      ) : item?.videoUrl || item?.video ? (
                        <video
                          className="workout-thumb-video"
                          src={getMediaUrl(item?.videoUrl || item?.video)}
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className="workout-image placeholder" />
                      )}

                      {(item?.videoUrl || item?.video) && (
                        <span className="video-badge">▶</span>
                      )}
                    </div>
                    <div className="workout-details">
                      <span className="workout-name">{item?.name || "-"}</span>
                      <span className="workout-value">
                        {getDurationDisplay(item)}
                      </span>
                    </div>

                  </li>
                ))

              ) : (
                <li>No workout list found</li>
              )}
            </ul>
            <Link
              to={`/WorkoutPlayer/${program._id}`}
              className="modal-start-btn"
            >
              เริ่มออกกำลังกาย
            </Link>
            {/* <button className="modal-start-btn" onClick={() => onStartWorkout(workout.name)}>เริ่มออกกำลังกาย</button> */}
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
