import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Alert, Button } from "react-bootstrap";
import { useUserAuth } from "../context/UserAuthContext";
import { sendEmailVerification } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import "./login.scss";
import "../App.css";
import "./style/global.css";
import {
  MdEmail,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
  MdLogin,
  MdPersonAdd
} from "react-icons/md";
import { FcGoogle } from "react-icons/fc";
import { HiSparkles } from "react-icons/hi2";
import Swal from "sweetalert2";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { logIn, googleSignIn, user } = useUserAuth();
  let navigate = useNavigate();

  // ฟังก์ชันตรวจสอบสถานะผู้ใช้และนำทางไปยังหน้าที่เหมาะสม (รวม admin)
  const checkUserStatusAndNavigate = async (user) => {
    try {
      setIsLoading(true);
      Swal.fire({
        title: "กำลังเข้าสู่ระบบ...",
        text: "กรุณารอสักครู่",
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // ตรวจสอบว่าเป็น admin หรือไม่
      const adminDocRef = doc(db, "admin", user.uid);
      const adminSnap = await getDoc(adminDocRef);

      if (adminSnap.exists()) {
        Swal.close();
        setIsLoading(false);
        return navigate("/admin/dashboard");
      }

      // ถ้าไม่ใช่ admin → ไปเช็ค users ปกติ
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      Swal.close();

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.userstatus === "pass") {
          navigate("/home");
        } else {
          navigate("/addinfo");
        }
      } else {
        navigate("/addinfo");
      }
    } catch (err) {
      console.error("Error checking user status:", err);
      Swal.close();
      navigate("/addinfo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      return Swal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณากรอกอีเมล",
        confirmButtonColor: "#27BAF9",
      });
    }

    if (!password) {
      return Swal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณากรอกรหัสผ่าน",
        confirmButtonColor: "#27BAF9",
      });
    }

    setIsLoading(true);

    try {
      const userCredential = await logIn(email, password);
      if (!userCredential.user.emailVerified) {
        setIsLoading(false);
        return Swal.fire({
          icon: "error",
          title: "อีเมลยังไม่ยืนยัน",
          text: "กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ",
          confirmButtonColor: "#27BAF9",
        });
      }

      await checkUserStatusAndNavigate(userCredential.user);
    } catch (err) {
      setIsLoading(false);
      let message = "เกิดข้อผิดพลาด";
      switch (err.code) {
        case "auth/missing-password":
          message = "กรุณากรอกรหัสผ่าน";
          break;
        case "auth/invalid-email":
          message = "รูปแบบอีเมลไม่ถูกต้อง";
          break;
        case "auth/user-not-found":
          message = "ไม่พบบัญชีผู้ใช้นี้";
          break;
        case "auth/wrong-password":
          message = "รหัสผ่านไม่ถูกต้อง";
          break;
        case "auth/invalid-credential":
          message = "ตรวจสอบอีเมลและรหัสผ่านอีกครั้ง";
          break;
        default:
          message = err.message;
      }

      Swal.fire({
        icon: "error",
        title: "เข้าสู่ระบบล้มเหลว",
        text: message,
        confirmButtonColor: "#27BAF9",
      });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const result = await googleSignIn();
      await checkUserStatusAndNavigate(result.user);
    } catch (err) {
      setIsLoading(false);
      setError(err.message);
    }
  };

  const handleResendVerification = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        return Swal.fire({
          icon: "error",
          title: "ไม่มีผู้ใช้",
          text: "กรุณาเข้าสู่ระบบก่อน",
          confirmButtonColor: "#27BAF9",
        });
      }
      if (user.emailVerified) {
        return Swal.fire({
          icon: "info",
          title: "ยืนยันแล้ว",
          text: "อีเมลของคุณได้รับการยืนยันแล้ว",
          confirmButtonColor: "#27BAF9",
        });
      }

      await sendEmailVerification(user);
      Swal.fire({
        icon: "success",
        title: "ส่งอีเมลยืนยันแล้ว",
        text: "กรุณาตรวจสอบกล่องจดหมายของคุณ (หากไม่พบโปรดตรวจสอบในกล่องจดหมายขยะ/Spam)",
        confirmButtonColor: "#27BAF9",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถส่งอีเมลยืนยันได้ กรุณาลองใหม่ภายหลัง",
        confirmButtonColor: "#27BAF9",
      });
    }
  };

  return (
    <div className="login-container">
      <div className="floating-elements">
        <div className="floating-circle circle-1"></div>
        <div className="floating-circle circle-2"></div>
        <div className="floating-circle circle-3"></div>
      </div>

      <div className="login-box">
        <div className="video-section">
          {/* <video src={video} autoPlay muted loop></video> */}
          <div className="video-overlay">
            <div className="brand-section">
              <HiSparkles className="brand-icon" />
              <h1 className="brand-title">HealthCare</h1>
              <p className="brand-subtitle">Your Health, Our Priority</p>
            </div>
            <div className="welcome-text">
              <h2>ทุกที่ที่คุณอยู่ สุขภาพคือที่หนึ่ง</h2>
              <p>ไม่มีทางลัดในการมีสุขภาพที่ดี</p>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-header">
            <h2 className="form-title">ยินดีต้อนรับ!</h2>
            <p className="form-subtitle">เข้าสู่ระบบเพื่อดูแลสุขภาพของคุณ</p>
          </div>

          {error && <Alert variant="danger" className="custom-alert">{error}</Alert>}
          {message && <Alert variant="success" className="custom-alert">{message}</Alert>}

          <Form onSubmit={handleSubmit} className="login-form">
            <Form.Group className="form-group">
              <div className="input-wrapper">
                <MdEmail className="input-icon" />
                <Form.Control
                  type="email"
                  placeholder="อีเมล"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="custom-input"
                  disabled={isLoading}
                />
              </div>
            </Form.Group>

            <Form.Group className="form-group">
              <div className="input-wrapper">
                <MdLock className="input-icon" />
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  placeholder="รหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="custom-input"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                </button>
              </div>
              <div className="forgot-password">
                <Link to="/forgot-password" className="forgot-link">
                  ลืมรหัสผ่าน?
                </Link>
              </div>
            </Form.Group>

            <div className="button-group">
              <Button
                variant="primary"
                type="submit"
                className="primary-button"
                disabled={isLoading}
              >
                <MdLogin className="button-icon" />
                {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Button>

              <Button
                variant="outline-primary"
                className="secondary-button"
                onClick={() => navigate("/register")}
                disabled={isLoading}
              >
                <MdPersonAdd className="button-icon" />
                สมัครสมาชิก
              </Button>
            </div>

            <div className="divider">
              <span>หรือเข้าสู่ระบบด้วย</span>
            </div>

            <div className="google-button-wrapper">
              <Button
                onClick={handleGoogleSignIn}
                variant="outline-dark"
                className="google-button"
                disabled={isLoading}
              >
                <FcGoogle className="google-icon" />
                <span>Google</span>
              </Button>
            </div>

            {/* Admin Register Link */}
            <div className="admin-link-wrapper" style={{ marginTop: '1rem', textAlign: 'center' }}>
              <span className="text" style={{ fontSize: '0.9rem', color: '#666' }}>
                {" "}
              </span>
              <Link to="/AdminRegister" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                เข้าสู่ระบบในฐานะผู้ดูแลระบบ
              </Link>
            </div>
          </Form>

          {error && error.includes("verify your email") && (
            <Button
              variant="link"
              onClick={handleResendVerification}
              className="resend-button"
              disabled={isLoading}
            >
              ส่งอีเมลยืนยันอีกครั้ง
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;