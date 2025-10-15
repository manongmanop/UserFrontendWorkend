// import React from 'react'
import './body.css'
import Bottom from './BottomSection/Bottom'
import WorkoutDashboard from './BottomSection/WorkoutDashboard'
import { Top } from './TopSection/Top'
import '../style/global.css'

function body() {
  return (
    <div className='body'>
        <Top/>
        <WorkoutDashboard/>
    </div>
  )
}

export default body