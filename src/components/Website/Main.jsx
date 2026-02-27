import '../../App.css';
// import './main.css'
import Sidebar from '../Sidebar Section/Sidebar';
import Body from '../Body Section/Body';
import '../style/global.css'

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from "../../context/UserAuthContext";
import axios from 'axios';

const Main = () => {
  const { user } = useUserAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user?.uid) return;
      try {
        const res = await axios.get(`/api/users/${user.uid}`);
        const userData = res.data;
        // If fitnessLevel is default 'Beginner' AND not manually set (checking other fields like goal help, but default schema sets Beginner)
        // Better check: our schema sets default 'Beginner'. 
        // Maybe check primaryGoal? If empty, means not onboarded.
        if (!userData.primaryGoal) {
          navigate('/onboarding');
        }
      } catch (e) {
        console.error("Check onboarding error", e);
      }
    };
    checkOnboarding();
  }, [user, navigate]);

  return (
    <div className='container'>
      <Sidebar />
      <Body />
      {/* <Account/> */}
    </div>
  )
}

export default Main