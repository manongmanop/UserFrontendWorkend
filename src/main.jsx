// main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'

import Login from './components/Login.jsx'
import Register from './components/Register.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import ForgotPassword from "./components/ForgotPassword.jsx"
import Main from './components/Website/Main'       
import 'bootstrap/dist/css/bootstrap.min.css'
import Account from './components/Account Section/Account.jsx'
import AddInfo from './components/Website/AddInfo.jsx'
import UpdateInfo from './components/Website/updateInfo.jsx'
import Detail from './components/Detail Section/Detail/Detail.jsx'

// ⬇️ ใช้หน้า Recent ใหม่ที่คุณส่งมา (RecentUI)
import RecentMenu from './components/History Section/RecentCard.jsx'
// ถ้าชื่อไฟล์คุณคือ RecentCard.jsx จริงๆ และ export default Right component ก็ใช้เดิมได้
// แต่ให้แน่ใจว่าตัว component ชื่อ/behavior ตรงกับที่ต้องการ

import WorkoutPlayer from './components/WorkoutPlay/WorkoutPlayer.jsx'
import SummaryProgram  from './components/WorkoutPlay/SummaryProgram.jsx'
import Summary from './components/Program/Summary.jsx'
import PoseDetector from './PoseDetector.jsx'
import Dumbbell from './Dumbbell.jsx'
import Hipe_Raise from './Hipe_Raise.jsx'
import Leg_Raises from './Leg_Raises.jsx'
import Plank from './Plank.jsx'
import Push_ups from './Push_ups.jsx'
import Squat from './Squat.jsx'

import '/index.css'
import { UserAuthContextProvider } from './context/UserAuthContext.jsx'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import LandingPage from './components/LandingPage/LandingPage.jsx'

// (ถ้ามีหน้า Result/History ตามที่เราคุยไว้)
// import WorkoutResult from './components/Program/WorkoutResult.jsx'
import WorkoutHistory from './components/Program/WorkoutHistory.jsx'

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/home", element: <ProtectedRoute><Main /></ProtectedRoute> },
  { path: "/profile", element: <ProtectedRoute><Account /></ProtectedRoute> },
  { path: "/addinfo", element: <ProtectedRoute><AddInfo /></ProtectedRoute> },
  { path: "/updateinfo", element: <ProtectedRoute><UpdateInfo /></ProtectedRoute> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/detail", element: <ProtectedRoute><Detail /></ProtectedRoute> },
  { path: "/detail/:id", element: <ProtectedRoute><Detail /></ProtectedRoute> },

  // ✅ Summary & Recent
  { path: "/recent/:userId", element: <ProtectedRoute><RecentMenu /></ProtectedRoute> },
  { path: "/PoseDetector", element: <ProtectedRoute><PoseDetector /></ProtectedRoute> },
  { path: "/Dumbbell", element: <ProtectedRoute><Dumbbell /></ProtectedRoute> },
  { path: "/Hipe_Raise", element: <ProtectedRoute><Hipe_Raise /></ProtectedRoute> },
  { path: "/Leg_Raises", element: <ProtectedRoute><Leg_Raises /></ProtectedRoute> },
  { path: "/Plank", element: <ProtectedRoute><Plank /></ProtectedRoute> },
  { path: "/Push_ups", element: <ProtectedRoute><Push_ups /></ProtectedRoute> },
  { path: "/Squat", element: <ProtectedRoute><Squat /></ProtectedRoute> },
  { path: "/WorkoutPlayer/:programId", element: <ProtectedRoute><WorkoutPlayer /></ProtectedRoute> },
  { path: "/summary/program/:uid", element: <ProtectedRoute><SummaryProgram /></ProtectedRoute> },

  // ✅ (ตัวเลือก) เพื่อให้ flow จบจาก WorkoutPlayer → Result → History ได้ครบ
  // { path: "/results/:sessionId", element: <ProtectedRoute><WorkoutResult /></ProtectedRoute> },
  { path: "/history/:uid", element: <ProtectedRoute><WorkoutHistory /></ProtectedRoute> },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserAuthContextProvider>
      <RouterProvider router={router} />
    </UserAuthContextProvider>
  </React.StrictMode>,
)
