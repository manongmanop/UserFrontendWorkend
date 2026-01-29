import React, { useRef, useMemo } from 'react';
import { useDumbbellCamera } from './Dumbbell';
import { useSquatCamera } from './Squat';
import { usePushUpCamera } from './Push_ups';
import { useHipRaiseCamera } from './Hipe_Raise';
import { useLegRaiseCamera } from './Leg_Raises';
import { usePlankCamera } from './Plank';

/**
 * ExerciseCameraManager - ตัวจัดการกล้องแบบ Dynamic
 * จะโหลด logic ตามชื่อท่าออกกำลังกาย
 */
export const ExerciseCameraManager = ({ 
  exerciseName, 
  isActive, 
  targetReps = null,
  targetSets = null,
  targetTimePerSet = null,
  setRestTime = 30,
  onRepComplete,
  onSetComplete,
  onWorkoutComplete,
  onTimeUpdate
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // เลือก Hook ตามชื่อท่า (ใช้ useMemo เพื่อป้องกันการ re-create function)
  const getExerciseHook = useMemo(() => {
    const name = exerciseName?.toLowerCase() || '';
    
    if (name.includes('dumbbell') || name.includes('curl')) {
      return useDumbbellCamera;
    } else if (name.includes('squat')) {
      return useSquatCamera;
    } else if (name.includes('push')) {
      return usePushUpCamera;
    } else if (name.includes('leg') && name.includes('raise')) {
      return useLegRaiseCamera;
    } else if (name.includes('hip')) {
      return useHipRaiseCamera;
    } else if (name.includes('plank')) {
      return usePlankCamera;
    }
    
    // Default fallback hook
    return null;
  }, [exerciseName]);

  // ตรวจสอบว่าเป็นท่า time-based (เช่น Plank) หรือ rep-based
  const isTimeBased = useMemo(() => {
    const name = exerciseName?.toLowerCase() || '';
    return name.includes('plank') || name.includes('hold');
  }, [exerciseName]);

  // เรียกใช้ Hook ที่เลือก
  const exerciseData = getExerciseHook ? getExerciseHook({
    videoRef,
    canvasRef,
    isActive,
    targetReps: isTimeBased ? null : targetReps,
    targetSets,
    targetTimePerSet: isTimeBased ? targetTimePerSet : null,
    setRestTime,
    onRepComplete,
    onSetComplete,
    onWorkoutComplete,
    onTimeUpdate
  }) : { 
    counterLeft: 0, 
    counterRight: 0, 
    elapsedTime: 0,
    plankState: 'not_in_position',
    resting: false,
    restTimeRemaining: 0
  };

  // Destructure data ตามประเภทของท่า
  const {
    counterLeft = 0,
    counterRight = 0,
    elapsedTime = 0,
    plankState,
    sets = 0,
    resting = false,
    restTimeRemaining = 0,
    workoutComplete = false,
    formatTime
  } = exerciseData;

  return (
    <div className="exercise-camera-container">
      {/* Video Element (ซ่อนไว้) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          opacity: 0,
          width: 0,
          height: 0,
          pointerEvents: "none",
        }}
      />
      
      {/* Canvas สำหรับแสดงผล */}
      <canvas
        ref={canvasRef}
        width="640"
        height="480"
        className="wp-camera-feed"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '12px'
        }}
      />

      {/* แสดงจำนวนครั้ง */}
      <div className="rep-counter-overlay" style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(0,0,0,0.7)',
        padding: '12px 24px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '18px',
        display: counterLeft > 0 || counterRight > 0 ? 'block' : 'none'
      }}>
        {counterLeft > 0 && <div>Left: {counterLeft}/{targetReps}</div>}
        {counterRight > 0 && <div>Right: {counterRight}/{targetReps}</div>}
      </div>
    </div>
  );
};