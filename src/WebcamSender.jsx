import React, { useRef, useEffect } from "react";

function WebcamSender() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // 🔹 1. เปิดกล้องเมื่อ component โหลด
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("ไม่สามารถเปิดกล้อง:", err);
      }
    }

    startCamera();
  }, []);



  return (
    <div>
      <video ref={videoRef} autoPlay playsInline style={{ width: 480, height: 360 }} />
      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>


    </div>
  );
}

export default WebcamSender;
