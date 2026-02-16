import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Button, Alert } from "react-bootstrap";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import Swal from "sweetalert2";
import { MdEmail, MdLock, MdPerson, MdVisibility, MdVisibilityOff } from "react-icons/md";

function AdminRegister() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !password) {
      return Swal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณากรอกชื่อ อีเมล และรหัสผ่าน",
      });
    }

    try {
      // 1) สร้างบัญชีใหม่ (จะเซ็นอินเป็นบัญชีใหม่ชั่วคราว)
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const newAdminUser = result.user;

      // 2) ส่งอีเมลยืนยันไปยังบัญชีที่เพิ่งสร้าง
      await sendEmailVerification(newAdminUser);

      // 3) บันทึกข้อมูล admin ลง Firestore
      await setDoc(doc(db, "admin", newAdminUser.uid), {
        uid: newAdminUser.uid,
        name,
        email,
        role: "admin",
        createdAt: new Date(),
      });

      // 4) เซ็นเอาต์ เพื่อไม่ให้แอปอยู่ในสถานะเป็นผู้ใช้ที่เพิ่งสร้าง
      //    (โดยปกติผู้สร้าง admin จะต้องกลับมา login ใหม่หลังยืนยันอีเมล)
      await signOut(auth);

      // 5) แจ้งความสำเร็จและนำทางไปหน้า Login (หรือหน้าอื่นที่คุณต้องการ)
      Swal.fire({
        icon: "success",
        title: "สมัคร Admin สำเร็จ",
        html: `ระบบได้ส่งอีเมลยืนยันไปยัง <strong>${email}</strong><br/>กรุณาตรวจสอบอีเมลและกดลิงก์ยืนยันก่อนเข้าสู่ระบบ`,
        confirmButtonText: "ไปที่หน้า Login",
      }).then(() => {
        navigate("/");
      });

    } catch (err) {
      console.error("Admin register error:", err);
      setError(err.message || "เกิดข้อผิดพลาด");
      Swal.fire({
        icon: "error",
        title: "สมัคร Admin ไม่สำเร็จ",
        text: err.message || "เกิดข้อผิดพลาด โปรดลองอีกครั้ง",
      });
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2 className="mb-3">Admin Registration</h2>

        {error && <Alert variant="danger">{error}</Alert>}

        <Form onSubmit={handleSubmit}>

          {/* Name */}
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <div className="position-relative">
              <Form.Control
                type="text"
                placeholder="Enter admin name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ textIndent: "35px" }}
                required
              />
              <MdPerson
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "10px",
                  transform: "translateY(-50%)",
                }}
              />
            </div>
          </Form.Group>

          {/* Email */}
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <div className="position-relative">
              <Form.Control
                type="email"
                placeholder="Enter admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ textIndent: "35px" }}
                required
              />
              <MdEmail
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "10px",
                  transform: "translateY(-50%)",
                }}
              />
            </div>
          </Form.Group>

          {/* Password */}
          <Form.Group className="mb-4">
            <Form.Label>Password</Form.Label>
            <div className="position-relative">
              <Form.Control
                type={showPass ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ textIndent: "35px" }}
                required
              />
              <MdLock
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "10px",
                  transform: "translateY(-50%)",
                }}
              />
              <span
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute",
                  top: "50%",
                  right: "10px",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                }}
              >
                {showPass ? <MdVisibilityOff /> : <MdVisibility />}
              </span>
            </div>
          </Form.Group>

          <Button type="submit" className="w-100 btn btn-primary">
            Create Admin
          </Button>
        </Form>
      </div>
    </div>
  );
}

export default AdminRegister;
