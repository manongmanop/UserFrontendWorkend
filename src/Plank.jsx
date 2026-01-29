import { useEffect, useRef, useState } from 'react';
import * as Pose from '@mediapipe/pose';
import * as cam from '@mediapipe/camera_utils';

export const usePlankCamera = ({ 
  videoRef, 
  canvasRef, 
  isActive,
  targetSets = 3,
  targetTimePerSet = 30, // เวลาเป้าหมายต่อเซ็ต (วินาที)
  onSetComplete,
  onWorkoutComplete
}) => {
  // State variables
  const [plankState, setPlankState] = useState("not_in_position");
  const [currentSet, setCurrentSet] = useState(1);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [setsCompleted, setSetsCompleted] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [workoutComplete, setWorkoutComplete] = useState(false);

  // Refs for tracking state
  const plankStartTime = useRef(null);
  const plankElapsedTime = useRef(0);
  const lastSaveTime = useRef(Date.now());
  const lastGeminiTime = useRef(Date.now());
  const saveInterval = 6000; // บันทึกทุก 6 วินาที
  const geminiInterval = 24000; // ส่ง Gemini ทุก 24 วินาที

  // Database refs - for storing angle data
  const angleDataAvg = useRef([]);

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
      parts: [{ text: "ค่ามุมองศาอยู่ที่ 30 มุมองศา หากค่ามากกว่าหรือน้อยกว่าให้ส่งข้อความบอกให้เพิ่มหรือลดตามจำนวนที่ขาดหรือเกิน" }]
    },
    {
      role: "model",
      parts: [{ text: "มุม 30 องศา! ดีมาก! ถ้าต้องการปรับค่า, ทำตามนี้เลย: * **ค่าเกิน:** ลดลง [จำนวนที่เกิน] องศา * **ค่าขาด:** เพิ่มขึ้น [จำนวนที่ขาด] องศา คุณทำได้! ลุย!" }]
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
    if (angle >= 150 && angle <= 170) {
      return '#00ff00ff'; // Green - ท่าถูกต้อง
    } else if ((angle > 170 && angle <= 180) || angle < 150) {
      return '#FFFF00'; // Yellow - ท่าใกล้เคียง
    } else {
      return '#ff0000ff'; // Red - ท่าไม่ถูกต้อง
    }
  };

  // Format time in MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Gemini API call
  const callGeminiAPI = async (angle) => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
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

  // Update elapsed time display
  useEffect(() => {
    if (plankState === "in_position" && plankStartTime.current && !workoutComplete) {
      const timer = setInterval(() => {
        const currentTime = Date.now();
        const totalElapsed = plankElapsedTime.current + (currentTime - plankStartTime.current) / 1000;
        setElapsedTime(totalElapsed);

        // Check if set is complete
        if (totalElapsed >= targetTimePerSet) {
          setSetsCompleted(prev => {
            const newSets = prev + 1;
            
            if (newSets >= targetSets) {
              setWorkoutComplete(true);
              
              // Prepare session data
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
                  reps: targetTimePerSet,
                  sets: targetSets,
                  arm: {
                    data_avg: angleDataAvg.current
                  }
                }
              };
              
              if (onWorkoutComplete) {
                onWorkoutComplete(sessionData);
              }
            } else {
              if (onSetComplete) {
                onSetComplete(newSets);
              }
              // เริ่มเซ็ตใหม่ทันที
              setCurrentSet(newSets + 1);
            }
            
            return newSets;
          });
          
          plankElapsedTime.current = 0;
          plankStartTime.current = null;
          setPlankState("not_in_position");
        }
      }, 100);

      return () => clearInterval(timer);
    } else if (plankState === "not_in_position") {
      setElapsedTime(plankElapsedTime.current);
    }
  }, [plankState, workoutComplete, targetTimePerSet, targetSets]);

  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) {
      return;
    }

    let isCleanedUp = false;

    // Don't stop camera when workout is complete - let parent component handle it
    const drawConnections = (ctx, points, style) => {
      if (!points || points.length < 3) return;

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

    const drawLandmarks = (ctx, landmarks, style) => {
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
              if (!canvasRef.current || isCleanedUp) return;

              const canvasCtx = canvasRef.current.getContext('2d');
              canvasCtx.save();
              canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

              canvasCtx.translate(canvasRef.current.width, 0);
              canvasCtx.scale(-1, 1);

              canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

              if (results.poseLandmarks) {
                const landmarks = results.poseLandmarks;

                // Get coordinates for both sides
                const shoulderRight = landmarks[11];
                const hipRight = landmarks[23];
                const ankleRight = landmarks[27];

                const shoulderLeft = landmarks[12];
                const hipLeft = landmarks[24];
                const ankleLeft = landmarks[28];

                if (shoulderRight && hipRight && ankleRight && shoulderLeft && hipLeft && ankleLeft) {
                  // Calculate angles
                  const angleRight = calculateAngle(shoulderRight, hipRight, ankleRight);
                  const angleLeft = calculateAngle(shoulderLeft, hipLeft, ankleLeft);
                  const shoulderHipAnkleAvg = (angleRight + angleLeft) / 2;

                  const color = getColorForAngle(shoulderHipAnkleAvg);

                  // Draw right side
                  drawConnections(canvasCtx, [shoulderRight, hipRight, ankleRight], {
                    color: color,
                    lineWidth: 4
                  });

                  drawLandmarks(canvasCtx, [shoulderRight, hipRight, ankleRight], {
                    color: color,
                    radius: 8
                  });

                  // Draw left side
                  drawConnections(canvasCtx, [shoulderLeft, hipLeft, ankleLeft], {
                    color: color,
                    lineWidth: 4
                  });

                  drawLandmarks(canvasCtx, [shoulderLeft, hipLeft, ankleLeft], {
                    color: color,
                    radius: 8
                  });

                  // Plank timing logic
                  if (shoulderHipAnkleAvg >= 150 && shoulderHipAnkleAvg <= 170) {
                    // ท่าถูกต้อง
                    if (plankState !== "in_position") {
                      setPlankState("in_position");
                      plankStartTime.current = Date.now();
                    }
                  } else {
                    // ท่าไม่ถูกต้อง
                    if (plankStartTime.current !== null) {
                      plankElapsedTime.current += (Date.now() - plankStartTime.current) / 1000;
                    }
                    setPlankState("not_in_position");
                    plankStartTime.current = null;
                  }

                  // Save angle data every 6 seconds
                  const currentTime = Date.now();
                  if (currentTime - lastSaveTime.current >= saveInterval) {
                    const totalTimeInt = plankState === "in_position" && plankStartTime.current
                      ? plankElapsedTime.current + (currentTime - plankStartTime.current) / 1000
                      : plankElapsedTime.current;

                    const minutes = Math.floor(totalTimeInt / 60);
                    const seconds = Math.floor(totalTimeInt % 60);
                    const humanReadableTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

                    angleDataAvg.current.push({
                      total_time: totalTimeInt,
                      human_readable_time: humanReadableTime,
                      angle: Math.round(shoulderHipAnkleAvg * 100) / 100
                    });

                    lastSaveTime.current = currentTime;
                  }

                  // Send Gemini message every 24 seconds
                  if (currentTime - lastGeminiTime.current >= geminiInterval) {
                    processGeminiAndTTS(Math.round(shoulderHipAnkleAvg));
                    lastGeminiTime.current = currentTime;
                  }
                }
              }
              canvasCtx.restore();
            };

            pose.onResults(onResults);

            if (videoRef.current) {
              const camera = new cam.Camera(videoRef.current, {
                onFrame: async () => {
                  if (!isCleanedUp && poseRef.current) {
                    await pose.send({ image: videoRef.current });
                  }
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
      isCleanedUp = true;
      
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
    };
  }, [isActive]);

  return {
    plankState,
    currentSet,
    elapsedTime,
    setsCompleted,
    isSpeaking,
    workoutComplete,
    formatTime,
    angleDataAvg: angleDataAvg.current,
    targetTimePerSet,
    targetSets
  };
};

export default usePlankCamera;