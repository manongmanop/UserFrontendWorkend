import React, { useState, useEffect, useCallback } from 'react';
import './sidebar.css';
import logo from "../../LoginAssets/logo-removebg.png";
import { FaHome, FaBars, FaTimes, FaChartLine, FaHistory } from "react-icons/fa";
import { ImExit } from "react-icons/im";
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserAuth } from '../../context/UserAuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import Swal from 'sweetalert2';
import '../style/global.css'

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { logOut, user } = useUserAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('ผู้ใช้');

  const uid = user?.uid || "";

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user || !user.uid) return; // FIX: Ensure uid exists before creating doc ref
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().name) {
          setUserName(docSnap.data().name);
        } else if (user.displayName) {
          setUserName(user.displayName);
        } else if (user.email) {
          setUserName(user.email.split('@')[0]);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        if (user?.displayName) setUserName(user.displayName);
        else if (user?.email) setUserName(user.email.split('@')[0]);
      }
    };
    fetchUserData();
  }, [user]);

  const toggleSidebar = useCallback(() => setIsOpen(v => !v), []);

  // สร้าง path ที่แนบ uid สำหรับเพจที่ต้องใช้ uid
  const buildPath = (base) => (uid ? `${base}/${uid}` : base);

  const go = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'ยืนยันการออกจากระบบ?',
      text: 'คุณต้องการออกจากระบบใช่หรือไม่',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#27BAF9',
      cancelButtonColor: '#dc3545',
      confirmButtonText: 'ใช่, ออกจากระบบ',
      cancelButtonText: 'ยกเลิก'
    });
    if (result.isConfirmed) {
      try {
        await logOut();
        await Swal.fire('ออกจากระบบแล้ว', 'หวังว่าจะได้พบคุณอีกครั้ง!', 'success');
        navigate('/');
      } catch (err) {
        console.log(err.message);
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้', 'error');
      }
    }
  };

  // เมนูหลัก (ล่าสุด/กราฟ BMI แนบ uid, หน้าแรกไม่ต้อง)
  const menuItems = [
    { icon: <FaHome className='icon' />, text: 'หน้าแรก', path: '/home' },
    { icon: <FaHistory className='icon' />, text: 'ประวัติ', path: buildPath('/history') },
    // { icon: <FaChartLine className='icon' />, text: 'กราฟ BMI', path: buildPath('/bmi-graph') },
    // โปรไฟล์ถูกย้ายไปคลิกที่การ์ด user-profile ด้านล่าง
  ];

  // ไปหน้าโปรไฟล์: ✅ ไม่ต่อท้าย uid → /profile
  const goProfile = () => go('/profile');
  const onProfileKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goProfile();
    }
  };

  // ปิด Sidebar ด้วยปุ่ม Esc
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && isOpen) setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const getProfileImage = () => {
    if (user?.photoURL) return user.photoURL;
    if (user?.providerData?.[0]?.photoURL) return user.providerData[0].photoURL;
    return "https://media.tenor.com/mzIscFHY8L0AAAAM/blue-box-ao-no-hako.gif";
  };

  return (
    <>
      {/* ปุ่มแฮมเบอร์เกอร์ */}
      <button
        type="button"
        className="hamburger-menu"
        onClick={toggleSidebar}
        aria-label={isOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
        aria-controls="app-sidebar"
        aria-expanded={isOpen}
      >
        {isOpen ? <FaTimes className="hamburger-icon" /> : <FaBars className="hamburger-icon" />}
      </button>

      {/* Sidebar */}
      <aside id="app-sidebar" className={`sidebar ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
        <div className='logo-container' onClick={() => go('/home')} role="button" tabIndex={0}>
          <img src={logo} alt="โลโก้แอป" className="logo" />
        </div>

        <nav className="menu-container" aria-label="เมนูหลัก">
          <ul className="nav-menu">
            {menuItems.map((item, index) => {
              const active = location.pathname.startsWith(item.path);
              const disabled = !uid && item.path !== '/home';
              return (
                <li
                  key={`${item.path}-${index}`}
                  className={`nav-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                  onClick={() => !disabled && go(item.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault(); go(item.path);
                    }
                  }}
                  aria-disabled={disabled}
                >
                  {item.icon}
                  <span className="nav-text">{item.text}</span>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* โปรไฟล์: คลิกการ์ดนี้ → /profile (ไม่แนบ uid) */}
        <div
          className="user-profile"
          onClick={goProfile}
          onKeyDown={onProfileKey}
          role="button"
          tabIndex={0}
          aria-label="ไปยังโปรไฟล์ของฉัน"
        >
          <div className="profile-image">
            <img src={getProfileImage()} alt="รูปโปรไฟล์ผู้ใช้" />
          </div>
          <div className="profile-info">
            <h3 className="user-name">{userName}</h3>
          </div>
        </div>

        {/* ออกจากระบบ */}
        <button className="logout-button" onClick={handleLogout} type="button">
          <ImExit className='logout-icon' />
          <span>ออกจากระบบ</span>
        </button>
      </aside>

      {/* Overlay */}
      {isOpen && <div className="overlay" onClick={toggleSidebar} aria-hidden="true"></div>}
    </>
  );
};

export default Sidebar;
