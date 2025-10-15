import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./Summary.css";
import '../style/global.css'

const Summary = () => {
    const { workoutType, userId } = useParams();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const API_BASE = import.meta.env?.VITE_API_BASE_URL || window.location.origin;

    useEffect(() => {
        fetch(`/api/__summary_internal/${workoutType}/${userId}`)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok')
      return res.json()
    })
    .then(data => { setSummary(data); setLoading(false); })
    .catch(err => { setError(err.message); setLoading(false); })
}, [workoutType, userId])

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!summary) return <div>No summary data found.</div>;

  return (
    <div className="summary-bg">
      {/* Header image */}
      <div className="summary-header-img">
        <div className="summary-header-overlay" />
      </div>
      <div className="summary-card">
        <h2 className="summary-title">ยินดีด้วย!</h2>
        <div className="summary-stats-row">
          <div className="summary-stat">
            <div className="summary-stat-icon">💪</div>
            <div className="summary-stat-value">{summary.reps}</div>
            <div className="summary-stat-label">จำนวนครั้ง</div>
          </div>
          <div className="summary-stat">
            <div className="summary-stat-icon">🔥</div>
            <div className="summary-stat-value">{summary.kcal_burned}</div>
            <div className="summary-stat-label">Kcal</div>
          </div>
          <div className="summary-stat">
            <div className="summary-stat-icon">⏱️</div>
            <div className="summary-stat-value">{summary.duration_min}</div>
            <div className="summary-stat-label">นาที</div>
          </div>
        </div>
        <div className="summary-feedback-card">
          <span className="summary-feedback-title">Feedback</span>
          <div className="summary-feedback-text">{summary.feedback}</div>
        </div>
        <button
          className="summary-finish-btn"
          onClick={() => window.location.href = "/home"}
        >
          Finish
        </button>
      </div>
    </div>
  );
};

export default Summary; 