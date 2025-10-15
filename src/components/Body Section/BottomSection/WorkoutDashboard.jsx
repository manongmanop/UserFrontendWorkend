import React, { useState, useEffect } from "react";
import axios from "axios";
import { useUserAuth } from "../../../context/UserAuthContext";
import PlanSelector from "./PlanSelector.jsx";
import Bottom from "./Bottom.jsx";

function WorkoutDashboard() {
  const { user } = useUserAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [hasWorkoutPlan, setHasWorkoutPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ตรวจสอบสถานะผู้ใช้และแผนการออกกำลังกาย
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    async function checkUserStatus() {
      try {
        setLoading(true);
        setError(null);

        // ดึงข้อมูลผู้ใช้
        const userResponse = await axios.get(`/api/users/${user.uid}`);
        setUserProfile(userResponse.data);

        // ตรวจสอบว่ามี workoutPlanId หรือไม่
        if (userResponse.data?.workoutPlanId) {
          // ตรวจสอบว่าแผนยังมีอยู่จริงหรือไม่
          try {
            await axios.get(`/api/workoutplan/${user.uid}`);
            setHasWorkoutPlan(true);
          } catch (planError) {
            // ถ้าแผนไม่พบ ให้รีเซ็ต workoutPlanId
            console.warn("Workout plan not found, resetting user profile");
            await axios.put(`/api/users/${user.uid}`, {
              ...userResponse.data,
              workoutPlanId: null
            });
            setHasWorkoutPlan(false);
          }
        } else {
          setHasWorkoutPlan(false);
        }

      } catch (err) {
        console.error("Error checking user status:", err);
        
        // ถ้าผู้ใช้ยังไม่มีในระบบ ให้สร้างโปรไฟล์ใหม่
        if (err.response?.status === 404) {
          try {
            const newUserProfile = {
              uid: user.uid,
              caloriesBurned: 0,
              workoutsDone: 0,
              weeklyGoal: 3,
              workoutPlanId: null
            };
            
            await axios.post("/api/users", newUserProfile);
            setUserProfile(newUserProfile);
            setHasWorkoutPlan(false);
          } catch (createError) {
            console.error("Error creating user profile:", createError);
            setError("ไม่สามารถสร้างโปรไฟล์ผู้ใช้ได้");
          }
        } else {
          setError("ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
        }
      } finally {
        setLoading(false);
      }
    }

    checkUserStatus();
  }, [user]);

  // Callback เมื่อผู้ใช้เลือกแผนเสร็จแล้ว
  const handlePlanSelected = () => {
    setHasWorkoutPlan(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-container">
          <div className="spinner" />
          <p>กำลังตรวจสอบข้อมูลของคุณ...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>เกิดข้อผิดพลาด</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  // ถ้าผู้ใช้ยังไม่ได้เข้าสู่ระบบ
  if (!user) {
    return (
      <div className="dashboard-auth">
        <div className="empty-container">
          <div className="empty-icon">🔑</div>
          <h2>โปรดเข้าสู่ระบบ</h2>
          <p>คุณต้องเข้าสู่ระบบเพื่อเข้าใช้งานแผนการออกกำลังกาย</p>
        </div>
      </div>
    );
  }

  // ถ้าผู้ใช้ยังไม่มีแผนการออกกำลังกาย แสดง PlanSelector
  if (!hasWorkoutPlan) {
    return <PlanSelector onPlanSelected={handlePlanSelected} />;
  }

  // ถ้ามีแผนแล้ว แสดง Bottom component ปกติ
  return <Bottom />;
}

export default WorkoutDashboard;