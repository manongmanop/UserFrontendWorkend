import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import {
  EmailAuthProvider,
  linkWithCredential,
} from "firebase/auth";
import Swal from "sweetalert2";

function LinkEmailPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      return Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลไม่ครบ",
      });
    }

    if (password.length < 6) {
      return Swal.fire({
        icon: "warning",
        title: "รหัสผ่านต้องมีอย่างน้อย 6 ตัว",
      });
    }

    if (password !== confirmPassword) {
      return Swal.fire({
        icon: "error",
        title: "รหัสผ่านไม่ตรงกัน",
      });
    }

    try {
      setLoading(true);

      const user = auth.currentUser;

      if (!user) {
        return Swal.fire({
          icon: "error",
          title: "กรุณาเข้าสู่ระบบ Google ก่อน",
        });
      }

      const credential = EmailAuthProvider.credential(
        user.email,
        password
      );

      await linkWithCredential(user, credential);

      Swal.fire({
        icon: "success",
        title: "ตั้งรหัสผ่านสำเร็จ",
      }).then(() => {
        navigate("/addinfo");
      });

    } catch (error) {
      console.log("LINK ERROR:", error.code);

      let message = "ไม่สามารถตั้งรหัสผ่านได้";

      switch (error.code) {
        case "auth/provider-already-linked":
          message = "บัญชีนี้มีรหัสผ่านแล้ว";
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
      });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: 400 }}>
      <h3 className="mb-4 text-center">
        ตั้งรหัสผ่านสำหรับบัญชี Google
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <input
            type="password"
            className="form-control"
            placeholder="รหัสผ่านใหม่"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <input
            type="password"
            className="form-control"
            placeholder="ยืนยันรหัสผ่าน"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={loading}
        >
          {loading ? "กำลังบันทึก..." : "ตั้งรหัสผ่าน"}
        </button>
      </form>
    </div>
  );
}

export default LinkEmailPassword;
