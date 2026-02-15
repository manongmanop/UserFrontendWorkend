import React, { useEffect, useState } from 'react';
import './Account.css';
import '../../App.css';
import { CiEdit } from "react-icons/ci";
import WorkoutStats from './WorkoutStats';
import { FaGoogle, FaEnvelope, FaShieldAlt, FaVenusMars, FaMars, FaVenus } from "react-icons/fa";
import { MdToggleOff, MdToggleOn } from "react-icons/md";
import Sidebar from "../Sidebar Section/Sidebar.jsx";
import MetricCard from './MetricCard.jsx';
import BodyMetricsChart from './BodyMetricsChart.jsx';
import { useUserAuth } from "../../context/UserAuthContext.jsx";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase.js';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  deleteUser
} from 'firebase/auth';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import '../style/global.css'
import axios from "axios";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);
function Account() {
  const { user, logOut } = useUserAuth();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState(0);
  const [gender, setGender] = useState('');
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [alternativeLoginEnabled, setAlternativeLoginEnabled] = useState(false);
  const [timeRange, setTimeRange] = useState('3m'); // Default time range
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const navigate = useNavigate();
  const [filteredData, setFilteredData] = useState([]);
  const [userData, setUserData] = useState(null); // ✅ Store MongoDB User Data
  const [latestMetrics, setLatestMetrics] = useState({
    weight: 0,
    fatPercentage: 0,
    muscleMass: 0
  });
  const [totalCaloriesBurned, setTotalCaloriesBurned] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState('weight'); // State to track selected metric for chart

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return; // ✅ Check UID specifically

      Swal.fire({
        title: 'กำลังโหลดข้อมูล...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setHeight(data.height || '');
          setWeight(data.weight || 0); // ดึงน้ำหนักจาก firebase
          setGender(data.gender || '');
          setName(data.name || '');
          setDisplayName(data.name || '');
        }

        if (!docSnap.exists() || !docSnap.data().name) {
          if (user.displayName) {
            setDisplayName(user.displayName);
          } else if (user.email) {
            setDisplayName(user.email.split('@')[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้',
        });
      } finally {
        Swal.close();
      }
    };

    fetchUserData();
    if (user?.uid) {
      fetchMetricsHistory();
      // ✅ Fetch Extra User Data from MongoDB (Goals, Fitness Level)
      axios.get(`/api/users/${user.uid}`)
        .then(res => setUserData(res.data))
        .catch(err => console.error("Failed to fetch MongoDB user data:", err));
    }
  }, [user]);

  // ฟังก์ชันดึงข้อมูลประวัติการวัดร่างกายจาก Firebase โดยตรง
  const fetchMetricsHistory = async () => {
    if (!user?.uid) return; // ✅ Check UID specifically

    setIsLoadingMetrics(true);

    try {
      const metricsRef = collection(db, 'bodyMetrics');
      const q = query(
        metricsRef,
        where('userId', '==', user.uid),
        orderBy('date', 'asc') // เรียงตามวันที่จากอดีต->ปัจจุบัน
      );

      const querySnapshot = await getDocs(q);
      const metricsData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        metricsData.push({
          ...data,
          // แปลง Timestamp ของ Firestore เป็น Date object ของ JS
          date: data.date.toDate ? data.date.toDate() : new Date(data.date)
        });
      });

      setMetricsHistory(metricsData);
    } catch (error) {
      console.error("Error fetching metrics history:", error);
      setMetricsHistory([]);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  // ดึง workout history และรวม kcal
  useEffect(() => {
    const fetchWorkoutHistory = async () => {
      if (!user?.uid) return;
      try {
        // ✅ Use relative path to leverage Vite proxy (Fixes Mixed Content)
        const res = await axios.get(`/api/histories/user/${user.uid}`);
        const histories = res.data || [];
        const total = histories.reduce((sum, h) => sum + (h.caloriesBurned || 0), 0);
        setTotalCaloriesBurned(total);
        setWorkoutHistory(histories); // เก็บไว้ใช้กับกราฟ
      } catch (err) {
        setTotalCaloriesBurned(0);
        setWorkoutHistory([]);
      }
    };
    fetchWorkoutHistory();
  }, [user]);

  // สำหรับ chart: ใช้ workoutHistory เป็นแหล่งข้อมูล kcal
  const [workoutHistory, setWorkoutHistory] = useState([]);

  // Prepare chart data for selected metric only, using metricsData
  const prepareChartData = () => {
    let data = [];
    let labels = [];
    let label = '';
    let borderColor = '';
    let backgroundColor = '';
    if (selectedMetric === 'weight') {
      // ✅ ใช้ workoutHistory แทน filteredData (Firebase)
      // กรองเฉพาะที่มีน้ำหนัก
      const weightHistory = (filteredData.length > 0 ? filteredData : [])
        .filter(item => item.weight && item.weight > 0)
        .sort((a, b) => new Date(a.finishedAt || a.date) - new Date(b.finishedAt || b.date));

      if (!weightHistory.length) return null;

      labels = weightHistory.map(item => {
        const date = new Date(item.finishedAt || item.date);
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().substr(2, 2)}`;
      });
      data = weightHistory.map(item => item.weight);

      label = 'น้ำหนัก';
      borderColor = '#349de3';
      backgroundColor = 'rgba(52, 157, 227, 0.1)';
    } else if (selectedMetric === 'calories') {
      if (!filteredCaloriesData.length) return null; // ใช้ filteredCaloriesData แทน workoutHistory ตรงๆ
      const sorted = [...filteredCaloriesData].sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt));
      labels = sorted.map(item => {
        const date = new Date(item.finishedAt);
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().substr(2, 2)}`;
      });
      data = sorted.map(item => item.caloriesBurned || 0);
      label = 'แคลอรี่ที่เผาผลาญ';
      borderColor = '#ed8936';
      backgroundColor = 'rgba(237, 137, 54, 0.1)';
    }
    return {
      labels,
      datasets: [
        {
          label,
          data,
          borderColor,
          backgroundColor,
          fill: false,
          pointBackgroundColor: borderColor,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5
        }
      ]
    };
  };

  // ฟังก์ชันกรองข้อมูลตามช่วงเวลา (รองรับทั้ง weight และ calories)
  const filterDataByTimeRange = (data, range, type = 'weight') => {
    const today = new Date();
    let filtered = [...data];

    // Helper ในการหา first day of month
    const getStartOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

    switch (range) {
      case '1m': {
        // เฉพาะเดือนปัจจุบัน
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        filtered = filtered.filter(item => {
          const d = new Date(type === 'weight' ? item.date : item.finishedAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        break;
      }
      case '3m': {
        // 2 เดือนก่อนหน้า + เดือนปัจจุบัน (รวม 3 เดือน)
        // เช่น วันนี้เดือน 5 (May). เอา 5, 4, 3 (March, April, May).
        // 1st March = today - 2 months (index wise)
        const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        filtered = filtered.filter(item => new Date(type === 'weight' ? item.date : item.finishedAt) >= start);
        break;
      }
      case '6m': {
        // 5 เดือนก่อนหน้า + เดือนปัจจุบัน (รวม 6 เดือน)
        const start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        filtered = filtered.filter(item => new Date(type === 'weight' ? item.date : item.finishedAt) >= start);
        break;
      }
      case '1y': {
        // เฉพาะปีปัจจุบัน (Yearly)
        const currentYear = today.getFullYear();
        filtered = filtered.filter(item => new Date(type === 'weight' ? item.date : item.finishedAt).getFullYear() === currentYear);
        break;
      }
      case 'all':
      default:
        // ไม่กรอง
        break;
    }

    if (type === 'weight') {
      // ✅ Use workoutHistory as source for weight if available, falling back to metricsHistory
      // But we want to prefer workoutHistory now. 
      // Actually, let's merge or just use workoutHistory if we want to show that.
      // The user wants "from histories", so we should use workoutHistory.

      const source = workoutHistory.length > 0 ? workoutHistory : metricsHistory;
      let filteredWeight = [...source];

      // Filter logic (same as above but applied to source)
      switch (range) {
        case '1m': {
          const currentMonth = today.getMonth();
          const currentYear = today.getFullYear();
          filteredWeight = filteredWeight.filter(item => {
            const d = new Date(item.finishedAt || item.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          });
          break;
        }
        case '3m': {
          const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
          filteredWeight = filteredWeight.filter(item => new Date(item.finishedAt || item.date) >= start);
          break;
        }
        case '6m': {
          const start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
          filteredWeight = filteredWeight.filter(item => new Date(item.finishedAt || item.date) >= start);
          break;
        }
        case '1y': {
          const currentYear = today.getFullYear();
          filteredWeight = filteredWeight.filter(item => new Date(item.finishedAt || item.date).getFullYear() === currentYear);
          break;
        }
      }

      setFilteredData(filteredWeight);
      if (filteredWeight.length > 0) {
        // Find latest with weight
        const validWeights = filteredWeight.filter(i => i.weight > 0);
        if (validWeights.length > 0) {
          const latest = validWeights[validWeights.length - 1]; // sorted? we should sort first
          // Sort by date just to be sure
          const sorted = validWeights.sort((a, b) => new Date(a.finishedAt || a.date) - new Date(b.finishedAt || b.date));
          const latestVal = sorted[sorted.length - 1];

          setLatestMetrics(prev => ({
            ...prev,
            weight: latestVal.weight
          }));
          setWeight(latestVal.weight);
        }
      }
    } else if (type === 'calories') {
      setFilteredCaloriesData(filtered);
    }

    return filtered;
  };

  // State สำหรับ calories
  const [filteredCaloriesData, setFilteredCaloriesData] = useState([]);

  // ปรับ handleTimeRangeChange ให้แค่เปลี่ยน state, ส่วน logic กรองให้ useEffect จัดการ
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  const calculateBMI = () => {
    if (height && weight) {
      const heightInMeters = parseFloat(height) / 100;
      const weightInKg = parseFloat(weight);
      const bmi = weightInKg / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return null;
  };

  const getBMIStatus = (bmi) => {
    if (!bmi) return '-';
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return 'น้ำหนักต่ำกว่าเกณฑ์';
    if (bmiValue < 23) return 'น้ำหนักปกติ';
    if (bmiValue < 25) return 'น้ำหนักเกิน';
    if (bmiValue < 30) return 'อ้วนระดับ 1';
    return 'อ้วนระดับ 2';
  };

  const getChangeText = (change, unit, type = 'weight') => {
    if (change === 0) return { text: `คงที่`, type: 'default' };
    const timeRangeText = {
      '3m': '3 เดือน',
      '6m': '6 เดือน',
      '1y': '1 ปี',
      'all': 'ทั้งหมด'
    }[timeRange] || timeRange;
    const direction = change > 0 ? '+' : '-';
    let highlightType = 'default';

    // ต้องระบุ type อย่างชัดเจน เพราะทั้งไขมันและกล้ามเนื้อใช้ % เหมือนกัน
    if (type === 'fat') {
      // ลดไขมัน (%) - เพิ่ม = แย่, ลด = ดี
      highlightType = direction === '+' ? 'warning' : 'success';
    } else if (type === 'muscle') {
      // เพิ่มกล้ามเนื้อ (%) - เพิ่ม = ดี, ลด = แย่
      highlightType = direction === '+' ? 'success' : 'warning';
    } else if (type === 'weight') {
      // ลดน้ำหนัก (โดยทั่วไป) (กก.)
      highlightType = direction === '+' ? 'warning' : 'success';
    } else {
      // Fallback: ถ้าไม่ระบุ type ให้ดูจาก unit
      if (unit === '%') {
        // สันนิษฐานว่าเป็นไขมัน (เนื่องจากไขมันเป็นค่าที่ควรลด)
        highlightType = direction === '+' ? 'warning' : 'success';
      } else if (unit === 'กก.') {
        // สันนิษฐานว่าเป็นน้ำหนักทั่วไป
        highlightType = direction === '+' ? 'warning' : 'success';
      }
    }

    return {
      text: `${direction} ${Math.abs(change)}${unit} ใน ${timeRangeText}`,
      type: highlightType
    };
  };

  const getBMIStatusClass = (status) => {
    if (status === 'น้ำหนักต่ำกว่าเกณฑ์') return 'warning';
    if (status === 'น้ำหนักปกติ') return 'success';
    if (status === 'น้ำหนักเกิน' || status === 'อ้วนระดับ 1') return 'warning';
    if (status === 'อ้วนระดับ 2') return 'danger';
    return '';
  };
  const getFatPercentageColor = (fatPercentage, userGender) => {
    const normalRanges = {
      male: { min: 18, max: 25 },
      female: { min: 25, max: 31 }
    };

    const range = normalRanges[userGender];
    if (!range) return 'default';

    const fatValue = parseFloat(fatPercentage);

    if (fatValue > range.max) {
      return 'danger'; // สีแดง - มากเกินไป
    } else if (fatValue < range.min) {
      return 'warning'; // สีเหลือง - น้อยเกินไป
    } else {
      return 'success'; // สีเขียว - อยู่ในช่วงปกติ
    }
  };
  // ฟังก์ชันคำนวณการเปลี่ยนแปลงจากข้อมูลประวัติ
  const calculateChanges = () => {
    if (filteredData.length < 2) {
      return {
        weightChange: 0,
        fatChange: 0,
        muscleChange: 0
      };
    }

    const oldest = filteredData[0];
    const latest = filteredData[filteredData.length - 1];

    return {
      weightChange: parseFloat((latest.weight - oldest.weight).toFixed(1)),
      fatChange: parseFloat((latest.fatPercentage - oldest.fatPercentage).toFixed(1)),
      muscleChange: parseFloat((latest.muscleMass - oldest.muscleMass).toFixed(1))
    };
  };
  const handleDeleteAccountWithReauth = async () => {
    if (!user) return;

    // 1. ยืนยันกับผู้ใช้ก่อน เพราะเป็นการกระทำที่ลบข้อมูลถาวร
    const result = await Swal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: "การกระทำนี้จะลบบัญชีและข้อมูลทั้งหมดของคุณอย่างถาวรและไม่สามารถกู้คืนได้!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ใช่, ลบบัญชี',
      cancelButtonText: 'ยกเลิก'
    });

    if (!result.isConfirmed) {
      return; // ผู้ใช้กดยกเลิก
    }

    // 2. ตรวจสอบ Provider ที่ใช้ล็อกอินเพื่อเลือกวิธียืนยันตัวตน
    const providerId = user.providerData[0]?.providerId;

    try {
      Swal.fire({
        title: 'กรุณายืนยันตัวตนเพื่อดำเนินการต่อ',
        text: 'เพื่อความปลอดภัย เราต้องการให้คุณลงชื่อเข้าใช้อีกครั้ง',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // 3. ทำการ Re-authentication
      if (providerId === 'password') {
        // กรณีล็อกอินด้วย Email/Password
        const { value: password } = await Swal.fire({
          title: 'กรุณาใส่รหัสผ่านของคุณ',
          input: 'password',
          inputPlaceholder: 'กรอกรหัสผ่านเพื่อยืนยัน',
          inputAttributes: {
            autocapitalize: 'off',
            autocorrect: 'off'
          },
          showCancelButton: true,
          confirmButtonText: 'ยืนยัน',
          cancelButtonText: 'ยกเลิก',
        });

        if (password) {
          const credential = EmailAuthProvider.credential(user.email, password);
          await reauthenticateWithCredential(user, credential);
        } else {
          throw new Error("ยกเลิกการยืนยันตัวตน");
        }

      } else if (providerId === 'google.com') {
        // กรณีล็อกอินด้วย Google
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      } else {
        throw new Error('ไม่รองรับการยืนยันตัวตนสำหรับ Provider นี้');
      }

      // 4. ถ้า Re-auth สำเร็จ, ทำการลบบัญชีและข้อมูล
      Swal.fire({
        title: 'กำลังลบบัญชี...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      // ลบข้อมูลจาก Firestore
      await deleteDoc(doc(db, 'users', user.uid));
      // (ทางเลือก) คุณอาจจะต้องลบข้อมูลอื่นๆ ที่เกี่ยวข้อง เช่น bodyMetrics

      // ลบบัญชีผู้ใช้จาก Firebase Authentication
      await deleteUser(user);

      Swal.fire(
        'ลบสำเร็จ!',
        'บัญชีของคุณถูกลบเรียบร้อยแล้ว',
        'success'
      ).then(() => {
        logOut(); // ล็อกเอาท์จาก state ของแอป
        navigate('/login'); // กลับไปหน้าล็อกอิน
      });

    } catch (error) {
      console.error("Error deleting account:", error);
      let errorMessage = 'เกิดข้อผิดพลาดในการลบบัญชี';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
      } else if (error.code === 'auth/cancelled-popup-request' || error.message === "ยกเลิกการยืนยันตัวตน") {
        errorMessage = 'คุณได้ยกเลิกกระบวนการยืนยันตัวตน';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'เซสชั่นหมดอายุ กรุณาล็อกอินใหม่อีกครั้งเพื่อดำเนินการต่อ';
      }

      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: errorMessage,
      });
    }
  };
  const handleSave = async () => {
    if (!height || !weight || !gender || !displayName) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      Swal.fire({
        title: 'กำลังบันทึกข้อมูล...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const bmi = calculateBMI();

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: displayName,
        height: parseFloat(height),
        weight: parseFloat(weight),
        bmi: parseFloat(bmi),
        gender,
        updatedAt: new Date()
      }, { merge: true });

      // บันทึกข้อมูลประวัติร่างกายใหม่
      const metricsRef = collection(db, 'bodyMetrics');
      const newMetric = {
        userId: user.uid,
        date: new Date(),
        weight: parseFloat(weight),
        height: parseFloat(height),
        bmi: parseFloat(bmi),
        fatPercentage: metricsHistory.length > 0 ? metricsHistory[metricsHistory.length - 1].fatPercentage : 20,
        muscleMass: metricsHistory.length > 0 ? metricsHistory[metricsHistory.length - 1].muscleMass : 30
      };

      await setDoc(doc(metricsRef), newMetric);

      setName(displayName);
      setEditing(false);

      // โหลดข้อมูลประวัติใหม่
      await fetchMetricsHistory();

      Swal.fire({
        icon: 'success',
        title: 'บันทึกข้อมูลสำเร็จ!',
        showConfirmButton: false,
        timer: 1500
      });

    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setSaving(false);
    }
  };
  const getProviderInfo = () => {
    if (!user || !user.providerData) {
      // คืนค่าว่างๆ ไปก่อน ถ้ายังไม่มีข้อมูล user
      return { primary: null, alternative: null };
    }

    // หาข้อมูล provider หลัก (โดยทั่วไปคือตัวแรกใน array)
    const primaryProvider = user.providerData[0];
    let primaryInfo = {};
    let alternativeInfo = {};

    if (primaryProvider.providerId === 'google.com') {
      primaryInfo = {
        icon: <FaGoogle />,
        type: 'google',
        email: user.email,
      };
      // ถ้าล็อกอินด้วย Google, ทางเลือกคือ Email
      alternativeInfo = {
        type: 'email'
      };
    } else { // สมมติว่าที่เหลือคือ 'password' (Email/Password)
      primaryInfo = {
        icon: <FaEnvelope />,
        type: 'email',
        email: user.email,
      };
      // ถ้าล็อกอินด้วย Email, ทางเลือกคือ Google
      alternativeInfo = {
        type: 'google'
      };
    }

    return { primary: primaryInfo, alternative: alternativeInfo };
  };
  // ฟังก์ชันอื่นๆ ที่มีอยู่แล้ว...

  const bmi = calculateBMI();
  const bmiStatus = getBMIStatus(bmi);
  const bmiStatusClass = getBMIStatusClass(bmiStatus);
  const providerInfo = getProviderInfo();
  const changes = calculateChanges();
  const chartData = prepareChartData();
  const currentFatPercentage = metricsHistory.length > 0 ? metricsHistory[metricsHistory.length - 1].fatPercentage : 0;
  const fatValueColorType = getFatPercentageColor(currentFatPercentage, gender);
  // ดึงข้อมูลล่าสุดจาก filteredData หรือ metricsHistory
  const latestData = (filteredData.length > 0 ? filteredData : metricsHistory);
  const latest = latestData.length > 0 ? latestData[latestData.length - 1] : null;

  const metricsData = [
    {
      id: 'weight',
      icon: 'weight',
      title: 'น้ำหนัก',
      value: latest ? `${latest.weight} กก.` : '0 กก.',
      status: getChangeText(changes.weightChange, 'กก.', 'weight').text,
      statusType: getChangeText(changes.weightChange, 'กก.', 'weight').type,
    },
    {
      id: 'height',
      icon: 'height',
      title: 'ส่วนสูง',
      value: `${height} ซม.`,
      status: '',
      statusType: 'default',
    },
    {
      id: 'calories',
      icon: 'calories',
      title: 'แคลอรี่ที่เผาผลาญ',
      value: `${totalCaloriesBurned} kcal`,
      status: '',
      statusType: 'default',
    }
  ];
  const getGenderDisplay = (gender) => {
    if (gender === 'male' || gender === 'ชาย') {
      return {
        icon: <FaMars className="!text-blue-500 !text-lg !font-bold" />,
        text: 'ชาย'
      };
    }
    if (gender === 'female' || gender === 'หญิง') {
      return {
        icon: <FaVenus className="!text-pink-500 !text-lg !font-bold" />,
        text: 'หญิง'
      };
    }
    return {
      icon: <FaVenusMars className="!text-gray-500 !text-lg" />,
      text: 'ไม่ระบุ'
    };
  };
  const genderDisplay = getGenderDisplay(gender);
  useEffect(() => {
    if (workoutHistory.length > 0) {
      // ✅ Trigger weight filter too using workoutHistory
      filterDataByTimeRange(workoutHistory, timeRange, 'weight');
    } else if (metricsHistory.length > 0) {
      filterDataByTimeRange(metricsHistory, timeRange, 'weight');
    } else {
      setFilteredData([]);
    }

    if (workoutHistory.length > 0) {
      filterDataByTimeRange(workoutHistory, timeRange, 'calories');
    } else {
      setFilteredCaloriesData([]);
    }
  }, [metricsHistory, workoutHistory, timeRange]);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="content-section">
        <div className="main-body">
          <div className="row">
            {/* คอลัมน์ด้านซ้าย - ข้อมูลโปรไฟล์ */}
            <div className="col-md-4 mb-3">
              {/* บัตรโปรไฟล์ */}
              <div className="modern-card profile-card">
                <div className="card-body">
                  <div className="profile-info">
                    <div className="avatar-container">
                      <img
                        src={
                          user?.photoURL ||
                          user?.providerData?.[0]?.photoURL ||
                          "https://media.tenor.com/mzIscFHY8L0AAAAM/blue-box-ao-no-hako.gif"
                        }
                        alt="Profile"
                        className="profile-avatar"
                      />
                      <div className="avatar-overlay">
                        <CiEdit className="edit-avatar-icon" />
                      </div>
                    </div>
                    <div className="profile-details">
                      <h4 className="profile-name">{displayName || 'ผู้ใช้งาน'}</h4>
                      <p className="profile-role">Fitness Enthusiast</p>
                      <div className="profile-stats">
                        <div className="stat-item">
                          <span className="stat-number">{latestMetrics.weight || weight || '0'}</span>
                          <span className="stat-label">น้ำหนัก (กก.)</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-item">
                          <span className="stat-number">{height || '0'}</span>
                          <span className="stat-label">ส่วนสูง (ซม.)</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-item">
                          <span className="email">{user?.email}</span>

                          {/* ✅ Display Fitness Goal Info from MongoDB */}
                          <div className="fitness-badges" style={{ marginTop: '10px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {userData?.fitnessLevel && (
                              <span className="badge" style={{ background: '#ebf8ff', color: '#4299e1', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', border: '1px solid #bee3f8' }}>
                                {userData.fitnessLevel}
                              </span>
                            )}
                            {userData?.primaryGoal && (
                              <span className="badge" style={{ background: '#f0fff4', color: '#48bb78', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', border: '1px solid #c6f6d5' }}>
                                {userData.primaryGoal}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="stat-divider"></div>

                        <div className="stat-item">
                          <span className="stat-number">{bmi || '0'}</span>
                          <span className="stat-label">BMI</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-item">
                          <span className="stat-icon">{genderDisplay.icon}</span>
                          <span className="stat-label">{genderDisplay.text}</span>
                        </div>
                      </div>

                      <div className="profile-action-buttons">
                        {editing ? (
                          <>
                            <button
                              onClick={handleSave}
                              className="btn-modern success"
                              disabled={saving}
                            >
                              {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                            </button>
                            <button
                              onClick={() => setEditing(false)}
                              className="btn-modern secondary"
                              disabled={saving}
                            >
                              ยกเลิก
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setEditing(true)}
                            className="btn-modern primary"
                          >
                            <CiEdit /> แก้ไขข้อมูล
                          </button>
                        )}
                        <button
                          onClick={handleDeleteAccountWithReauth}
                          className="btn-modern danger-outline"
                        >
                          ลบบัญชีผู้ใช้
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* บัตรการเชื่อมต่อบัญชี */}
              <div className="modern-card mt-3">
                <div className="card-body">
                  <h6 className="card-title">
                    <FaShieldAlt className="title-icon" />
                    การเชื่อมต่อบัญชี
                  </h6>
                  <div className="connection-item connected">
                    <div className="connection-info">
                      <div className="connection-icon primary">
                        {providerInfo.primary?.icon}
                      </div>
                      <div className="connection-details">
                        <span className="connection-type">
                          {providerInfo.primary?.type === 'google' ? 'Google Account' : 'Email Account'}
                        </span>
                        <span className="connection-email">{providerInfo.primary?.email}</span>
                      </div>
                    </div>
                    <span className="connection-status connected">เชื่อมต่อแล้ว</span>
                  </div>

                  <div className="connection-item">
                    <div className="connection-info">
                      <div className="connection-icon secondary">
                        {providerInfo.alternative?.type === 'google' ? <FaGoogle /> : <FaEnvelope />}
                      </div>
                      <div className="connection-details">
                        <span className="connection-type">
                          {providerInfo.alternative?.type === 'google' ? 'Google Account' : 'Email Account'}
                        </span>
                        <span className="connection-subtitle">เชื่อมต่อเพิ่มเติม</span>
                      </div>
                    </div>
                    <div className="connection-toggle" onClick={() => setAlternativeLoginEnabled(!alternativeLoginEnabled)}>
                      {alternativeLoginEnabled ?
                        <MdToggleOn className="toggle-icon active" /> :
                        <MdToggleOff className="toggle-icon" />
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* คอลัมน์ด้านขวา - ข้อมูลเพิ่มเติมและเมทริกซ์ร่างกาย */}
            <div className="col-md-8">

              {/* ✅ New Statistics Dashboard */}
              <WorkoutStats />

              {/* ส่วนกราฟแสดงข้อมูลร่างกาย */}
              <div className="metrics-section">

                <div className="chart-container">
                  <h5 className="section-title">ภาพรวมความก้าวหน้า</h5>
                  {/* Time range selection */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button
                      onClick={() => handleTimeRangeChange('1m')}
                      style={{
                        padding: '0.3rem 0.9rem',
                        borderRadius: '6px',
                        border: timeRange === '1m' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: timeRange === '1m' ? '#e6f3ff' : '#fff',
                        color: timeRange === '1m' ? '#2563eb' : '#2d3748',
                        fontWeight: 500,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        boxShadow: timeRange === '1m' ? '0 2px 8px rgba(52,157,227,0.08)' : 'none',
                        transition: 'all 0.2s',
                      }}
                    >1 เดือน</button>
                    <button
                      onClick={() => handleTimeRangeChange('3m')}
                      style={{
                        padding: '0.3rem 0.9rem',
                        borderRadius: '6px',
                        border: timeRange === '3m' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: timeRange === '3m' ? '#e6f3ff' : '#fff',
                        color: timeRange === '3m' ? '#2563eb' : '#2d3748',
                        fontWeight: 500,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        boxShadow: timeRange === '3m' ? '0 2px 8px rgba(52,157,227,0.08)' : 'none',
                        transition: 'all 0.2s',
                      }}
                    >3 เดือน</button>
                    <button
                      onClick={() => handleTimeRangeChange('6m')}
                      style={{
                        padding: '0.3rem 0.9rem',
                        borderRadius: '6px',
                        border: timeRange === '6m' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: timeRange === '6m' ? '#e6f3ff' : '#fff',
                        color: timeRange === '6m' ? '#2563eb' : '#2d3748',
                        fontWeight: 500,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        boxShadow: timeRange === '6m' ? '0 2px 8px rgba(52,157,227,0.08)' : 'none',
                        transition: 'all 0.2s',
                      }}
                    >6 เดือน</button>
                    <button
                      onClick={() => handleTimeRangeChange('1y')}
                      style={{
                        padding: '0.3rem 0.9rem',
                        borderRadius: '6px',
                        border: timeRange === '1y' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: timeRange === '1y' ? '#e6f3ff' : '#fff',
                        color: timeRange === '1y' ? '#2563eb' : '#2d3748',
                        fontWeight: 500,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        boxShadow: timeRange === '1y' ? '0 2px 8px rgba(52,157,227,0.08)' : 'none',
                        transition: 'all 0.2s',
                      }}
                    >1 ปี</button>
                    <button
                      onClick={() => handleTimeRangeChange('all')}
                      style={{
                        padding: '0.3rem 0.9rem',
                        borderRadius: '6px',
                        border: timeRange === 'all' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: timeRange === 'all' ? '#e6f3ff' : '#fff',
                        color: timeRange === 'all' ? '#2563eb' : '#2d3748',
                        fontWeight: 500,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        boxShadow: timeRange === 'all' ? '0 2px 8px rgba(52,157,227,0.08)' : 'none',
                        transition: 'all 0.2s',
                      }}
                    >ทั้งหมด</button>
                  </div>
                  {/* Metric selection buttons */}
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <button
                      onClick={() => setSelectedMetric('weight')}
                      style={{
                        padding: '0.5rem 1.2rem',
                        borderRadius: '8px',
                        border: selectedMetric === 'weight' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: selectedMetric === 'weight' ? '#e6f3ff' : '#fff',
                        color: selectedMetric === 'weight' ? '#2563eb' : '#2d3748',
                        fontWeight: 600,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        boxShadow: selectedMetric === 'weight' ? '0 2px 8px rgba(52,157,227,0.08)' : 'none',
                        transition: 'all 0.2s',
                      }}
                    >น้ำหนัก</button>
                    <button
                      onClick={() => setSelectedMetric('calories')}
                      style={{
                        padding: '0.5rem 1.2rem',
                        borderRadius: '8px',
                        border: selectedMetric === 'calories' ? '2px solid #ed8936' : '1px solid #e2e8f0',
                        background: selectedMetric === 'calories' ? '#fffaf0' : '#fff',
                        color: selectedMetric === 'calories' ? '#ed8936' : '#2d3748',
                        fontWeight: 600,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        boxShadow: selectedMetric === 'calories' ? '0 2px 8px rgba(237,137,54,0.08)' : 'none',
                        transition: 'all 0.2s',
                      }}
                    >แคลอรี่ที่เผาผลาญ</button>
                  </div>
                  {isLoadingMetrics ? (
                    <div className="loading-chart">กำลังโหลดข้อมูล...</div>
                  ) : (
                    <>
                      <div className="chart-wrapper">
                        {chartData && <Line options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          interaction: {
                            mode: 'index',
                            intersect: false,
                          },
                          tension: 0.3,
                          plugins: {
                            legend: {
                              display: false // hide legend since only one metric
                            },
                            tooltip: {
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              titleColor: '#2d3748',
                              bodyColor: '#2d3748',
                              borderColor: '#e2e8f0',
                              borderWidth: 1,
                              padding: 12,
                              boxPadding: 6,
                              usePointStyle: true,
                              callbacks: {
                                label: function (context) {
                                  let label = context.dataset.label || '';
                                  if (label) {
                                    label += ': ';
                                  }
                                  if (context.parsed.y !== null) {
                                    if (selectedMetric === 'weight') {
                                      // ใช้ latestMetrics.weight สำหรับ tooltip จุดล่าสุด
                                      if (context.dataIndex === context.dataset.data.length - 1) {
                                        label += latestMetrics.weight + ' กก.';
                                      } else {
                                        label += context.parsed.y + ' กก.';
                                      }
                                    } else if (selectedMetric === 'calories') {
                                      label += context.parsed.y + ' kcal';
                                    }
                                  }
                                  return label;
                                }
                              }
                            }
                          },
                          scales: {
                            x: {
                              grid: {
                                display: false
                              },
                              title: {
                                display: true,
                                text: 'วันที่ออกกำลังกาย',
                                font: {
                                  family: "'Inter', sans-serif",
                                  size: 13,
                                  weight: 'bold'
                                },
                                color: '#2563eb',
                                padding: { top: 10 }
                              },
                              ticks: {
                                font: {
                                  family: "'Inter', sans-serif",
                                  size: 11
                                },
                                color: '#718096'
                              }
                            },
                            y: {
                              grid: {
                                color: 'rgba(226, 232, 240, 0.6)'
                              },
                              title: {
                                display: true,
                                text: selectedMetric === 'weight' ? 'น้ำหนัก (กก.)' : 'แคลอรี่ที่เผาผลาญ (kcal)',
                                font: {
                                  family: "'Inter', sans-serif",
                                  size: 13,
                                  weight: 'bold'
                                },
                                color: '#2563eb',
                                padding: { right: 10 }
                              },
                              ticks: {
                                font: {
                                  family: "'Inter', sans-serif",
                                  size: 11
                                },
                                color: '#718096'
                              }
                            }
                          }
                        }} data={chartData} height={300} />}
                      </div>
                      {/* คำอธิบายแกนกราฟ */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.95rem', color: '#2563eb', fontWeight: 500 }}>
                        <span>แกน X: วันที่ออกกำลังกาย</span>
                        <span>แกน Y: {selectedMetric === 'weight' ? 'น้ำหนัก (กก.)' : 'แคลอรี่ที่เผาผลาญ (kcal)'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ฟอร์มแก้ไขข้อมูล */}
              {editing && (
                <div className="modern-card mt-3">
                  <div className="card-body">
                    <h5 className="card-title">แก้ไขข้อมูลส่วนตัว</h5>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="modern-label">อีเมล</label>
                        <input value={user?.email || ''} disabled={true} className="modern-input disabled" />
                      </div>
                      <div className="form-group">
                        <label className="modern-label">ชื่อ</label>
                        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="modern-input" />
                      </div>
                      <div className="form-group">
                        <label className="modern-label">ส่วนสูง (ซม.)</label>
                        <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="modern-input" />
                      </div>
                      <div className="form-group">
                        <label className="modern-label">น้ำหนัก (กก.)</label>
                        <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="modern-input" />
                      </div>
                      <div className="form-group">
                        <label className="modern-label">เพศ</label>
                        <select className="modern-select" value={gender} onChange={(e) => setGender(e.target.value)}>
                          <option value="">เลือกเพศ</option>
                          <option value="male">ชาย</option>
                          <option value="female">หญิง</option>
                          <option value="other">อื่นๆ</option>
                        </select>
                      </div>
                    </div>
                    {error && <p className="error-message">{error}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Account;