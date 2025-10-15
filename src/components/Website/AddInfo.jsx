import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Swal from 'sweetalert2';
import './AddUserDataForm.css';
import '../style/global.css'

const AddUserDataForm = () => {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [userstatus, setUserstatus] = useState('pass'); // default hidden value
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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

  // BMI calculation function
  const calculateBMI = () => {
    if (height && weight) {
      const heightInMeters = parseFloat(height) / 100;
      const weightInKg = parseFloat(weight);
      const bmi = weightInKg / (heightInMeters * heightInMeters);
      return bmi.toFixed(2);
    }
    return null;
  };

  // BMI status function
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
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบ',
        text: 'กรุณากรอกข้อมูลให้ครบถ้วนก่อนส่ง',
      });
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const user = auth.currentUser;
      if (!user) {
        throw new Error('ไม่พบข้อมูลผู้ใช้ กรุณาล็อกอินก่อน');
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
        title: 'บันทึกสำเร็จ',
        text: 'ข้อมูลของคุณถูกบันทึกแล้ว',
        allowOutsideClick: false,
        showConfirmButton: false,
        timer: 1500
      }).then(() => {
        navigate('/home');
      });

    } catch (err) {
      setError(err.message);
      console.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล:', err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const bmi = calculateBMI();
  const bmiStatus = getBMIStatus(bmi);

  return (
    <div className="form-container">
      <h2 className="form-title">กรอกข้อมูลส่วนตัว</h2>

      <div className="email-display">
        <p><strong>อีเมล:</strong> {email || 'ไม่พบอีเมล'}</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="hidden"
          id="newuser"
          className="hidden-input"
          value="pass"
          onChange={(e) => setUserstatus(e.target.value)}
        />

        <div className="form-group">
          <label className="form-label" htmlFor="name">
            ชื่อ
          </label>
          <input
            id="name"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="height">
            ส่วนสูง (ซม.)
          </label>
          <input
            id="height"
            type="number"
            className="form-input"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="กรอกส่วนสูงเป็นเซนติเมตร"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="weight">
            น้ำหนัก (กก.)
          </label>
          <input
            id="weight"
            type="number"
            className="form-input"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="กรอกน้ำหนักเป็นกิโลกรัม"
            required
          />
        </div>

        {/* BMI Display */}
        {bmi && (
          <div className="bmi-display">
            <p><strong>BMI:</strong> {bmi}</p>
            <p><strong>สถานะ:</strong> {bmiStatus}</p>
          </div>
        )}

        <div className="gender-group">
          <label className="form-label">
            เพศ
          </label>
          <div className="gender-options">
            <label className="gender-option">
              <input
                type="radio"
                name="gender"
                value="male"
                checked={gender === 'male'}
                onChange={() => setGender('male')}
                className="gender-radio"
                required
              />
              ชาย
            </label>
            <label className="gender-option">
              <input
                type="radio"
                name="gender"
                value="female"
                checked={gender === 'female'}
                onChange={() => setGender('female')}
                className="gender-radio"
              />
              หญิง
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="submit-button"
          disabled={isLoading}
        >
          {isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
        </button>
      </form>
    </div>
  );
};

export default AddUserDataForm;