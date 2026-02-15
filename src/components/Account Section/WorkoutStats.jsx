import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUserAuth } from "../../context/UserAuthContext";
import './WorkoutStats.scss';
import { FaFire, FaDumbbell, FaTrophy } from 'react-icons/fa';

// Simple CountUp Hook
const useCountUp = (end, duration = 2000) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime;
        let animationFrame;

        const performAnimation = (time) => {
            if (!startTime) startTime = time;
            const progress = (time - startTime) / duration;

            if (progress < 1) {
                setCount(Math.floor(end * progress));
                animationFrame = requestAnimationFrame(performAnimation);
            } else {
                setCount(end);
            }
        };

        animationFrame = requestAnimationFrame(performAnimation);
        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);

    return count;
};

const WorkoutStats = () => {
    const { user } = useUserAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Animated values
    // We will initialize them after data loads in the render

    useEffect(() => {
        const fetchStats = async () => {
            if (!user?.uid) return;
            try {
                const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://localhost:5000";
                const res = await axios.get(`${API_BASE}/api/stats/dashboard/${user.uid}`);
                setStats(res.data);
            } catch (err) {
                console.error("Failed to fetch stats:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [user]);

    if (loading) return <div className="stats-dashboard"><p>Loading stats...</p></div>;
    if (!stats) return null;

    const { summary, weekly, heatmap } = stats;

    return (
        <div className="stats-dashboard animate-entry">
            <h4><FaTrophy className="text-yellow-500" /> ภาพรวมสถิติ</h4>

            <div className="stats-grid">
                <StatCard
                    icon={<FaFire />}
                    value={summary.totalCalories}
                    label="แคลอรี่ทั้งหมด (kcal)"
                    color="orange"
                    suffix=""
                />
                <StatCard
                    icon={<FaDumbbell />}
                    value={summary.totalWorkouts}
                    label="การออกกำลังกาย (ครั้ง)"
                    color="blue"
                    suffix=""
                />
                <StatCard
                    icon={<FaTrophy />}
                    value={weekly.total}
                    label={`เป้าหมายสัปดาห์นี้ (${weekly.total}/${weekly.goal})`}
                    color="green"
                    suffix=""
                    isGoal
                    goal={weekly.goal}
                />
            </div>

            <div className="dashboard-row">
                <div className="weekly-goal-card">
                    <h5>ความคืบหน้าสัปดาห์นี้</h5>
                    <WeeklyProgress weekly={weekly} />
                </div>

                {/* Heatmap could go here or separate row. Let's put a simple heatmap visualization */}
                <div className="heatmap-card">
                    <h5>ความสม่ำเสมอ</h5>
                    <SimpleHeatmap heatmap={heatmap} />
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon, value, label, color, suffix, isGoal, goal }) => {
    const count = useCountUp(value);

    return (
        <div className={`stat-card ${color}`}>
            <div className={`icon-wrapper ${color}`}>
                {icon}
            </div>
            <div className="stat-value">
                {count}{suffix} {isGoal && <span style={{ fontSize: '0.6em', color: '#a0aec0' }}>/ {goal}</span>}
            </div>
            <div className="stat-label">{label}</div>
        </div>
    );
};

const WeeklyProgress = ({ weekly }) => {
    const { total, goal, days, remainingDays } = weekly;
    const percent = Math.min((total / goal) * 100, 100);

    // Days of week labels
    const daysLabel = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
    const todayIndex = (new Date().getDay() + 6) % 7; // Mon=0, Sun=6

    return (
        <div className="weekly-progress">
            <div className="progress-header">
                <span>{total} / {goal} ครั้ง</span>
                <span className="days-left">เหลืออีก {remainingDays} วัน</span>
            </div>

            <div className="week-days">
                {daysLabel.map((label, idx) => {
                    const isWorked = days.includes(idx);
                    const isToday = idx === todayIndex;
                    return (
                        <div key={idx} className={`day-dot ${isWorked ? 'active' : ''} ${isToday ? 'today' : ''}`}>
                            {label}
                        </div>
                    );
                })}
            </div>

            <div className="progress-bar-container">
                <div
                    className={`progress-bar-fill ${percent >= 100 ? 'success' : 'primary'}`}
                    style={{ width: `${percent}%` }}
                ></div>
            </div>
        </div>
    );
};

// Simplified Heatmap (just showing last 28 days grid for simplicity)
const SimpleHeatmap = ({ heatmap }) => {
    // Generate last 28 days
    const days = [];
    for (let i = 27; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const match = heatmap.find(h => h.date === dateStr);
        days.push({
            date: dateStr,
            intensity: match ? match.intensity : 0
        });
    }

    return (
        <div className="heatmap-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {days.map((d, i) => (
                <div
                    key={d.date}
                    className={`heatmap-cell level-${d.intensity}`}
                    title={d.date}
                ></div>
            ))}
        </div>
    );
};

export default WorkoutStats;
