import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import { EmailAuthProvider, linkWithCredential } from "firebase/auth";
import { MdLockOutline, MdPassword, MdVisibility, MdVisibilityOff } from "react-icons/md";
import { Form, Button } from "react-bootstrap";
import Swal from "sweetalert2";
import "./linkEmailPassword.scss";

function LinkEmailPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      return Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลไม่ครบ",
        confirmButtonColor: "#2563eb",
      });
    }

    if (password.length < 6) {
      return Swal.fire({
        icon: "warning",
        title: "รหัสผ่านต้องมีอย่างน้อย 6 ตัว",
        confirmButtonColor: "#2563eb",
      });
    }

    if (password !== confirmPassword) {
      return Swal.fire({
        icon: "error",
        title: "รหัสผ่านไม่ตรงกัน",
        confirmButtonColor: "#2563eb",
      });
    }

    try {
      setLoading(true);

      const user = auth.currentUser;

      if (!user) {
        return Swal.fire({
          icon: "error",
          title: "กรุณาเข้าสู่ระบบ Google ก่อน",
          confirmButtonColor: "#2563eb",
        });
      }

      const credential = EmailAuthProvider.credential(user.email, password);

      await linkWithCredential(user, credential);

      Swal.fire({
        icon: "success",
        title: "ตั้งรหัสผ่านสำเร็จ",
        text: "ส่งอีเมลยืนยันแล้ว หากไม่พบในกล่องจดหมายโปรดตรวจสอบในกล่องจดหมายขยะ (Spam)",
        confirmButtonColor: "#2563eb",
      }).then(() => {
        navigate("/addinfo");
      });
    } catch (error) {
      console.log("LINK ERROR:", error.code);

      let message = "ไม่สามารถตั้งรหัสผ่านได้";

      switch (error.code) {
        case "auth/provider-already-linked":
          message = "บัญชีนี้มีการตั้งรหัสผ่านไว้แล้ว";
          break;
        case "auth/requires-recent-login":
          message = "กรุณาเข้าสู่ระบบใหม่อีกครั้ง";
          break;
        default:
          message = error.message;
      }

      Swal.fire({
        icon: "error",
        title: message,
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="link-email-container">
      <div className="floating-elements">
        <div className="floating-circle circle-1"></div>
        <div className="floating-circle circle-2"></div>
        <div className="floating-circle circle-3"></div>
      </div>

      <div className="link-email-box">
        <div className="link-email-header">
          <div className="icon-wrapper">
            <MdPassword className="header-icon" />
          </div>
          <h2 className="title">เพิ่มรหัสผ่านใหม่</h2>
          <p className="subtitle">
            ตั้งรหัสผ่านสำหรับบัญชี Google ของคุณ เพื่อใช้ในการเข้าสู่ระบบครั้งถัดไป
          </p>
        </div>

        <Form onSubmit={handleSubmit} className="link-email-form">
          <Form.Group className="form-group">
            <div className="input-wrapper">
              <MdLockOutline className="input-icon" />
              <Form.Control
                type={showPassword ? "text" : "password"}
                placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="custom-input"
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
              </button>
            </div>
          </Form.Group>

          <Form.Group className="form-group">
            <div className="input-wrapper">
              <MdLockOutline className="input-icon" />
              <Form.Control
                type={showConfirmPassword ? "text" : "password"}
                placeholder="ยืนยันรหัสผ่านใหม่"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="custom-input"
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
              </button>
            </div>
          </Form.Group>

          <Button
            variant="primary"
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? "กำลังบันทึก..." : "ตั้งรหัสผ่าน"}
          </Button>
        </Form>
      </div>
    </div>
  );
}

export default LinkEmailPassword;
