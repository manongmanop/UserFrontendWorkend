import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  Clock,
  Dumbbell,
  RefreshCw,
  AlertCircle,
  Activity,
  Target,
  ChevronRight,
} from "lucide-react";
import "./RecentUI.css";
import Sidebar from "../Sidebar Section/Sidebar";
import '../style/global.css'

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:5000";

/* === Utils === */
const getImageUrl = (imageName) => {
  if (!imageName) return "";
  const fixed = String(imageName).replace(/\\/g, "/");
  if (fixed.startsWith("http://") || fixed.startsWith("https://")) return fixed;
  if (fixed.startsWith("/uploads/")) return `${fixed}`;
  if (fixed.startsWith("uploads/")) return `/${fixed}`;
  return `/uploads/${fixed}`;
};

/* === Cards & UI === */
const Card = ({ children, className = "", variant = "default", ...props }) => (
  <div className={`card ${variant} ${className}`} {...props}>{children}</div>
);

const ImageWithFallback = ({ src, alt, className }) => (
  <div className={`image-fallback ${className}`}>
    {src ? (
      <img
        src={src}
        alt={alt}
        className="exercise-image"
        loading="lazy"
        decoding="async"
        sizes="(max-width:640px) 64px, (max-width:1024px) 72px, 96px"
      />
    ) : (
      <div className="image-placeholder">
        <Dumbbell className="placeholder-icon" />
      </div>
    )}
  </div>
);

// <<< ไม่จำเป็นต้องใช้ TABS แล้ว เพราะเหลือแค่หน้าเดียว
// const TABS = [ ... ];

/* การ์ดรายการออกกำลังกาย */
function WorkoutCard({ id, name, image, type, date, index }) {
  return (
    <Card className="workout-card ios fade-in-up" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="workout-card-content">
        <div className="workout-thumbnail">
          <ImageWithFallback src={image} alt={name} className="workout-image" />
          <div className="workout-type-badge">
            {type === "time" ? <Clock className="badge-icon" /> : <Target className="badge-icon" />}
          </div>
        </div>

        <div className="workout-details">
          <div className="workout-header">
            <h3 className="workout-name">{name}</h3>
            {/* <<< อาจจะเปลี่ยนคำว่า "วัน" เป็น "รายการที่" เพื่อให้ความหมายกว้างขึ้น */}
            <p className="workout-subtitle">รายการที่ {index + 1} • {date}</p>
          </div>
        </div>

        <ChevronRight className="workout-arrow" />
      </div>
      <div className="workout-card-hover" />
    </Card>
  );
}
WorkoutCard.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  image: PropTypes.string.isRequired,
  type: PropTypes.oneOf(["reps", "time"]).isRequired,
  date: PropTypes.string.isRequired,
  index: PropTypes.number,
};

/* === Main Component === */
export default function RecentMenu() {
  const { userId } = useParams();

  // <<< ไม่จำเป็นต้องมี activeTab state แล้ว
  // const [activeTab, setActiveTab] = useState("Recent");

  // <<< รวม state เหลือแค่อันเดียวสำหรับเก็บประวัติ
  const [workoutHistory, setWorkoutHistory] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  // <<< เปลี่ยนชื่อฟังก์ชันให้สื่อความหมายมากขึ้น และเป็นฟังก์ชันเดียวในการโหลดข้อมูล
  const fetchWorkoutHistory = async () => {
    // ใช้ endpoint ของ recent เพราะนั่นคือข้อมูลที่เราต้องการโชว์
    const { data: recents } = await axios.get(`/api/recent/user/${userId}`);
    const ids = [...new Set(recents.map((r) => r.exerciseId).filter(Boolean))];
    const exerciseMap = {};
    await Promise.all(
      ids.map(async (id) => {
        try {
          const { data: ex } = await axios.get(`/api/exercises/${id}`);
          exerciseMap[id] = ex;
        } catch (_) {}
      })
    );
    const enriched = recents.map((r) => {
      const ex = exerciseMap[r.exerciseId];
      return {
        _id: r._id,
        type: r.type,
        date: r.date,
        name: ex?.name || "ไม่ทราบชื่อท่าออกกำลังกาย",
        image: getImageUrl(ex?.imageUrl || ex?.image),
      };
    });
    setWorkoutHistory(enriched); // <<< อัปเดต state ใหม่
  };

  // <<< useEffect จะเรียกแค่ฟังก์ชันเดียว
  useEffect(() => {
    if (!userId) {
      setError("จำเป็นต้องมีรหัสผู้ใช้ (User ID)");
      return;
    }
    (async () => {
      setError("");
      setLoading(true);
      try {
        await fetchWorkoutHistory(); // <<< เรียกฟังก์ชันเดียว
      } catch (err) {
        setError(err?.response?.data?.message || err.message || "ดึงข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // <<< เช็ค state ใหม่
  const isHistoryEmpty = !loading && !error && workoutHistory.length === 0;

  return (
    <section className="recent-ui fit-html">
      <div className="recent-ui__container">
        <Sidebar />
        <div className="animated-bg">
          <div className="bg-gradient" />
          <div className="bg-pattern" />
        </div>

        <header className="header fade-in">
          <div className="header-content">
            <div className="header-text">
              {/* <<< เปลี่ยนหัวข้อหลัก */}
              <h1 className="title">ประวัติการออกกำลังกาย</h1>
              {/* <<< ลบส่วน Tabs ออกทั้งหมด */}
            </div>
          </div>
        </header>

        <div className="content-area">
          {loading && (
            <div className="loading-state">
              <div className="loader">
                <RefreshCw className="loader-icon" />
              </div>
              <p className="loading-text">กำลังโหลดประวัติของคุณ…</p> {/* <<< แก้ข้อความ */}
            </div>
          )}

          {error && (
            <Card variant="error" className="error-card" role="alert" aria-live="assertive">
              <AlertCircle className="error-icon" />
              <div className="error-content">
                <h3 className="error-title">ขออภัย! เกิดข้อผิดพลาด</h3>
                <p className="error-message">{error}</p>
              </div>
            </Card>
          )}

          {/* <<< แสดงผลข้อมูลจาก workoutHistory โดยตรง ไม่ต้องเช็ค activeTab */}
          {!loading && !error && workoutHistory.length > 0 && (
            <div className="list-shell">
              <div className="workouts-list ios">
                {workoutHistory.map((workout, index) => (
                  <WorkoutCard
                    key={workout._id || `${workout.name}-${index}`}
                    index={index}
                    id={workout._id}
                    name={workout.name}
                    image={workout.image}
                    type={workout.type}
                    date={fmtDate(workout.date)}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* <<< แสดงผลเมื่อไม่มีข้อมูล */}
          {!loading && !error && isHistoryEmpty && (
            <Card className="empty-state">
              <div className="empty-content">
                <div className="empty-icon-wrapper">
                  <Dumbbell className="empty-icon" />
                </div>
                {/* <<< เปลี่ยนข้อความ Empty State */}
                <h3 className="empty-title">ยังไม่มีประวัติการออกกำลังกาย</h3>
                <p className="empty-text">เริ่มออกกำลังกาย แล้วประวัติของคุณจะปรากฏที่นี่</p>
                <button className="empty-cta" type="button">
                  <Activity className="cta-icon" />
                  เริ่มออกกำลังกาย
                </button>
              </div>
            </Card>
          )}

          {/* <<< ลบการแสดงผลของแท็บอื่นๆ ทั้งหมด */}
        </div>
      </div>
    </section>
  );
}