import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AiOutlineSearch } from "react-icons/ai";
import { IoFitnessOutline } from "react-icons/io5";
import { BsLightning } from "react-icons/bs";
import { FaBars, FaDumbbell } from "react-icons/fa"; // Importing FaBars and FaDumbbell
import { useUserAuth } from "../../../context/UserAuthContext";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import "./top.css";
import "../../style/global.css";
export const Top = () => {
  const { user } = useUserAuth();

  const [displayName, setDisplayName] = useState("");
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [userStats, setUserStats] = useState({ caloriesBurned: 0, workoutsDone: 0 });

  // ดึงชื่อจาก Firestore และสถิติผู้ใช้จาก MongoDB
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return;

      try {
        // 1. ดึงข้อมูลจาก Firestore ก่อน
        let firestoreName = "";
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists() && docSnap.data().name) {
            firestoreName = docSnap.data().name;
          }
        } catch (firestoreError) {
          console.error("Error fetching user data from Firestore:", firestoreError);
        }

        // 2. ดึงข้อมูลจาก MongoDB
        try {
          const response = await fetch(`/api/users/${user.uid}`);
          if (response.ok) {
            const data = await response.json();

            // เลือกชื่อตามลำดับความสำคัญ: Firestore > MongoDB > Auth > Email
            const finalName =
              firestoreName ||
              data?.name ||
              user.displayName ||
              (user.email ? user.email.split("@")[0] : "ไม่ทราบชื่อ");

            setDisplayName(finalName);
            setUserStats({
              caloriesBurned: data.caloriesBurned || 0,
              workoutsDone: data.workoutsDone || 0,
            });
          } else {
            throw new Error(`ไม่พบผู้ใช้ หรือเกิดข้อผิดพลาด: ${response.status}`);
          }
        } catch (mongoError) {
          console.error("Error fetching user data from MongoDB:", mongoError);

          // ถ้าดึงข้อมูลจาก MongoDB ไม่ได้ แต่มีชื่อจาก Firestore แล้ว
          if (firestoreName) {
            setDisplayName(firestoreName);
          } else {
            // ใช้ชื่อจาก Auth หรืออีเมลเป็นตัวเลือกสุดท้าย
            setDisplayName(user.displayName || (user.email ? user.email.split("@")[0] : "ไม่ทราบชื่อ"));
          }
        }
      } catch (error) {
        console.error("Error in fetchUserData:", error);
        // กรณีเกิดข้อผิดพลาดในภาพรวม ใช้ข้อมูลจาก Auth ตามปกติ
        setDisplayName(user.displayName || (user.email ? user.email.split("@")[0] : "ไม่ทราบชื่อ"));
      }
    };

    fetchUserData();
  }, [user]);

  // ดึงโปรแกรมทั้งหมด
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await fetch("/api/workout_programs");
        const data = await response.json();
        setPrograms(data);
      } catch (error) {
        console.error("Error fetching programs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPrograms();
  }, []);

  const categories = [
    { label: "แนะนำผู้เริ่มต้น", value: "All" },
    { label: "ความแข็งแรง", value: "Strength" },
    { label: "คาร์ดิโอ", value: "Cardio" },
    { label: "ความยืดหยุ่น", value: "Flexibility" }
  ];

  const filteredPrograms = programs.filter((program) => {
    // เพิ่มการค้นหาด้วย searchTerm
    const matchesSearch = searchTerm === "" ||
      (program.name && program.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (program.description && program.description.toLowerCase().includes(searchTerm.toLowerCase()));

    // กรองตามหมวดหมู่
    const matchesCategory = selectedCategory === "All" ||
      (program.category && program.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase());

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="top">
      <div className="hero-section">
        <div className="hero-container">
          <div className="hero-background-effects">
            <div className="effect-orb orb-top-right"></div>
            <div className="effect-orb orb-bottom-center"></div>
          </div>

          {/* 1. Header Row */}
          <div className="header-row">
            <button className="menu-btn-circle">
              <FaBars />
            </button>
            <div className="search-bar-rounded">
              <AiOutlineSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* 2. Hero Content */}
          <div className="hero-content">
            <div className="greeting-text">
              <span className="emoji">💛</span> ยินดีต้อนรับ {displayName}!
            </div>
            <h1 className="main-title">
              พร้อมที่จะ <span className="gradient-text">ออกกำลังกาย?</span>
            </h1>
            <p className="sub-title">มาสร้างร่างกายที่แข็งแกร่งกันดีกว่า!</p>
          </div>

          {/* 3. Program Highlight Card */}
          <div className="program-highlight-card">
            <div className="active-strip"></div>
            <div className="highlight-icon">
              <FaDumbbell />
            </div>
            <div className="highlight-details">
              <h4>Full Body Power</h4>
              <p>สร้างกล้ามเนื้อทุกส่วน</p>
            </div>
            <div className="highlight-stats">
              <span className="stat-gradient">30 วัน</span>
              <span className="stat-divider">/</span>
              <span className="stat-gradient">45 นาที</span>
            </div>
            <button className="explore-btn-gradient">
              สำรวจโปรแกรม
            </button>
          </div>
        </div>
      </div>

      {/* <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <BsLightning />
            </div>
            <div className="stat-info">
              <h3>{userStats.caloriesBurned}</h3>
              <p>Calories Burned</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <IoFitnessOutline />
            </div>
            <div className="stat-info">
              <h3>{userStats.workoutsDone}</h3>
              <p>Workouts Done</p>
            </div>
          </div>
        </div>
      </div> */}

      <div className="programs-section">
        <div className="section-header">
          <h2>{categories.find((cat) => cat.value === selectedCategory)?.label || "แนะนำผู้เริ่มต้น"}</h2>
          <div className="section-line"></div>
        </div>

        <div className="cardsDiv">
          <div className="programs-grid">
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <p>Loading amazing workouts...</p>
                </div>
              </div>
            ) : filteredPrograms.length > 0 ? (
              filteredPrograms.map((program, index) => (
                <div
                  key={program?._id || index}
                  className="workout-card"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="card-header"></div>
                  <div className="card-image-container">
                    <img
                      src={
                        program?.image
                          ? `/${program.image.replace(/\\/g, "/")}`
                          : "/default.jpg"
                      }
                      alt={program?.name}
                      className="card-image"
                    />
                  </div>

                  <div className="card-body">
                    <h3 className="program-name">{program?.name}</h3>
                    <p className="program-description">
                      {program?.description || "Transform your body with this amazing workout routine"}
                    </p>

                    <Link to={`/detail/${program?._id}`} className="start-workout-btn">
                      <span>สำรวจโปรแกรม</span>
                      <div className="btn-glow"></div>
                    </Link>
                  </div>

                  <div className="card-glow"></div>
                </div>
              ))
            ) : (
              <div className="no-results">
                <p>ไม่พบโปรแกรมที่ตรงกับการค้นหา</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};