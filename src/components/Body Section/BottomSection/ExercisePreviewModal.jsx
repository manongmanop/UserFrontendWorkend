import React from "react";
import { Play, X, Clock, Target } from "lucide-react";
// ✅ 1. ต้อง Import useNavigate เข้ามา
import { useNavigate } from "react-router-dom"; 
import "./ExercisePreviewModal.css";

// แนะนำให้ import axios ข้างบนเลยเพื่อความชัวร์ (หรือจะใช้ dynamic import แบบเดิมก็ได้ แต่แบบนี้มาตรฐานกว่า)
import axios from "axios"; 

const API_BASE = (import.meta.env?.VITE_API_BASE_URL || "").replace(/\/$/, "");

const getMediaUrl = (p) => {
  if (!p) return "";
  const s = String(p).replace(/\\/g, "/");
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/uploads/") || s.startsWith("/stream/")) return API_BASE ? `${API_BASE}${s}` : s;
  if (s.startsWith("uploads/")) return API_BASE ? `${API_BASE}/${s}` : `/${s}`;
  return API_BASE ? `${API_BASE}/uploads/${s}` : `/uploads/${s}`;
};

function ExercisePreviewModal({ open, exerciseName, onClose }) { 
  // หมายเหตุ: onStart ไม่จำเป็นต้องใช้แล้วถ้าเรา navigate ในนี้เลย

  const [ex, setEx] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);
  
  // ✅ เรียกใช้ hook
  const navigate = useNavigate();

  React.useEffect(() => {
    // ✅ 2. แก้จาก id เป็น exerciseName (ตาม Props ที่รับมา)
    if (!open || !exerciseName) return; 
    
    setLoading(true);
    setErr(null);
    setEx(null);

    // ✅ 3. ใช้ Logic การดึงข้อมูลจาก "ชื่อ" (เพราะเราไม่มี ID ใน props)
    // หรือถ้าคุณจะส่ง id มาใน props ก็ต้องแก้บรรทัด function ExercisePreviewModal ให้รับ id แทน
    const encodedName = encodeURIComponent(exerciseName);
    
    axios.get(`/api/exercises/name/${encodedName}`) // หรือ endpoint ที่คุณใช้ค้นหาด้วยชื่อ
      .then((res) => setEx(res.data))
      .catch((e) => setErr(e?.response?.data?.message || e.message))
      .finally(() => setLoading(false));

  }, [open, exerciseName]); // ✅ เปลี่ยน dependency เป็น exerciseName

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleStartClick = () => {
    // ✅ 4. ตรวจสอบว่าข้อมูลโหลดเสร็จและมี _id แล้วค่อยไป
    if (ex?._id) {
      navigate(`/play-exercise/${ex._id}`); 
      onClose();
    } else {
      console.error("ไม่พบข้อมูลท่า หรือ ID");
    }
  };

  if (!open) return null;

  return (
    <div className="exercise-modal-overlay" onClick={handleBackdropClick}>
      <div className="exercise-modal-container">
        {/* Header */}
        <div className="exercise-modal-header">
          {/* แสดงชื่อจาก prop ก่อนระหว่างรอโหลด */}
          <h2 className="exercise-modal-title-center">{ex?.name || exerciseName}</h2>
          <button 
            className="exercise-modal-close"
            onClick={onClose}
            aria-label="ปิด"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="exercise-modal-content">
          {loading ? (
            <div className="exercise-modal-loading">
              <div className="loading-spinner"></div>
              <p>กำลังโหลดข้อมูล...</p>
            </div>
          ) : err ? (
            <div className="exercise-modal-error">
              <div className="error-icon">⚠️</div>
              <h3>เกิดข้อผิดพลาด</h3>
              <p>{err}</p>
            </div>
          ) : ex ? (
            <>
              {/* Media Section */}
              <div className="exercise-modal-media">
                {ex?.videoUrl || ex?.video ? (
                  <div className="video-container">
                    <video
                      className="exercise-video"
                      src={getMediaUrl(ex.videoUrl || ex.video)}
                      autoPlay
                      muted
                      loop
                      playsInline
                      controls={false}
                      poster={getMediaUrl(ex.imageUrl || ex.image)}
                    />
                  </div>
                ) : (
                  <div className="image-container">
                    <img 
                      className="exercise-image" 
                      src={getMediaUrl(ex?.imageUrl || ex?.image)} 
                      alt={ex?.name}
                    />
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="exercise-modal-info">
                <h3 className="exercise-name">คำแนะนำ</h3>
                {ex?.description ? (
                  <p className="exercise-description">{ex.description}</p>
                ) : (
                  <p className="exercise-description text-muted">ไม่มีคำอธิบายเพิ่มเติม</p>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Actions */}
        <div className="exercise-modal-actions">
           <button 
             className="btn-secondary"
             onClick={onClose}
           >
             ยกเลิก
           </button>
           <button 
             className="btn-primary"
             onClick={handleStartClick}
             // ป้องกันการกดถ้ายังโหลดไม่เสร็จ หรือไม่มีข้อมูล
             disabled={loading || !ex?._id} 
           >
             <Play size={18} />
             เริ่มออกกำลังกาย
           </button>
         </div>
      </div>
    </div>
  );
}

export default ExercisePreviewModal;