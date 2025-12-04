import React, { useEffect, useRef, useState } from 'react';
import * as Pose from '@mediapipe/pose';
import * as cam from '@mediapipe/camera_utils';

const PlankTracker = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // State variables
  const [plankState, setPlankState] = useState("not_in_position"); // "not_in_position", "in_position", "resting"
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [setsCompleted, setSetsCompleted] = useState(0);
  const [targetSets, setTargetSets] = useState(3);
  const [targetTimePerSet, setTargetTimePerSet] = useState(30); // seconds
  const [restTime, setRestTime] = useState(10); // seconds
  const [resting, setResting] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [workoutComplete, setWorkoutComplete] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Refs for tracking
  const plankStartTime = useRef(null);
  const plankElapsedTime = useRef(0);
  const restEndTime = useRef(0);
  const restInterval = useRef(null);
  const lastSaveTime = useRef(Date.now());
  const lastGeminiTime = useRef(Date.now());
  const saveInterval = 6000; // 6 seconds
  const geminiInterval = 24000; // 24 seconds

  // Database refs
  const angleData = useRef([]);

  // TTS and AI refs
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const ttsQueue = useRef([]);
  const isProcessingTTS = useRef(false);
  const instructions = "Voice: High-energy, upbeat, and encouraging, projecting enthusiasm and motivation.\n\nPunctuation: Short, punchy sentences with strategic pauses to maintain excitement and clarity.\n\nDelivery: Fast-paced and dynamic, with rising intonation to build momentum and keep engagement high.\n\nPhrasing: Action-oriented and direct, using motivational cues to push participants forward.\n\nTone: Positive, energetic, and empowering, creating an atmosphere of encouragement and achievement.";
  const chatHistory = useRef([]);

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
      return '#00ff00ff'; // Green - correct plank position
    } else if (angle >= 140 && angle < 150) {
      return '#FFFF00'; // Yellow - almost there
    } else if (angle > 170 && angle <= 180) {
      return '#FFFF00'; // Yellow - too straight
    } else {
      return '#ff0000ff'; // Red - incorrect
    }
  };

  // Format time to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          voice: 'sage',
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
    setRestTimeRemaining(restTime);
    restEndTime.current = Date.now() + (restTime * 1000);
    plankStartTime.current = null;
    plankElapsedTime.current = 0;
    setElapsedTime(0);

    restInterval.current = setInterval(() => {
      const timeLeft = Math.max(0, Math.ceil((restEndTime.current - Date.now()) / 1000));
      setRestTimeRemaining(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(restInterval.current);
        setResting(false);
        setPlankState("not_in_position");
      }
    }, 1000);
  };

  // Update elapsed time display
  useEffect(() => {
    let interval;
    if (plankState === "in_position" && plankStartTime.current && !resting) {
      interval = setInterval(() => {
        const currentTime = Date.now();
        const currentElapsed = plankElapsedTime.current + (currentTime - plankStartTime.current) / 1000;
        setElapsedTime(currentElapsed);
        setTotalTime(currentElapsed);
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [plankState, resting]);

  useEffect(() => {
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

            pose.setOptions({
              modelComplexity: 1,
              smoothLandmarks: true,
              minDetectionConfidence: 0.5,
              minTrackingConfidence: 0.5
            });

            const onResults = (results) => {
              const canvasCtx = canvasRef.current.getContext('2d');
              canvasCtx.save();
              canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

              canvasCtx.translate(canvasRef.current.width, 0);
              canvasCtx.scale(-1, 1);

              canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

              if (results.poseLandmarks && !resting && !workoutComplete) {
                const landmarks = results.poseLandmarks;

                // Get coordinates for plank position
                const shoulderLeft = landmarks[11];
                const hipLeft = landmarks[23];
                const ankleLeft = landmarks[27];

                const shoulderRight = landmarks[12];
                const hipRight = landmarks[24];
                const ankleRight = landmarks[28];

                const kneeLeft = landmarks[25];
                const kneeRight = landmarks[26];

                if (shoulderLeft && hipLeft && ankleLeft && shoulderRight && hipRight && ankleRight) {
                  // Calculate shoulder-hip-ankle angles
                  const angleLeft = calculateAngle(shoulderLeft, hipLeft, ankleLeft);
                  const angleRight = calculateAngle(shoulderRight, hipRight, ankleRight);
                  const shoulderHipAngleAvg = (angleLeft + angleRight) / 2;

                  // Calculate hip angles
                  const hipAngleLeft = calculateAngle(shoulderLeft, hipLeft, kneeLeft);
                  const hipAngleRight = calculateAngle(shoulderRight, hipRight, kneeRight);
                  const hipAngleAvg = (hipAngleLeft + hipAngleRight) / 2;

                  // Calculate knee angles
                  const kneeAngleLeft = calculateAngle(hipLeft, kneeLeft, ankleLeft);
                  const kneeAngleRight = calculateAngle(hipRight, kneeRight, ankleRight);
                  const kneeAngleAvg = (kneeAngleLeft + kneeAngleRight) / 2;

                  const color = getColorForAngle(shoulderHipAngleAvg);

                  // Draw connections for left side
                  drawConnections(canvasCtx, [shoulderLeft, hipLeft, ankleLeft], {
                    color: color,
                    lineWidth: 4
                  });

                  // Draw connections for right side
                  drawConnections(canvasCtx, [shoulderRight, hipRight, ankleRight], {
                    color: color,
                    lineWidth: 4
                  });

                  // Draw landmarks
                  drawSpecificLandmarks(canvasCtx,
                    [shoulderLeft, hipLeft, ankleLeft, shoulderRight, hipRight, ankleRight],
                    { color: color, radius: 8 }
                  );

                  // Display angle
                  // canvasCtx.fillStyle = '#FFFFFF';
                  // canvasCtx.font = '24px Arial';
                  // canvasCtx.fillText(
                  //   `Body Angle: ${shoulderHipAngleAvg.toFixed(1)}°`,
                  //   canvasRef.current.width / 2 - 100,
                  //   50
                  // );

                  // Plank position logic
                  const currentTime = Date.now();

                  if (shoulderHipAngleAvg >= 150 && shoulderHipAngleAvg <= 170) {
                    // Correct plank position
                    if (plankState !== "in_position") {
                      setPlankState("in_position");
                      plankStartTime.current = currentTime;
                    }

                    // Check for Gemini interval
                    if (currentTime - lastGeminiTime.current >= geminiInterval) {
                      processGeminiAndTTS(Math.round(shoulderHipAngleAvg));
                      lastGeminiTime.current = currentTime;
                    }

                    // Check for save interval
                    if (currentTime - lastSaveTime.current >= saveInterval) {
                      const totalElapsed = plankElapsedTime.current + (currentTime - plankStartTime.current) / 1000;
                      angleData.current.push({
                        total_time: Math.round(totalElapsed),
                        human_readable_time: formatTime(totalElapsed),
                        angle: Math.round(shoulderHipAngleAvg * 100) / 100,
                        timestamp: new Date().toISOString()
                      });
                      lastSaveTime.current = currentTime;
                    }
                  } else {
                    // Not in correct position
                    if (plankStartTime.current !== null) {
                      plankElapsedTime.current += (currentTime - plankStartTime.current) / 1000;
                    }
                    setPlankState("not_in_position");
                    plankStartTime.current = null;
                  }

                  // Check if current set is complete
                  if (plankState === "in_position" && plankStartTime.current) {
                    const totalElapsed = plankElapsedTime.current + (currentTime - plankStartTime.current) / 1000;

                    if (totalElapsed >= targetTimePerSet) {
                      setSetsCompleted(prev => {
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
                              reps: targetTimePerSet,
                              sets: targetSets,
                              arm: {
                                data_avg: angleData.current
                              }
                            }
                          };

                          saveSessionData(sessionData);
                        } else {
                          setCurrentSet(prev => prev + 1);
                          startRestPeriod();
                        }
                        return newSets;
                      });
                      plankElapsedTime.current = 0;
                      plankStartTime.current = null;
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
              camera.start();
            }
          };
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Cannot access camera. Please allow camera permission.');
      }
    };

    const drawConnections = (ctx, points, style) => {
      if (!points || points.length < 2) return;

      ctx.save();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.lineWidth || 4;

      ctx.beginPath();
      ctx.moveTo(points[0].x * ctx.canvas.width, points[0].y * ctx.canvas.height);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x * ctx.canvas.width, points[i].y * ctx.canvas.height);
      }
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

    if (!workoutComplete) {
      initCamera();
    }

    return () => {
      if (restInterval.current) {
        clearInterval(restInterval.current);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [resting, workoutComplete, plankState, targetTimePerSet, targetSets, geminiApiKey, openaiApiKey]);

  const resetWorkout = () => {
    setPlankState("not_in_position");
    setElapsedTime(0);
    setTotalTime(0);
    setCurrentSet(1);
    setSetsCompleted(0);
    setResting(false);
    setWorkoutComplete(false);
    setRestTimeRemaining(0);
    setSaveStatus('');
    plankStartTime.current = null;
    plankElapsedTime.current = 0;
    angleData.current = [];
    if (restInterval.current) {
      clearInterval(restInterval.current);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="mb-4 text-center">
        <h1 className="text-3xl font-bold mb-2 text-black">Plank Exercise Tracker</h1>
        <div className="flex gap-4 justify-center items-center flex-wrap">
          <div className="bg-blue-600 px-4 py-2 rounded">
            <p className="text-sm text-black">Time: {formatTime(elapsedTime)}/{targetTimePerSet}s</p>
          </div>
          <div className="bg-purple-600 px-4 py-2 rounded">
            <p className="text-sm text-black">Set: {currentSet}/{targetSets}</p>
          </div>
        </div>
      </div>

      <div className="relative mb-6">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          width="640"
          height="480"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            opacity: 0,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
        />
        <canvas
          ref={canvasRef}
          className="border-2 border-gray-600 rounded-lg shadow-xl"
          width="640"
          height="480"
        />
      </div>

      {/* {workoutComplete && (
        <div className="bg-green-600 px-6 py-4 rounded-lg mb-4">
          <h2 className="text-2xl font-bold mb-2">🎉 Workout Complete!</h2>
          <p>Total sets completed: {setsCompleted}</p>
          <p>Total plank time: {formatTime(totalTime)}</p>
          <p>Data points recorded: {angleData.current.length}</p>
          <button
            onClick={resetWorkout}
            className="mt-4 bg-white text-green-600 px-6 py-2 rounded font-bold hover:bg-gray-200"
          >
            Start New Workout
          </button>
        </div>
      )} */}

    </div>
  );
};

export default PlankTracker;