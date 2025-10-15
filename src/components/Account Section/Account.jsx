import React, { useEffect, useState } from 'react';
import './Account.css';
import '../../App.css';
import { CiEdit } from "react-icons/ci";
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
  const[filteredData, setFilteredData] = useState([]);
  const [latestMetrics, setLatestMetrics] = useState({
    weight: 0,
    fatPercentage: 0,
    muscleMass: 0
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

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
          // ไม่ต้อง setWeight ที่นี่ เพราะจะอัปเดตจาก metricsHistory แทน
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
    fetchMetricsHistory(timeRange);
  }, [user, timeRange]);

  // ฟังก์ชันดึงข้อมูลประวัติการวัดร่างกาย
  const fetchMetricsHistory = async (timeRange) => {
    if (!user) return;

    setIsLoadingMetrics(true);

    try {
      console.log("ค่า user.uid ก่อนเรียก API:", user?.uid);
      console.log("ค่า timeRange ก่อนเรียก API:", timeRange);

      // ถ้า user.uid ไม่มีค่า ให้หยุดทำงานไปก่อน
      if (!user?.uid) {
        console.error("ไม่สามารถเรียก API ได้เพราะไม่มี user.uid");
        return;
      }
      // เปลี่ยนจาก Authorization header เป็น query parameter
      const response = await fetch(`http://localhost:5000/api/metrics?userId=${user.uid}&range=${timeRange}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
          // ลบ Authorization header ออก
        }
      });

      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลได้');
      }

      const data = await response.json();
      const formattedData = data.map(metric => ({
        ...metric,
        date: new Date(metric.date)
      }));

      setMetricsHistory(formattedData);

    } catch (error) {
      console.error("Error fetching metrics history:", error);
      setMetricsHistory(generateDummyData());
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  // ฟังก์ชันสร้างข้อมูลจำลองสำหรับตัวอย่างกราฟ
  const generateDummyData = () => {
    // สร้างข้อมูลย้อนหลัง 12 เดือน
    const data = [];
    const today = new Date();

    // สร้างข้อมูลเริ่มต้น
    let currentWeight = parseFloat(weight) || 75;
    let currentFat = 25;
    let currentMuscle = 30;

    for (let i = 11; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(today.getMonth() - i);

      // สุ่มค่าการเปลี่ยนแปลงเล็กน้อย
      const weightChange = (Math.random() * 2 - 1) * 0.7;
      const fatChange = -Math.random() * 0.8; // มีแนวโน้มลดลง
      const muscleChange = Math.random() * 0.6; // มีแนวโน้มเพิ่มขึ้น

      currentWeight += weightChange;
      currentFat += fatChange;
      currentMuscle += muscleChange;

      data.push({
        date: date,
        weight: parseFloat(currentWeight.toFixed(1)),
        fatPercentage: parseFloat(currentFat.toFixed(1)),
        muscleMass: parseFloat(currentMuscle.toFixed(1))
      });
    }

    return data;
  };

  // แปลงข้อมูลประวัติเป็นรูปแบบที่ใช้กับ Chart.js
  const prepareChartData = () => {
    if (!metricsHistory.length) return null;

    // ใช้ filteredData แทนการกรองใหม่
    const dataToUse = filteredData.length > 0 ? filteredData : filterDataByTimeRange(metricsHistory, timeRange);

    const labels = dataToUse.map(metric => {
      const date = new Date(metric.date);
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().substr(2, 2)}`;
    });

    return {
      labels,
      datasets: [
        {
          label: 'น้ำหนัก',
          data: dataToUse.map(metric => metric.weight),
          borderColor: '#349de3',
          backgroundColor: 'rgba(52, 157, 227, 0.1)',
          fill: false,
          pointBackgroundColor: '#349de3',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5
        },
        {
          label: 'ไขมันในร่างกาย',
          data: dataToUse.map(metric => metric.fatPercentage),
          borderColor: '#ed8936',
          backgroundColor: 'rgba(237, 137, 54, 0.1)',
          fill: false,
          pointBackgroundColor: '#ed8936',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5
        },
        {
          label: 'มวลกล้ามเนื้อ',
          data: dataToUse.map(metric => metric.muscleMass),
          borderColor: '#48bb78',
          backgroundColor: 'rgba(72, 187, 120, 0.1)',
          fill: false,
          pointBackgroundColor: '#48bb78',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5
        }
      ]
    };
  };

  // ฟังก์ชันกรองข้อมูลตามช่วงเวลา
  const filterDataByTimeRange = (data, range) => {
    const today = new Date();
    let filtered = [...data];

    switch (range) {
      case '1m':
        const oneMonthAgo = new Date(today);
        oneMonthAgo.setMonth(today.getMonth() - 1);
        filtered = filtered.filter(item => new Date(item.date) >= oneMonthAgo);
        break;

      case '3m':
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        filtered = filtered.filter(item => new Date(item.date) >= threeMonthsAgo);
        break;

      case '6m':
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        filtered = filtered.filter(item => new Date(item.date) >= sixMonthsAgo);
        break;

      case '1y':
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(today.getFullYear() - 1);
        filtered = filtered.filter(item => new Date(item.date) >= oneYearAgo);
        break;

      case 'all':
      default:
        filtered = filtered;
        break;
    }

    // อัปเดต filteredData state
    setFilteredData(filtered);

    // อัปเดตค่าล่าสุดจากข้อมูลที่กรองแล้ว
    if (filtered.length > 0) {
      const latest = filtered[filtered.length - 1];
      setLatestMetrics({
        weight: latest.weight,
        fatPercentage: latest.fatPercentage,
        muscleMass: latest.muscleMass
      });
      // อัปเดต weight state ด้วย
      setWeight(latest.weight);
    }

    return filtered;
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    // กรองข้อมูลใหม่และอัปเดต states
    filterDataByTimeRange(metricsHistory, range);
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
  const metricsData = [
    {
      id: 'fat',
      icon: 'fat',
      title: 'ไขมันในร่างกาย',
      value: `${latestMetrics.fatPercentage}%`,
      valueColorType: getFatPercentageColor(latestMetrics.fatPercentage, gender),
      status: getChangeText(changes.fatChange, '%', 'fat').text,
      statusType: getChangeText(changes.fatChange, '%', 'fat').type,
    },
    {
      id: 'muscle',
      icon: 'muscle',
      title: 'มวลกล้ามเนื้อ',
      value: `${latestMetrics.muscleMass} %`,
      status: getChangeText(changes.muscleChange, '%', 'muscle').text,
      statusType: getChangeText(changes.muscleChange, '%', 'muscle').type,
    },
    {
      id: 'weight',
      icon: 'weight',
      title: 'น้ำหนัก',
      value: `${latestMetrics.weight} กก.`, // ใช้ latestMetrics แทน
      status: getChangeText(changes.weightChange, 'กก.', 'weight').text,
      statusType: getChangeText(changes.weightChange, 'กก.', 'weight').type,
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
    if (metricsHistory.length > 0) {
      // กรองข้อมูลตาม timeRange ปัจจุบัน
      filterDataByTimeRange(metricsHistory, timeRange);
    }
  }, [metricsHistory, timeRange]);

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
              {/* ส่วนกราฟแสดงข้อมูลร่างกาย */}
              <div className="metrics-section">
                <h5 className="section-title">ภาพรวมความก้าวหน้า</h5>
                {isLoadingMetrics ? (
                  <div className="loading-chart">กำลังโหลดข้อมูล...</div>
                ) : (
                  <>
                    <div className="chart-container">
                      <div className="chart-time-filter">
                        {/* <button
                          className={timeRange === '1m' ? 'active' : ''}
                          onClick={() => handleTimeRangeChange('1m')}
                        >
                          1 เดือน
                        </button> */}
                        <button
                          className={timeRange === '3m' ? 'active' : ''}
                          onClick={() => handleTimeRangeChange('3m')}
                        >
                          3 เดือน
                        </button>
                        <button
                          className={timeRange === '6m' ? 'active' : ''}
                          onClick={() => handleTimeRangeChange('6m')}
                        >
                          6 เดือน
                        </button>
                        <button
                          className={timeRange === '1y' ? 'active' : ''}
                          onClick={() => handleTimeRangeChange('1y')}
                        >
                          1 ปี
                        </button>
                        <button
                          className={timeRange === 'all' ? 'active' : ''}
                          onClick={() => handleTimeRangeChange('all')}
                        >
                          ทั้งหมด
                        </button>
                      </div>
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
                              position: 'top',
                              labels: {
                                font: {
                                  family: "'Inter', sans-serif",
                                  size: 12
                                },
                                usePointStyle: true,
                                padding: 20
                              }
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
                                    // ตรวจสอบว่า label มีคำว่า 'ไขมัน' หรือ 'มวลกล้ามเนื้อ' หรือไม่
                                    if (label.includes('ไขมัน') || label.includes('มวลกล้ามเนื้อ')) {
                                      label += context.parsed.y + '%';
                                    } else {
                                      label += context.parsed.y + ' กก.';
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
                    </div>
                  </>
                )}
              </div>

              {/* ส่วนแสดงเมทริกซ์ร่างกาย */}
              <div className="metrics-section">
                <h5 className="section-title">ข้อมูลร่างกายโดยละเอียด</h5>
                <div className="metrics-grid-refreshed">
                  {metricsData.map((metric) => (
                    <MetricCard
                      key={metric.id}
                      icon={metric.icon}
                      title={metric.title}
                      value={metric.value}
                      status={metric.status}
                      statusType={metric.statusType}
                    />
                  ))}
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