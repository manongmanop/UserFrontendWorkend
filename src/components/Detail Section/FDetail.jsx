import React from 'react'
import '../../App.css';
import Sidebar from '../Sidebar Section/Sidebar';
import Detail from '../Detail Section/Detail/Detail';
import Account from '../Account Section/Account';
import '../style/global.css'
const Main = () => {
  return (
    <div className='container'>
      <Sidebar/>
      <Detail/>
      {/* <Account/> */}
    </div>
  )
}

export default Main