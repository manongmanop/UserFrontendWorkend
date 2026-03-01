import React, { useEffect, useRef, useState } from 'react';
import * as Pose from '@mediapipe/pose';
import * as cam from '@mediapipe/camera_utils';

const CurlCounter = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // State variables
  const [counterLeft, setCounterLeft] = useState(0);
  const [counterRight, setCounterRight] = useState(0);
  const [sets, setSets] = useState(0);
  const [targetReps, setTargetReps] = useState(1);
  const [targetSets, setTargetSets] = useState(2);
  const [setRestTime, setSetRestTime] = useState(5);
  const [resting, setResting] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [isConfigured, setIsConfigured] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [workoutComplete, setWorkoutComplete] = useState(false);

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

  // New state for position tracking
  const [positionValid, setPositionValid] = useState(false);
  const [bodyTilt, setBodyTilt] = useState("Straight");
  const [leftArmPosition, setLeftArmPosition] = useState("Neutral");
  const [rightArmPosition, setRightArmPosition] = useState("Neutral");
  const [stance, setStance] = useState("Normal");

  // TTS and AI refs
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
    },
    {
      role: "user",
      parts: [{ text: "20" }]
    },
    {
      role: "model",
      parts: [{ text: "เหลืออีก 10 องศา! เพิ่มอีกหน่อยนะ!" }]
    },
    {
      role: "user",
      parts: [{ text: "33" }]
    },
    {
      role: "model",
      parts: [{ text: "เก่งมาก! เกินมา 3 องศา! ลดลงอีกหน่อย แล้วคุณจะไปถึงเป้าหมาย!" }]
    },
    {
      role: "user",
      parts: [{ text: "100" }]
    },
    {
      role: "model",
      parts: [{ text: "โอ้โห! เกินมาเยอะเลย! ลดลง 70 องศานะ! สู้ๆ!" }]
    },
    {
      role: "user",
      parts: [{ text: "29" }]
    },
    {
      role: "model",
      parts: [{ text: "ยอดเยี่ยม! อีกนิดเดียว! เพิ่มอีก 1 องศา คุณก็ถึงเป้าหมายแล้ว!" }]
    }
  ]);

  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;


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
    } else if (angle >= 20 && angle <= 40) {
      return '#00ff00ff'; // Green
    } else if ((angle > 40 && angle < 160) || angle < 20) {
      return '#FFFF00'; // Yellow
    }
    return '#ffffffff'; // White (fallback)
  };

  // Check if user is in correct position
  const checkPositionValidity = (landmarks) => {
    const requiredLandmarks = [
      11, // LEFT_SHOULDER
      12, // RIGHT_SHOULDER
      23, // LEFT_HIP
      24, // RIGHT_HIP
      // 27, // LEFT_ANKLE
      // 28  // RIGHT_ANKLE
    ];

    // Check if all required landmarks have high visibility
    const valid = requiredLandmarks.every(index =>
      landmarks[index] && landmarks[index].visibility > 0.8
    );

    return valid;
  };

  // Check body tilt
  const checkBodyTilt = (landmarks) => {
    const leftShoulder = landmarks[12];
    const rightShoulder = landmarks[11];

    if (!leftShoulder || !rightShoulder) return "Unknown";

    const shoulderDiffY = leftShoulder.y - rightShoulder.y;
    const threshold = 0.03;

    if (shoulderDiffY > threshold) {
      return "Leaning Right";
    } else if (shoulderDiffY < -threshold) {
      return "Leaning Left";
    } else {
      return "Straight";
    }
  };

  // Get arm position relative to shoulder
  const getArmPosition = (dist) => {
    if (dist > 0.25) {
      return "Wide";
    } else if (dist < 0.08) {
      return "Narrow";
    } else {
      return "Neutral";
    }
  };

  // Check arms position
  const checkArmsPosition = (landmarks) => {
    const leftShoulder = landmarks[12];
    const rightShoulder = landmarks[11];
    const leftWrist = landmarks[16];
    const rightWrist = landmarks[15];

    if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist) {
      return { left: "Unknown", right: "Unknown" };
    }

    const leftHandDist = Math.abs(leftWrist.x - leftShoulder.x);
    const rightHandDist = Math.abs(rightWrist.x - rightShoulder.x);

    return {
      left: getArmPosition(leftHandDist),
      right: getArmPosition(rightHandDist)
    };
  };

  // Check stance width
  const checkStance = (landmarks) => {
    const leftAnkle = landmarks[28];
    const rightAnkle = landmarks[27];

    if (!leftAnkle || !rightAnkle) return "Unknown";

    const ankleDistance = Math.abs(leftAnkle.x - rightAnkle.x);

    if (ankleDistance > 0.10) {
      return "Wide";
    } else if (ankleDistance < 0.04) {
      return "Narrow";
    } else {
      return "Normal";
    }
  };

  // Gemini API call
  // Gemini API call - Updated to use gemini-2.0-flash-lite
  const callGeminiAPI = async (angle) => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            ...chatHistory.current,
            {
              role: "user",
              parts: [{ text: Math.round(angle).toString() }]
            }
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

      // Update chat history
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

  useEffect(() => {
    const pose = new Pose.Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: false,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });

    const onResults = (results) => {
      const canvasCtx = canvasRef.current.getContext('2d');
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      // Flip canvas horizontally
      canvasCtx.translate(canvasRef.current.width, 0);
      canvasCtx.scale(-1, 1);

      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

      if (results.poseLandmarks) {
        const landmarks = results.poseLandmarks;

        // Check position validity and body metrics
        const isValid = checkPositionValidity(landmarks);
        setPositionValid(isValid);

        const tilt = checkBodyTilt(landmarks);
        setBodyTilt(tilt);

        const armsPos = checkArmsPosition(landmarks);
        setLeftArmPosition(armsPos.left);
        setRightArmPosition(armsPos.right);

        const stanceWidth = checkStance(landmarks);
        setStance(stanceWidth);

        // Left arm processing
        const shoulderLeft = landmarks[11];
        const elbowLeft = landmarks[13];
        const wristLeft = landmarks[15];

        if (shoulderLeft && elbowLeft && wristLeft) {
          const angleLeft = calculateAngle(shoulderLeft, elbowLeft, wristLeft);
          const colorLeft = getColorForAngle(angleLeft);

          // Draw only left arm connections (shoulder -> elbow -> wrist)
          drawArmConnections(canvasCtx, [shoulderLeft, elbowLeft, wristLeft], {
            color: colorLeft,
            lineWidth: 4
          });

          // Draw colored landmarks for left arm
          drawSpecificLandmarks(canvasCtx, [shoulderLeft, elbowLeft, wristLeft], {
            color: colorLeft,
            radius: 8
          });

          // Display angle text
          // canvasCtx.fillStyle = '#FFFFFF';
          // canvasCtx.font = '20px Arial';
          // canvasCtx.fillText(
          //   `LEFT: ${angleLeft.toFixed(2)}°`,
          //   elbowLeft.x * canvasRef.current.width - 50,
          //   elbowLeft.y * canvasRef.current.height - 10
          // );

          // Left arm curl logic with hold timer
          if (angleLeft > 160) {
            stageLeft.current = "down";
            isTimingLeft.current = false;
            holdTimeLeft.current = 0;
          } else if (angleLeft >= 20 && angleLeft <= 40 && stageLeft.current === "down") {
            if (!isTimingLeft.current) {
              timerStartLeft.current = Date.now();
              isTimingLeft.current = true;
            }

            const currentHoldTime = (Date.now() - timerStartLeft.current) / 1000;
            const totalHoldTime = holdTimeLeft.current + currentHoldTime;

            if (totalHoldTime >= holdTimeRequiredLeft.current) {
              stageLeft.current = "up";
              setCounterLeft(prev => prev + 1);
              isTimingLeft.current = false;
              holdTimeLeft.current = 0;

              // Process with AI
              processGeminiAndTTS(Math.round(angleLeft));
            }
          } else if ((angleLeft > 40 && angleLeft < 160) || angleLeft < 20) {
            if (isTimingLeft.current) {
              holdTimeLeft.current += (Date.now() - timerStartLeft.current) / 1000;
              isTimingLeft.current = false;
            }
          }
        }

        // Right arm processing
        const shoulderRight = landmarks[12];
        const elbowRight = landmarks[14];
        const wristRight = landmarks[16];

        if (shoulderRight && elbowRight && wristRight) {
          const angleRight = calculateAngle(shoulderRight, elbowRight, wristRight);
          const colorRight = getColorForAngle(angleRight);

          // Draw only right arm connections (shoulder -> elbow -> wrist)
          drawArmConnections(canvasCtx, [shoulderRight, elbowRight, wristRight], {
            color: colorRight,
            lineWidth: 4
          });

          // Draw colored landmarks for right arm
          drawSpecificLandmarks(canvasCtx, [shoulderRight, elbowRight, wristRight], {
            color: colorRight,
            radius: 8
          });

          // Display angle text
          // canvasCtx.fillStyle = '#FFFFFF';
          // canvasCtx.font = '20px Arial';
          // canvasCtx.fillText(
          //   `RIGHT: ${angleRight.toFixed(2)}°`,
          //   elbowRight.x * canvasRef.current.width - 50,
          //   elbowRight.y * canvasRef.current.height - 10
          // );

          // Right arm curl logic with hold timer
          if (angleRight > 160) {
            stageRight.current = "down";
            isTimingRight.current = false;
            holdTimeRight.current = 0;
          } else if (angleRight >= 20 && angleRight <= 40 && stageRight.current === "down") {
            if (!isTimingRight.current) {
              timerStartRight.current = Date.now();
              isTimingRight.current = true;
            }

            const currentHoldTime = (Date.now() - timerStartRight.current) / 1000;
            const totalHoldTime = holdTimeRight.current + currentHoldTime;

            if (totalHoldTime >= holdTimeRequiredRight.current) {
              stageRight.current = "up";
              setCounterRight(prev => prev + 1);
              isTimingRight.current = false;
              holdTimeRight.current = 0;

              // Process with AI
              processGeminiAndTTS(Math.round(angleRight));
            }
          } else if ((angleRight > 40 && angleRight < 160) || angleRight < 20) {
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
          if (videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
            try {
              await pose.send({ image: videoRef.current });
            } catch (e) {
              console.warn("Pose send error:", e);
            }
          }
        },
        width: 640,
        height: 480
      });
      camera.start();
    }

    // Drawing utilities
    const drawConnectors = (ctx, landmarks, connections, style) => {
      if (!landmarks) return;

      ctx.save();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.lineWidth || 2;

      for (const connection of connections) {
        const from = landmarks[connection[0]];
        const to = landmarks[connection[1]];

        if (from && to) {
          ctx.beginPath();
          ctx.moveTo(from.x * ctx.canvas.width, from.y * ctx.canvas.height);
          ctx.lineTo(to.x * ctx.canvas.width, to.y * ctx.canvas.height);
          ctx.stroke();
        }
      }
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

    // Drawing function for arm connections only
    const drawArmConnections = (ctx, points, style) => {
      if (!points || points.length < 2) return;

      ctx.save();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.lineWidth || 4;

      ctx.beginPath();
      // Draw connection from shoulder to elbow
      ctx.moveTo(points[0].x * ctx.canvas.width, points[0].y * ctx.canvas.height);
      ctx.lineTo(points[1].x * ctx.canvas.width, points[1].y * ctx.canvas.height);
      // Draw connection from elbow to wrist
      ctx.lineTo(points[2].x * ctx.canvas.width, points[2].y * ctx.canvas.height);
      ctx.stroke();
      ctx.restore();
    };

    // ฟังก์ชันใหม่สำหรับวาดเส้นระหว่าง landmark
    // const drawSpecificLandmarks = (ctx, points, style) => {
    //   if (!points || points.length < 2) return;

    //   ctx.save();
    //   ctx.strokeStyle = style.color;
    //   ctx.lineWidth = style.lineWidth || 4;

    //   ctx.beginPath();
    //   ctx.moveTo(points[0].x * ctx.canvas.width, points[0].y * ctx.canvas.height);
    //   for (let i = 1; i < points.length; i++) {
    //     ctx.lineTo(points[i].x * ctx.canvas.width, points[i].y * ctx.canvas.height);
    //   }
    //   ctx.stroke();
    //   ctx.restore();
    // };

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

    return () => {
      if (restInterval.current) {
        clearInterval(restInterval.current);
      }
    };
  }, [isConfigured, resting, workoutComplete, geminiApiKey, openaiApiKey]);

  // Check if set is complete
  useEffect(() => {
    if (counterLeft >= targetReps && counterRight >= targetReps && !resting && !workoutComplete) {
      setSets(prev => {
        const newSets = prev + 1;
        if (newSets >= targetSets) {
          setWorkoutComplete(true);
        } else {
          startRestPeriod();
        }
        return newSets;
      });
    }
  }, [counterLeft, counterRight, targetReps, sets, targetSets, resting, workoutComplete]);

  const resetWorkout = () => {
    setCounterLeft(0);
    setCounterRight(0);
    setSets(0);
    setResting(false);
    setWorkoutComplete(false);
    setRestTimeRemaining(0);
    holdTimeLeft.current = 0;
    holdTimeRight.current = 0;
    isTimingLeft.current = false;
    isTimingRight.current = false;
    if (restInterval.current) {
      clearInterval(restInterval.current);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="relative mb-6">
        <video
          style={{ display: "none" }}
          ref={videoRef}
          className="hidden"
          width="640"
          height="480"
        />
        <canvas
          ref={canvasRef}
          className="border-2 border-gray-600 rounded-lg shadow-xl"
          width="640"
          height="480"
        />
      </div>
    </div>
  );
};

export default CurlCounter;