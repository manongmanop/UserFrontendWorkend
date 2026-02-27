import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { UserAuthContextProvider } from './context/UserAuthContext.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import '/index.css'

// Auth & Landing
import LandingPage from './components/LandingPage/LandingPage.jsx'
import Login from './components/Login.jsx'
import Register from './components/Register.jsx'
import ForgotPassword from "./components/ForgotPassword.jsx"
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import Onboarding from './components/Onboarding/Onboarding.jsx'

// Main App
import Main from './components/Website/Main'
import Account from './components/Account Section/Account.jsx'
import AddInfo from './components/Website/AddInfo.jsx'
import UpdateInfo from './components/Website/UpdateInfo.jsx'
import Detail from './components/Detail Section/Detail/Detail.jsx'

// Workout & History
import WorkoutPlayer from './components/WorkoutPlay/WorkoutPlayer.jsx'
import SummaryProgram from './components/WorkoutPlay/SummaryProgram.jsx'
import WorkoutHistory from './components/WorkoutPlay/WorkoutHistory.jsx' // ✅ ตรวจสอบ path ให้ถูก
// Pose Detectors (ถ้ายังใช้อยู่)
import PoseDetector from './PoseDetector.jsx'
import Dumbbell from './Dumbbell.jsx'
import Hipe_Raise from './Hipe_Raise.jsx'
import Leg_Raises from './Leg_Raises.jsx'
import Plank from './Plank.jsx'
import Push_ups from './Push_ups.jsx'
import Squat from './Squat.jsx'
import LinkEmailPassword from "./components/LinkEmailPassword";
import AdminRegister from './components/AdminRegister.jsx'

import TermsOfService from './components/Legal/TermsOfService.jsx'
import PrivacyPolicy from './components/Legal/PrivacyPolicy.jsx'

const router = createBrowserRouter([
  // --- Public Routes ---
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/terms", element: <TermsOfService /> },
  { path: "/privacy", element: <PrivacyPolicy /> },

  // --- Protected Routes (ต้อง Login) ---
  { path: "/home", element: <ProtectedRoute><Main /></ProtectedRoute> },
  { path: "/profile", element: <ProtectedRoute><Account /></ProtectedRoute> },
  { path: "/addinfo", element: <ProtectedRoute><AddInfo /></ProtectedRoute> },
  { path: "/updateinfo", element: <ProtectedRoute><UpdateInfo /></ProtectedRoute> },

  // Detail
  { path: "/detail", element: <ProtectedRoute><Detail /></ProtectedRoute> },
  { path: "/detail/:id", element: <ProtectedRoute><Detail /></ProtectedRoute> },

  // ✅ Workout Flow (เล่น -> สรุป -> ประวัติ)
  { path: "/WorkoutPlayer/:programId", element: <ProtectedRoute><WorkoutPlayer /></ProtectedRoute> },
  { path: "/summary/program/:uid", element: <ProtectedRoute><SummaryProgram /></ProtectedRoute> },
  { path: "/history/:uid", element: <ProtectedRoute><WorkoutHistory /></ProtectedRoute> }, // ✅ Route นี้ถูกต้อง เชื่อมกับปุ่มในหน้า Summary

  // Specific Detectors (ถ้าจำเป็น)
  { path: "/PoseDetector", element: <ProtectedRoute><PoseDetector /></ProtectedRoute> },
  { path: "/Dumbbell", element: <ProtectedRoute><Dumbbell /></ProtectedRoute> },
  { path: "/Hipe_Raise", element: <ProtectedRoute><Hipe_Raise /></ProtectedRoute> },
  { path: "/Leg_Raises", element: <ProtectedRoute><Leg_Raises /></ProtectedRoute> },
  { path: "/Plank", element: <ProtectedRoute><Plank /></ProtectedRoute> },
  { path: "/Push_ups", element: <ProtectedRoute><Push_ups /></ProtectedRoute> },
  { path: "/Squat", element: <ProtectedRoute><Squat /></ProtectedRoute> },
  // Onboarding
  { path: "/onboarding", element: <ProtectedRoute><Onboarding /></ProtectedRoute> },
  { path: "/set-password", element: <ProtectedRoute><LinkEmailPassword /></ProtectedRoute> },
  { path: "/AdminRegister", element: <ProtectedRoute><AdminRegister /></ProtectedRoute> },

])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserAuthContextProvider>
      <RouterProvider router={router} />
    </UserAuthContextProvider>
  </React.StrictMode>,
)