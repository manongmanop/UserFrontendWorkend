import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Alert, Button } from "react-bootstrap";
import { useUserAuth } from "../context/UserAuthContext";
import { MdEmail, MdLockReset, MdArrowBack } from "react-icons/md";
import Swal from "sweetalert2";
import "./forgotPassword.scss";
import "../app.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = useUserAuth();
  let navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      return Swal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณากรอกอีเมลที่ใช้สมัคร",
        confirmButtonColor: "#27BAF9",
      });
    }

    setIsLoading(true);

    try {
      await resetPassword(email);
      setMessage("ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว");
      Swal.fire({
        icon: "success",
        title: "ส่งลิงก์สำเร็จ!",
        text: "กรุณาตรวจสอบอีเมลของคุณเพื่อรีเซ็ตรหัสผ่าน",
        confirmButtonColor: "#27BAF9",
      }).then(() => {
        navigate("/");
      });
    } catch (err) {
      let errorMessage = "เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน";
      if (err.code === "auth/user-not-found") {
        errorMessage = "ไม่พบบัญชีผู้ใช้นี้ในระบบ";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
      }

      setError(errorMessage);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: errorMessage,
        confirmButtonColor: "#27BAF9",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-container">
      <div className="floating-elements">
        <div className="floating-circle circle-1"></div>
        <div className="floating-circle circle-2"></div>
        <div className="floating-circle circle-3"></div>
      </div>

      <div className="forgot-box">
        <div className="forgot-header">
          <div className="icon-wrapper">
            <MdLockReset className="header-icon" />
          </div>
          <h2 className="forgot-title">ลืมรหัสผ่าน?</h2>
          <p className="forgot-subtitle">
            ไม่ต้องกังวล กรอกอีเมลที่คุณใช้สมัครสมาชิก เราจะส่งลิงก์สำหรับสร้างรหัสผ่านใหม่ไปให้คุณ
          </p>
        </div>

        {error && <Alert variant="danger" className="custom-alert">{error}</Alert>}
        {message && <Alert variant="success" className="custom-alert">{message}</Alert>}

        <Form onSubmit={handleSubmit} className="forgot-form">
          <Form.Group className="form-group" controlId="formBasicEmail">
            <div className="input-wrapper">
              <MdEmail className="input-icon" />
              <Form.Control
                type="email"
                placeholder="กรอกอีเมลของคุณ"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="custom-input"
                disabled={isLoading}
              />
            </div>
          </Form.Group>

          <Button
            variant="primary"
            type="submit"
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading ? "กำลังส่งลิงก์..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
          </Button>
        </Form>

        <div className="back-to-login">
          <Link to="/login" className="back-link">
            <MdArrowBack className="back-icon" />
            <span>กลับไปหน้าเข้าสู่ระบบ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
