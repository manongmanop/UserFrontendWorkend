import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useUserAuth } from "../../context/UserAuthContext";
import './Onboarding.scss';
import Swal from 'sweetalert2';

const Onboarding = () => {
    const { user } = useUserAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        fitnessLevel: 'Beginner', // Beginner, Intermediate, Advanced
        primaryGoal: '',
        preferredDays: []
    });

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleFinish = async () => {
        if (!user?.uid) return;
        setLoading(true);

        try {
            // Calculate weekly goal based on level
            let weeklyGoal = 3;
            if (formData.fitnessLevel === 'Intermediate') weeklyGoal = 5;
            if (formData.fitnessLevel === 'Advanced') weeklyGoal = 7;

            const payload = {
                uid: user.uid,
                ...formData,
                weeklyGoal,
                workoutsDone: 0, // Reset or Init
                caloriesBurned: 0 // Reset or Init
            };

            // Create or Update User
            await axios.post('/api/users', payload);

            Swal.fire({
                icon: 'success',
                title: 'Plan Created!',
                text: 'Your personalized workout plan is ready.',
                timer: 1500,
                showConfirmButton: false
            });

            navigate('/account');

        } catch (err) {
            console.error("Onboarding Error:", err);
            // If 409 (User exists), try PUT? Or just ignore since POST handles upsert logic in some designs, 
            // but our server code returns 409. 
            // Let's assume we use PUT if user exists or modify POST to upsert. 
            // Current server POST returns 409 if exists. Let's try PUT if 409.
            if (err.response?.status === 409) {
                try {
                    let weeklyGoal = 3;
                    if (formData.fitnessLevel === 'Intermediate') weeklyGoal = 5;
                    if (formData.fitnessLevel === 'Advanced') weeklyGoal = 7;

                    await axios.put(`/api/users/${user.uid}`, {
                        ...formData,
                        weeklyGoal
                    });
                    navigate('/account');
                } catch (e) {
                    Swal.fire('Error', 'Failed to save profile', 'error');
                }
            } else {
                Swal.fire('Error', 'Something went wrong', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const updateData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleDay = (day) => {
        setFormData(prev => {
            const days = prev.preferredDays.includes(day)
                ? prev.preferredDays.filter(d => d !== day)
                : [...prev.preferredDays, day];
            return { ...prev, preferredDays: days };
        });
    };

    return (
        <div className="onboarding-container">
            <div className="onboarding-card">
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(step / 5) * 100}%` }}></div>
                </div>

                {/* Step 1: Welcome */}
                {step === 1 && (
                    <div className="step-content">
                        <h1>Welcome to Fitness App!</h1>
                        <p>Let's create your personalized workout plan in just a few steps.</p>
                        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                            <img src="https://cdni.iconscout.com/illustration/premium/thumb/workout-plan-4439126-3728639.png" alt="Workout" style={{ maxWidth: '200px' }} />
                        </div>
                        <div className="action-buttons">
                            <button className="btn-primary" onClick={nextStep}>Get Started</button>
                        </div>
                    </div>
                )}

                {/* Step 2: Fitness Level */}
                {step === 2 && (
                    <div className="step-content">
                        <h2>Your Fitness Level</h2>
                        <div className="selection-grid">
                            <div
                                className={`fitness-level-card ${formData.fitnessLevel === 'Beginner' ? 'selected' : ''}`}
                                onClick={() => updateData('fitnessLevel', 'Beginner')}
                            >
                                <div className="level-header">
                                    <h3>🌱 Beginner</h3>
                                    <span className="level-icon">3 Days/Week</span>
                                </div>
                                <div className="level-details">
                                    <span>20-30 Mins</span>
                                    <span>Build Habit</span>
                                </div>
                            </div>

                            <div
                                className={`fitness-level-card ${formData.fitnessLevel === 'Intermediate' ? 'selected' : ''}`}
                                onClick={() => updateData('fitnessLevel', 'Intermediate')}
                            >
                                <div className="level-header">
                                    <h3>🔥 Intermediate</h3>
                                    <span className="level-icon">5 Days/Week</span>
                                </div>
                                <div className="level-details">
                                    <span>35-45 Mins</span>
                                    <span>Build Muscle</span>
                                </div>
                            </div>

                            <div
                                className={`fitness-level-card ${formData.fitnessLevel === 'Advanced' ? 'selected' : ''}`}
                                onClick={() => updateData('fitnessLevel', 'Advanced')}
                            >
                                <div className="level-header">
                                    <h3>💎 Advanced</h3>
                                    <span className="level-icon">7 Days/Week</span>
                                </div>
                                <div className="level-details">
                                    <span>45-60 Mins</span>
                                    <span>Max Performance</span>
                                </div>
                            </div>
                        </div>
                        <div className="action-buttons">
                            <button className="btn-secondary" onClick={prevStep}>Back</button>
                            <button className="btn-primary" onClick={nextStep}>Next</button>
                        </div>
                    </div>
                )}

                {/* Step 3: Primary Goal */}
                {step === 3 && (
                    <div className="step-content">
                        <h2>What is your main goal?</h2>
                        <div className="selection-grid">
                            {['Lose Weight', 'Build Muscle', 'Stay Healthy', 'Increase Strength', 'Improve Endurance'].map(goal => (
                                <div
                                    key={goal}
                                    className={`goal-option ${formData.primaryGoal === goal ? 'selected' : ''}`}
                                    onClick={() => updateData('primaryGoal', goal)}
                                >
                                    <input
                                        type="radio"
                                        name="goal"
                                        checked={formData.primaryGoal === goal}
                                        readOnly
                                    />
                                    <label>{goal}</label>
                                </div>
                            ))}
                        </div>
                        <div className="action-buttons">
                            <button className="btn-secondary" onClick={prevStep}>Back</button>
                            <button className="btn-primary" disabled={!formData.primaryGoal} onClick={nextStep}>Next</button>
                        </div>
                    </div>
                )}

                {/* Step 4: Preferred Days */}
                {step === 4 && (
                    <div className="step-content">
                        <h2>Which days do you workout?</h2>
                        <p>Select the days you prefer to exercise.</p>
                        <div className="days-grid">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                <div key={day} className="day-checkbox">
                                    <input
                                        type="checkbox"
                                        id={day}
                                        checked={formData.preferredDays.includes(day)}
                                        onChange={() => toggleDay(day)}
                                    />
                                    <label htmlFor={day}>{day.slice(0, 3)}</label>
                                </div>
                            ))}
                        </div>
                        <div className="action-buttons">
                            <button className="btn-secondary" onClick={prevStep}>Back</button>
                            <button className="btn-primary" onClick={nextStep}>Next</button>
                        </div>
                    </div>
                )}

                {/* Step 5: Summary */}
                {step === 5 && (
                    <div className="step-content">
                        <h2>Your Personalized Plan</h2>
                        <div className="summary-box">
                            <div className="summary-item">
                                <strong>Level</strong>
                                <span>{formData.fitnessLevel}</span>
                            </div>
                            <div className="summary-item">
                                <strong>Weekly Goal</strong>
                                <span>{formData.fitnessLevel === 'Beginner' ? 3 : formData.fitnessLevel === 'Intermediate' ? 5 : 7} Workouts</span>
                            </div>
                            <div className="summary-item">
                                <strong>Main Goal</strong>
                                <span>{formData.primaryGoal}</span>
                            </div>
                            <div className="summary-item">
                                <strong>Schedule</strong>
                                <span>{formData.preferredDays.length > 0 ? formData.preferredDays.join(', ') : 'Flexible'}</span>
                            </div>
                        </div>
                        <div className="action-buttons">
                            <button className="btn-secondary" onClick={prevStep}>Edit</button>
                            <button className="btn-primary" onClick={handleFinish} disabled={loading}>
                                {loading ? 'Creating Plan...' : 'Confirm & Start'}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Onboarding;
