import { useEffect, useRef, useState } from 'react';
import * as Pose from '@mediapipe/pose';
import * as cam from '@mediapipe/camera_utils';

export const useLegRaiseCamera = ({ 
  videoRef, 
  canvasRef, 
  isActive,
  targetReps = null,
  targetSets = null,
  setRestTime = null,
  onRepComplete,
  onSetComplete,
  onWorkoutComplete
}) => {
  // State variables
  const [counterLeft, setCounterLeft] = useState(0);
  const [counterRight, setCounterRight] = useState(0);
  const [sets, setSets] = useState(0);
  // const [resting, setResting] = useState(false);
  // const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [workoutComplete, setWorkoutComplete] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Refs for tracking state
  const stageLeft = useRef(null);
  const stageRight = useRef(null);
  const isTimingLeft = useRef(false);
  const isTimingRight = useRef(false);
  const holdTimeLeft = useRef(0);
  const holdTimeRight = useRef(0);
  const timerStartLeft = useRef(0);
  const timerStartRight = useRef(0);
  const holdTimeRequiredLeft = useRef(2);
  const holdTimeRequiredRight = useRef(2);
  const restEndTime = useRef(0);
  const restInterval = useRef(null);

  // Database refs - for storing angle data
  const angleDataRight = useRef([]);
  const angleDataLeft = useRef([]);

  // Camera and Pose refs
  const cameraRef = useRef(null);
  const poseRef = useRef(null);

  // TTS and AI refs
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const ttsQueue = useRef([]);
  const isProcessingTTS = useRef(false);
  const instructions = "Voice: High-energy, upbeat, and encouraging, projecting enthusiasm and motivation.\n\nPunctuation: Short, punchy sentences with strategic pauses to maintain excitement and clarity.\n\nDelivery: Fast-paced and dynamic, with rising intonation to build momentum and keep engagement high.\n\nPhrasing: Action-oriented and direct, using motivational cues to push participants forward.\n\nTone: Positive, energetic, and empowering, creating an atmosphere of encouragement and achievement.";
  const chatHistory = useRef([
    {
      role: "user",
      parts: [{ text: "ค่ามุมองศาอยู่ที่ 100 มุมองศา หากค่ามากกว่าหรือน้อยกว่าให้ส่งข้อความบอกให้เพิ่มหรือลดตามจำนวนที่ขาดหรือเกิน" }]
    },
    {
      role: "model",
      parts: [{ text: "มุม 100 องศา! ดีมาก! ถ้าต้องการปรับค่า, ทำตามนี้เลย: * **ค่าเกิน:** ลดลง [จำนวนที่เกิน] องศา * **ค่าขาด:** เพิ่มขึ้น [จำนวนที่ขาด] องศา คุณทำได้! ลุย!" }]
    },
    {
      role: "user",
      parts: [{ text: "90" }]
    },
    {
      role: "model",
      parts: [{ text: "เหลืออีก 10 องศา! เพิ่มอีกหน่อยนะ!" }]
    },
    {
      role: "user",
      parts: [{ text: "103" }]
    },
    {
      role: "model",
      parts: [{ text: "เก่งมาก! เกินมา 3 องศา! ลดลงอีกหน่อย แล้วคุณจะไปถึงเป้าหมาย!" }]
    },
    {
      role: "user",
      parts: [{ text: "170" }]
    },
    {
      role: "model",
      parts: [{ text: "โอ้โห! เกินมาเยอะเลย! ลดลง 70 องศานะ! สู้ๆ!" }]
    },
    {
      role: "user",
      parts: [{ text: "99" }]
    },
    {
      role: "model",
      parts: [{ text: "ยอดเยี่ยม! อีกนิดเดียว! เพิ่มอีก 1 องศา คุณก็ถึงเป้าหมายแล้ว!" }]
    }
  ]);

  const calculateAngle = (a, b, c) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return angle;
  };

  const getColorForAngle = (angle) => {
    if (angle > 160) {
      return '#ff0000ff'; // Red
    } else if (angle >= 90 && angle <= 1200) {
      return '#00ff00ff'; // Green
    } else if ((angle > 120 && angle < 160) || angle < 90) {
      return '#FFFF00'; // Yellow
    }
    return '#ffffffff'; // White (fallback)
  };

  // Save session data to database
  const saveSessionData = async (sessionData) => {
    try {
      setSaveStatus('Saving...');
      const response = await fetch('http://127.0.0.1:8000/api/save-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });

      if (response.ok) {
        setSaveStatus('✓ Data saved successfully!');
        setTimeout(() => setSaveStatus(''), 3000);
        return true;
      } else {
        setSaveStatus('✗ Failed to save data');
        setTimeout(() => setSaveStatus(''), 3000);
        return false;
      }
    } catch (error) {
      console.error('Error saving data:', error);
      setSaveStatus('✗ Error: ' + error.message);
      setTimeout(() => setSaveStatus(''), 3000);
      return false;
    }
  };

  // Gemini API call
  const callGeminiAPI = async (angle) => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            ...chatHistory.current,
            { role: "user", parts: [{ text: Math.round(angle).toString() }] }
          ],
          generationConfig: {
            temperature: 0.8,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 8192,
          }
        })
      });

      if (!response.ok) throw new Error('Gemini API request failed');

      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text;

      chatHistory.current.push(
        { role: "user", parts: [{ text: Math.round(angle).toString() }] },
        { role: "model", parts: [{ text: responseText }] }
      );

      return responseText;
    } catch (error) {
      console.error('Gemini API Error:', error);
      return null;
    }
  };

  // OpenAI TTS API call
  const callTTSAPI = async (text) => {
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini-tts',
          voice: 'ballad',
          input: text,
          instructions,
          speed: 1.5,
          response_format: 'mp3'
        })
      });

      if (!response.ok) throw new Error('OpenAI TTS API request failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      return new Promise((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.play();
      });
    } catch (error) {
      console.error('TTS API Error:', error);
    }
  };

  // Process TTS queue
  const processTTSQueue = async () => {
    if (isProcessingTTS.current || ttsQueue.current.length === 0) return;

    isProcessingTTS.current = true;
    setIsSpeaking(true);

    while (ttsQueue.current.length > 0) {
      const { text } = ttsQueue.current.shift();
      await callTTSAPI(text);
    }

    isProcessingTTS.current = false;
    setIsSpeaking(false);
  };

  // Process angle with Gemini and TTS
  const processGeminiAndTTS = async (angle) => {
    try {
      const responseText = await callGeminiAPI(angle);
      if (responseText) {
        ttsQueue.current.push({ text: responseText });
        processTTSQueue();
      }
    } catch (error) {
      console.error('Error in Gemini or TTS:', error);
    }
  };

  // Start rest period
  const startRestPeriod = () => {
    setResting(true);
    setRestTimeRemaining(setRestTime);
    restEndTime.current = Date.now() + (setRestTime * 1000);
    setCounterLeft(0);
    setCounterRight(0);
    restInterval.current = setInterval(() => {
      const timeLeft = Math.max(0, Math.ceil((restEndTime.current - Date.now()) / 1000));
      setRestTimeRemaining(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(restInterval.current);
        setResting(false);
      }
    }, 1000);
  };

  // Check if set is complete
  useEffect(() => {
    if (counterLeft >= targetReps && counterRight >= targetReps && !workoutComplete) {
      setSets(prev => {
        const newSets = prev + 1;
        if (newSets >= targetSets) {
          setWorkoutComplete(true);

          // Prepare and save session data
          const sessionData = {
            timestamp: new Date().toLocaleString('th-TH', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            set: {
              target_reps: targetReps,
              target_sets: targetSets,
              completed_sets: newSets,
              arm: {
                data_right: angleDataRight.current,
                data_left: angleDataLeft.current
              }
            }
          };

          // Auto save to database
          saveSessionData(sessionData);
          
          if (onWorkoutComplete) {
            onWorkoutComplete(sessionData);
          }
        } else {
          startRestPeriod();
          if (onSetComplete) {
            onSetComplete(newSets);
          }
        }
        return newSets;
      });
    }
  }, [counterLeft, counterRight, targetReps, sets, targetSets, workoutComplete]);

  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current || workoutComplete) {
      return;
    }

    const drawArmConnections = (ctx, points, style) => {
      if (!points || points.length < 2) return;

      ctx.save();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.lineWidth || 4;

      ctx.beginPath();
      ctx.moveTo(points[0].x * ctx.canvas.width, points[0].y * ctx.canvas.height);
      ctx.lineTo(points[1].x * ctx.canvas.width, points[1].y * ctx.canvas.height);
      ctx.lineTo(points[2].x * ctx.canvas.width, points[2].y * ctx.canvas.height);
      ctx.stroke();
      ctx.restore();
    };

    const drawSpecificLandmarks = (ctx, landmarks, style) => {
      if (!landmarks) return;

      ctx.save();
      ctx.fillStyle = style.color;

      for (const landmark of landmarks) {
        if (landmark) {
          ctx.beginPath();
          ctx.arc(
            landmark.x * ctx.canvas.width,
            landmark.y * ctx.canvas.height,
            style.radius || 5,
            0,
            2 * Math.PI
          );
          ctx.fill();
        }
      }
      ctx.restore();
    };

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.style.display = 'block';

          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            const pose = new Pose.Pose({
              locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
              }
            });

            poseRef.current = pose;

            pose.setOptions({
              modelComplexity: 1,
              smoothLandmarks: false,
              minDetectionConfidence: 0.7,
              minTrackingConfidence: 0.7
            });

            const onResults = (results) => {
              if (!canvasRef.current) return;

              const canvasCtx = canvasRef.current.getContext('2d');
              canvasCtx.save();
              canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

              canvasCtx.translate(canvasRef.current.width, 0);
              canvasCtx.scale(-1, 1);

              canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

              if (results.poseLandmarks) {
                const landmarks = results.poseLandmarks;

                // Left arm processing
                const shoulderLeft = landmarks[11];
                const hipLeft = landmarks[23];
                const ankleLeft = landmarks[27];

                if (shoulderLeft && hipLeft && ankleLeft) {
                  const angleLeft = calculateAngle(shoulderLeft, hipLeft, ankleLeft);
                  const colorLeft = getColorForAngle(angleLeft);

                  drawArmConnections(canvasCtx, [shoulderLeft, hipLeft, ankleLeft], {
                    color: colorLeft,
                    lineWidth: 4
                  });

                  drawSpecificLandmarks(canvasCtx, [shoulderLeft, hipLeft, ankleLeft], {
                    color: colorLeft,
                    radius: 8
                  });

                  // Left arm curl logic with hold timer
                  if (angleLeft > 160) {
                    stageLeft.current = "down";
                    isTimingLeft.current = false;
                    holdTimeLeft.current = 0;
                  } else if (angleLeft >= 90 && angleLeft <= 120 && stageLeft.current === "down") {
                    if (!isTimingLeft.current) {
                      timerStartLeft.current = Date.now();
                      isTimingLeft.current = true;
                    }

                    const currentHoldTime = (Date.now() - timerStartLeft.current) / 1000;
                    const totalHoldTime = holdTimeLeft.current + currentHoldTime;

                    if (totalHoldTime >= holdTimeRequiredLeft.current) {
                      stageLeft.current = "up";
                      setCounterLeft(prev => {
                        const newCounter = prev + 1;
                        angleDataLeft.current.push({
                          counter_left: newCounter,
                          angle: Math.round(angleLeft * 100) / 100,
                          timestamp: new Date().toISOString()
                        });
                        
                        if (onRepComplete) onRepComplete('left', newCounter);
                        
                        return newCounter;
                      });
                      isTimingLeft.current = false;
                      holdTimeLeft.current = 0;

                      processGeminiAndTTS(Math.round(angleLeft));
                    }
                  } else if ((angleLeft > 120 && angleLeft < 160) || angleLeft < 90) {
                    if (isTimingLeft.current) {
                      holdTimeLeft.current += (Date.now() - timerStartLeft.current) / 1000;
                      isTimingLeft.current = false;
                    }
                  }
                }

                // Right arm processing
                const shoulderRight = landmarks[12];
                const hipRight = landmarks[24];
                const ankleRight = landmarks[28];

                if (shoulderRight && hipRight && ankleRight) {
                  const angleRight = calculateAngle(shoulderRight, hipRight, ankleRight);
                  const colorRight = getColorForAngle(angleRight);

                  drawArmConnections(canvasCtx, [shoulderRight, hipRight, ankleRight], {
                    color: colorRight,
                    lineWidth: 4
                  });

                  drawSpecificLandmarks(canvasCtx, [shoulderRight, hipRight, ankleRight], {
                    color: colorRight,
                    radius: 8
                  });

                  // Right arm curl logic
                  if (angleRight > 160) {
                    stageRight.current = "down";
                    isTimingRight.current = false;
                    holdTimeRight.current = 0;
                  } else if (angleRight >= 90 && angleRight <= 120 && stageRight.current === "down") {
                    if (!isTimingRight.current) {
                      timerStartRight.current = Date.now();
                      isTimingRight.current = true;
                    }

                    const currentHoldTime = (Date.now() - timerStartRight.current) / 1000;
                    const totalHoldTime = holdTimeRight.current + currentHoldTime;

                    if (totalHoldTime >= holdTimeRequiredRight.current) {
                      stageRight.current = "up";
                      setCounterRight(prev => {
                        const newCounter = prev + 1;
                        angleDataRight.current.push({
                          counter_right: newCounter,
                          angle_right: Math.round(angleRight * 100) / 100,
                          timestamp: new Date().toISOString()
                        });

                        if (onRepComplete) onRepComplete('right', newCounter);

                        return newCounter;
                      });
                      isTimingRight.current = false;
                      holdTimeRight.current = 0;

                      processGeminiAndTTS(Math.round(angleRight));
                    }
                  } else if ((angleRight > 120 && angleRight < 160) || angleRight < 90) {
                    if (isTimingRight.current) {
                      holdTimeRight.current += (Date.now() - timerStartRight.current) / 1000;
                      isTimingRight.current = false;
                    }
                  }
                }
              }
              canvasCtx.restore();
            };

            pose.onResults(onResults);

            if (videoRef.current) {
              const camera = new cam.Camera(videoRef.current, {
                onFrame: async () => {
                  await pose.send({ image: videoRef.current });
                },
                width: 640,
                height: 480
              });
              
              cameraRef.current = camera;
              camera.start();
            }
          };
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Cannot access camera. Please allow camera permission.');
      }
    };

    initCamera();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up camera...');
      
      if (cameraRef.current) {
        try {
          cameraRef.current.stop();
          cameraRef.current = null;
        } catch (error) {
          console.error('Error stopping camera:', error);
        }
      }

      if (poseRef.current) {
        try {
          poseRef.current.close();
          poseRef.current = null;
        } catch (error) {
          console.error('Error closing pose:', error);
        }
      }

      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => {
          track.stop();
          console.log('✅ Stopped track:', track.kind);
        });
        videoRef.current.srcObject = null;
      }

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      if (restInterval.current) {
        clearInterval(restInterval.current);
      }
    };
  }, [isActive, targetReps, workoutComplete]);

  return {
    counterLeft,
    counterRight,
    sets,
    isSpeaking,
    workoutComplete,
    saveStatus,
    angleDataLeft: angleDataLeft.current,
    angleDataRight: angleDataRight.current
  };
};

export default useLegRaiseCamera;