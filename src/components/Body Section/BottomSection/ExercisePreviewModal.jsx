import React from "react";
import { Play, X, Clock, Target } from "lucide-react";
import "./ExercisePreviewModal.css";

const API_BASE = (import.meta.env?.VITE_API_BASE_URL || "").replace(/\/$/, "");

const getMediaUrl = (p) => {
  if (!p) return "";
  const s = String(p).replace(/\\/g, "/");
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/uploads/") || s.startsWith("/stream/")) return API_BASE ? `${API_BASE}${s}` : s;
  if (s.startsWith("uploads/")) return API_BASE ? `${API_BASE}/${s}` : `/${s}`;
  return API_BASE ? `${API_BASE}/uploads/${s}` : `/uploads/${s}`;
};

function ExercisePreviewModal({ open, id, onClose, onStart }) {
  const [ex, setEx] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    if (!open || !id) return;
    setLoading(true);
    setErr(null);
    
    // Import axios here to avoid issues
    import('axios').then(axios => {
      axios.default.get(`/api/exercises/${id}`)
        .then((res) => setEx(res.data))
        .catch((e) => setErr(e?.response?.data?.message || e.message))
        .finally(() => setLoading(false));
    });
  }, [open, id]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleStartClick = () => {
    onStart(ex?._id);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="exercise-modal-overlay" onClick={handleBackdropClick}>
      <div className="exercise-modal-container">
        {/* Header */}
        <div className="exercise-modal-header">
          <h2 className="exercise-modal-title-center">{ex?.name}</h2>
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
                    {/* <div className="video-overlay">
                      <div className="play-indicator">
                        <Play size={48} />
                      </div>
                    </div> */}
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
                
                {ex?.description && (
                  <p className="exercise-description">{ex.description}</p>
                )}

                {/* Exercise Stats */}
                {/* <div className="exercise-stats">
                  {ex?.duration && (
                    <div className="stat-item">
                      <Clock size={16} />
                      <span>ระยะเวลา: {ex.duration} นาที</span>
                    </div>
                  )}
                  {ex?.caloriesBurned && (
                    <div className="stat-item">
                      <Target size={16} />
                      <span>เผาผลาญ: {ex.caloriesBurned} แคลอรี่</span>
                    </div>
                  )}
                  {ex?.muscleGroups && ex.muscleGroups.length > 0 && (
                    <div className="muscle-groups">
                      <span className="muscle-label">กล้ามเนื้อที่ใช้:</span>
                      <div className="muscle-tags">
                        {ex.muscleGroups.map((muscle, index) => (
                          <span key={index} className="muscle-tag">
                            {muscle}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div> */}
              </div>
            </>
          ) : null}
        </div>

        {/* Actions */}
        {ex && !loading && !err && (
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
            >
              <Play size={18} />
              เริ่มออกกำลังกาย
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExercisePreviewModal;