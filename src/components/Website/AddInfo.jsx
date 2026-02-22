import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Swal from 'sweetalert2';
import {
  MdPerson,
  MdHeight,
  MdFitnessCenter,
  MdEmail,
  MdFace,
  MdFace3,
  MdSave,
  MdArrowBack
} from 'react-icons/md';
import { HiSparkles } from 'react-icons/hi2';
import './addinfo.scss';
import '../style/global.css';

const AddUserDataForm = () => {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [userstatus, setUserstatus] = useState('pass');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setEmail(user.email || '');
        setName(user.displayName || '');
      }
    });
    return () => unsubscribe();
  }, []);

  const calculateBMI = () => {
    if (height && weight) {
      const heightInMeters = parseFloat(height) / 100;
      const weightInKg = parseFloat(weight);
      const bmi = weightInKg / (heightInMeters * heightInMeters);
      return bmi.toFixed(2);
    }
    return null;
  };

  const getBMIStatus = (bmi) => {
    if (!bmi) return '';
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return 'น้ำหนักต่ำกว่าเกณฑ์';
    if (bmiValue < 23) return 'น้ำหนักปกติ';
    if (bmiValue < 25) return 'น้ำหนักเกิน';
    if (bmiValue < 30) return 'อ้วนระดับ 1';
    return 'อ้วนระดับ 2';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!height || !weight || !gender || !name) {
      return Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        text: 'กรุณากรอกข้อมูลส่วนตัวให้ครบทุกช่อง เพื่อการวิเคราะห์ที่แม่นยำ',
        confirmButtonColor: '#2563eb',
      });
    }

    if (parseInt(height) <= 0 || parseInt(weight) <= 0 || parseInt(height) > 500 || parseInt(weight) > 500) {
      return Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ถูกต้อง',
        text: 'ส่วนสูงและน้ำหนักต้องมีค่าตั้งแต่ 1 ถึง 500 เท่านั้น',
        confirmButtonColor: '#2563eb',
      });
    }

    try {
      setIsLoading(true);

      const user = auth.currentUser;
      if (!user) {
        throw new Error('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบก่อน');
      }

      const bmi = calculateBMI();

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        email: user.email,
        name: name,
        height: parseFloat(height),
        weight: parseFloat(weight),
        bmi: parseFloat(bmi),
        userstatus,
        gender,
        updatedAt: new Date()
      }, { merge: true });

      Swal.fire({
        icon: 'success',
        title: 'บันทึกข้อมูลสำเร็จ!',
        text: 'ระบบได้อัปเดตข้อมูลสุขภาพของคุณเรียบร้อยแล้ว',
        allowOutsideClick: false,
        showConfirmButton: false,
        timer: 1500
      }).then(() => {
        navigate('/onboarding');
      });

    } catch (err) {
      console.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล:', err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message,
        confirmButtonColor: '#2563eb',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const bmi = calculateBMI();
  const bmiStatus = getBMIStatus(bmi);

  return (
    <div className="addinfo-container">
      <div className="floating-elements">
        <div className="floating-circle circle-1"></div>
        <div className="floating-circle circle-2"></div>
      </div>

      <div className="addinfo-box">
        <div className="form-header">
          <div className="icon-wrapper">
            <HiSparkles className="header-icon" />
          </div>
          <h2 className="form-title">ตั้งค่าโปรไฟล์สุขภาพ</h2>
          <p className="form-subtitle">เพื่อประสิทธิภาพสูงสุดในการใช้งานระบบ AI ของเรา</p>

          <div className="email-badge">
            <MdEmail />
            <span>{email || 'กำลังโหลดอีเมล...'}</span>
          </div>
        </div>


        <form onSubmit={handleSubmit} className="form-section">
          <input
            type="hidden"
            value="pass"
            onChange={(e) => setUserstatus(e.target.value)}
          />

          <div className="form-group">
            <label className="form-label" htmlFor="name">ชื่อที่ใช้แสดงผล</label>
            <div className="input-wrapper">
              <MdPerson className="input-icon" />
              <input
                id="name"
                className="custom-input no-suffix"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="กรอกชื่อของคุณ"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="height">ส่วนสูง</label>
              <div className="input-wrapper">
                <MdHeight className="input-icon" />
                <input
                  id="height"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="custom-input"
                  value={height}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (val === '' || parseInt(val) <= 500) {
                      setHeight(val);
                    }
                  }}
                  placeholder="0"
                  disabled={isLoading}
                  required
                />
                <span className="input-suffix">ซม.</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="weight">น้ำหนัก</label>
              <div className="input-wrapper">
                <MdFitnessCenter className="input-icon" />
                <input
                  id="weight"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="custom-input"
                  value={weight}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (val === '' || parseInt(val) <= 500) {
                      setWeight(val);
                    }
                  }}
                  placeholder="0"
                  disabled={isLoading}
                  required
                />
                <span className="input-suffix">กก.</span>
              </div>
            </div>
          </div>

          <div className="gender-selection">
            <label className="form-label">เพศสภาพ</label>
            <div className="gender-options">
              <label className="gender-card">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={gender === 'male'}
                  onChange={() => setGender('male')}
                  disabled={isLoading}
                  required
                />
                <div className="card-content">
                  <MdFace className="gender-icon" />
                  <span>ชาย</span>
                </div>
              </label>

              <label className="gender-card">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={gender === 'female'}
                  onChange={() => setGender('female')}
                  disabled={isLoading}
                />
                <div className="card-content">
                  <MdFace3 className="gender-icon" />
                  <span>หญิง</span>
                </div>
              </label>
            </div>
          </div>
          {bmi && (
            <div className="bmi-card">
              <div className="bmi-stat">
                <div className="stat-label">ค่า BMI ของคุณ</div>
                <div className="stat-value">{bmi}</div>
              </div>
              <div className="bmi-divider"></div>
              <div className="bmi-stat">
                <div className="stat-label">เกณฑ์สุขภาพ</div>
                <div className="stat-value">{bmiStatus}</div>
              </div>
            </div>
          )}
          <div className="submit-group">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate(-1)}
              disabled={isLoading}
            >
              <MdArrowBack /> ย้อนกลับ
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={isLoading}
            >
              <MdSave /> {isLoading ? 'กำลังบันทึก...' : 'บันทึกและเริ่มต้นใช้งาน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserDataForm;