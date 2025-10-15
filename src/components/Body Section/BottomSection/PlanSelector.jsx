import React, { useState, useEffect } from "react";
import { Target, Zap, Timer, Award, Check, Users, Star, TrendingUp } from "lucide-react";
import axios from "axios";
import { useUserAuth } from "../../../context/UserAuthContext";
import "./PlanSelector.css";

function PlanSelector({ onPlanSelected }) {
  const { user } = useUserAuth();
  const [step, setStep] = useState("level"); // "level", "plans", "confirm"
  const [selectedLevel, setSelectedLevel] = useState("");
  const [availablePlans, setAvailablePlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const levels = [
    {
      id: "beginner",
      name: "มือใหม่",
      description: "เหมาะสำหรับผู้ที่เพิ่งเริ่มออกกำลังกาย",
      icon: <Users size={32} />,
      color: "#4caf50",
      features: [
        "ท่าออกกำลังกายง่าย ๆ",
        "เวลาสั้น 15-20 นาที",
        "3-4 วันต่อสัปดาห์",
        "มีคำแนะนำโดยละเอียด"
      ]
    },
    {
      id: "normal",
      name: "ปานกลาง",
      description: "สำหรับผู้ที่มีพื้นฐานการออกกำลังกายบ้างแล้ว",
      icon: <Star size={32} />,
      color: "#ff9800",
      features: [
        "ท่าออกกำลังกายหลากหลาย",
        "เวลาปานกลาง 25-35 นาที",
        "4-5 วันต่อสัปดาห์",
        "เน้นการพัฒนาความแข็งแรง"
      ]
    },
    {
      id: "professional",
      name: "ระดับสูง",
      description: "สำหรับผู้ที่มีประสบการณ์การออกกำลังกายมาก",
      icon: <TrendingUp size={32} />,
      color: "#f44336",
      features: [
        "ท่าออกกำลังกายท้าทาย",
        "เวลานาน 40-60 นาที",
        "5-6 วันต่อสัปดาห์",
        "เน้นการเพิ่มประสิทธิภาพสูงสุด"
      ]
    }
  ];

  // ดึงข้อมูล exercises
  useEffect(() => {
    async function fetchExercises() {
      try {
        const response = await axios.get("/api/exercises");
        setExercises(response.data);
      } catch (err) {
        console.error("ไม่สามารถโหลดข้อมูลท่าออกกำลังกายได้:", err);
      }
    }
    fetchExercises();
  }, []);

  // ดึงแผนออกกำลังกายตามระดับที่เลือก
  const fetchPlansByLevel = async (level) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/workout-plans/templates/${level}`);
      setAvailablePlans(response.data);
      setStep("plans");
    } catch (err) {
      console.error("ไม่สามารถโหลดแผนออกกำลังกายได้:", err);
      setError("ไม่สามารถโหลดแผนออกกำลังกายได้ โปรดลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  const handleLevelSelect = (level) => {
    setSelectedLevel(level);
    fetchPlansByLevel(level);
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (!selectedPlan || !user?.uid) return;
    
    try {
      setLoading(true);
      setError(null);

      // สร้าง workout plan ใหม่สำหรับผู้ใช้
      const newPlan = {
        uid: user.uid,
        plans: selectedPlan.plans.map(dayPlan => ({
          day: dayPlan.day,
          exercises: dayPlan.exercises.map(ex => ({
            exercise: ex.exercise,
            performed: ex.performed || { reps: 0, seconds: 0 }
          }))
        }))
      };

      // บันทึกแผนใหม่
      const planResponse = await axios.post("/api/workoutplan", newPlan);
      
      // อัปเดตข้อมูลผู้ใช้
      await axios.put(`/api/users/${user.uid}`, {
        workoutPlanId: planResponse.data._id,
        caloriesBurned: 0,
        workoutsDone: 0,
        weeklyGoal: getWeeklyGoalByLevel(selectedLevel)
      });

      // เรียก callback เพื่อแจ้งว่าเลือกแผนเสร็จแล้ว
      onPlanSelected();

    } catch (err) {
      console.error("ไม่สามารถบันทึกแผนได้:", err);
      setError("ไม่สามารถบันทึกแผนได้ โปรดลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  const getWeeklyGoalByLevel = (level) => {
    const goals = { beginner: 3, normal: 4, professional: 5 };
    return goals[level] || 3;
  };

  const getExerciseById = (id) => {
    return exercises.find(ex => ex._id === id || ex.id === id);
  };

  const calculatePlanStats = (plan) => {
    let totalExercises = 0;
    let totalCalories = 0;
    let workoutDays = 0;

    plan.plans.forEach(dayPlan => {
      if (dayPlan.exercises.length > 0) {
        workoutDays++;
        totalExercises += dayPlan.exercises.length;
        
        dayPlan.exercises.forEach(ex => {
          const exercise = getExerciseById(ex.exercise);
          if (exercise) {
            totalCalories += exercise.caloriesBurned || 50;
          }
        });
      }
    });

    return { totalExercises, totalCalories, workoutDays };
  };

  if (loading) {
    return (
      <div className="plan-selector-container">
        <div className="loading-container">
          <div className="spinner" />
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="plan-selector-container">
      {/* Header */}
      <div className="selector-header">
        <Target size={32} />
        <h1>เลือกแผนการออกกำลังกายของคุณ</h1>
        <p>เริ่มต้นการออกกำลังกายด้วยแผนที่เหมาะสมกับระดับของคุณ</p>
      </div>

      {/* Progress Steps */}
      <div className="progress-steps">
        <div className={`step ${step === "level" ? "active" : step !== "level" ? "completed" : ""}`}>
          <div className="step-number">1</div>
          <span>เลือกระดับ</span>
        </div>
        <div className={`step ${step === "plans" ? "active" : step === "confirm" ? "completed" : ""}`}>
          <div className="step-number">2</div>
          <span>เลือกแผน</span>
        </div>
        <div className={`step ${step === "confirm" ? "active" : ""}`}>
          <div className="step-number">3</div>
          <span>ยืนยัน</span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>ปิด</button>
        </div>
      )}

      {/* Step 1: เลือกระดับ */}
      {step === "level" && (
        <div className="level-selection">
          <h2>คุณอยู่ในระดับไหน?</h2>
          <div className="levels-grid">
            {levels.map(level => (
              <div 
                key={level.id}
                className="level-card"
                onClick={() => handleLevelSelect(level.id)}
                style={{ borderColor: level.color }}
              >
                <div className="level-icon" style={{ color: level.color }}>
                  {level.icon}
                </div>
                <h3>{level.name}</h3>
                <p className="level-description">{level.description}</p>
                <ul className="level-features">
                  {level.features.map((feature, index) => (
                    <li key={index}>
                      <Check size={16} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="select-level-btn" style={{ backgroundColor: level.color }}>
                  เลือกระดับนี้
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: เลือกแผน */}
      {step === "plans" && (
        <div className="plans-selection">
          <div className="back-button">
            <button onClick={() => setStep("level")}>← กลับไปเลือกระดับ</button>
          </div>
          
          <h2>เลือกแผนการออกกำลังกาย ({levels.find(l => l.id === selectedLevel)?.name})</h2>
          
          <div className="plans-grid">
            {availablePlans.map((plan, index) => {
              const stats = calculatePlanStats(plan);
              return (
                <div 
                  key={plan._id || index}
                  className="plan-card"
                  onClick={() => handlePlanSelect(plan)}
                >
                  <div className="plan-header">
                    <h3>{plan.name || `แผนที่ ${index + 1}`}</h3>
                    <div className="plan-badge">{selectedLevel}</div>
                  </div>
                  
                  <div className="plan-stats">
                    <div className="stat">
                      <Timer size={20} />
                      <span>{stats.workoutDays} วัน/สัปดาห์</span>
                    </div>
                    <div className="stat">
                      <Target size={20} />
                      <span>{stats.totalExercises} ท่า</span>
                    </div>
                    <div className="stat">
                      <Zap size={20} />
                      <span>~{stats.totalCalories} แคลอรี่/สัปดาห์</span>
                    </div>
                  </div>

                  <div className="plan-schedule">
                    <h4>ตารางการออกกำลังกาย:</h4>
                    <div className="days-grid">
                      {["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map(day => {
                        const dayPlan = plan.plans.find(p => p.day === day);
                        const hasExercises = dayPlan && dayPlan.exercises.length > 0;
                        const dayNames = {
                          sunday: "อา", monday: "จ", tuesday: "อ", wednesday: "พ",
                          thursday: "พฤ", friday: "ศ", saturday: "ส"
                        };
                        
                        return (
                          <div 
                            key={day}
                            className={`day-indicator ${hasExercises ? "active" : "rest"}`}
                          >
                            {dayNames[day]}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button className="select-plan-btn">
                    เลือกแผนนี้
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: ยืนยันแผน */}
      {step === "confirm" && selectedPlan && (
        <div className="plan-confirmation">
          <div className="back-button">
            <button onClick={() => setStep("plans")}>← กลับไปเลือกแผน</button>
          </div>

          <div className="confirmation-header">
            <Award size={48} color="#4caf50" />
            <h2>ยืนยันการเลือกแผน</h2>
          </div>

          <div className="selected-plan-preview">
            <h3>แผนที่คุณเลือก</h3>
            <div className="plan-summary">
              <div className="summary-item">
                <strong>ระดับ:</strong> {levels.find(l => l.id === selectedLevel)?.name}
              </div>
              <div className="summary-stats">
                {(() => {
                  const stats = calculatePlanStats(selectedPlan);
                  return (
                    <>
                      <div className="summary-stat">
                        <Timer size={20} />
                        <span>{stats.workoutDays} วันต่อสัปดาห์</span>
                      </div>
                      <div className="summary-stat">
                        <Target size={20} />
                        <span>{stats.totalExercises} ท่าทั้งหมด</span>
                      </div>
                      <div className="summary-stat">
                        <Zap size={20} />
                        <span>~{stats.totalCalories} แคลอรี่/สัปดาห์</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="weekly-schedule">
              <h4>ตารางรายสัปดาห์</h4>
              {selectedPlan.plans.map(dayPlan => {
                const dayNames = {
                  sunday: "วันอาทิตย์", monday: "วันจันทร์", tuesday: "วันอังคาร", 
                  wednesday: "วันพุธ", thursday: "วันพฤหัสบดี", friday: "วันศุกร์", saturday: "วันเสาร์"
                };
                
                return (
                  <div key={dayPlan.day} className="day-schedule">
                    <div className="day-name">{dayNames[dayPlan.day]}</div>
                    <div className="day-exercises">
                      {dayPlan.exercises.length === 0 ? (
                        <span className="rest-day">วันพัก</span>
                      ) : (
                        <span>{dayPlan.exercises.length} ท่า</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="confirmation-actions">
            <button 
              className="cancel-btn"
              onClick={() => setStep("plans")}
              disabled={loading}
            >
              เปลี่ยนแผน
            </button>
            <button 
              className="confirm-btn"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "กำลังบันทึก..." : "ยืนยันและเริ่มต้น"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlanSelector;