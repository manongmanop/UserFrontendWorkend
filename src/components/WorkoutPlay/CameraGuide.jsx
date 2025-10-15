// CameraGuide.jsx
import React from "react";
import "./CameraGuide.css";

const CameraGuide = ({ onClose }) => {
  return (
    <div className="overlay">
      <div className="guide-box">
        <h2>📷 การตั้งกล้อง</h2>
        <p>วางกล้องไว้ด้านข้าง ระยะห่าง 2–3 เมตร เพื่อให้เห็นทั้งตัว</p>
        <img src="/assets/camera-side-guide.png" alt="Camera Guide" />
        <button onClick={onClose}>พร้อมแล้ว</button>
      </div>
    </div>
  );
};

export default CameraGuide;
