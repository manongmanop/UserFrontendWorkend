import React, { useMemo, useState } from 'react';
import './WorkoutStats.scss';
import { FaFire, FaDumbbell, FaTrophy, FaChevronLeft, FaChevronRight, FaCheck } from 'react-icons/fa';

const WorkoutStats = ({ userData, workoutHistory = [] }) => {
    // 1. Process Data from Props
    const stats = useMemo(() => {
        const now = new Date();
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay(); // 0 (Sun) - 6 (Sat)
        // Adjust to Monday start
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // Filter for this week
        const thisWeekWorkouts = workoutHistory.filter(h => {
            const d = new Date(h.finishedAt);
            return d >= startOfWeek && d <= endOfWeek;
        });

        // Filter for today
        const todayWorkouts = workoutHistory.filter(h => {
            const d = new Date(h.finishedAt);
            return d.toDateString() === now.toDateString();
        });

        const caloriesToday = todayWorkouts.reduce((sum, h) => sum + (h.caloriesBurned || 0), 0);
        const caloriesWeek = thisWeekWorkouts.reduce((sum, h) => sum + (h.caloriesBurned || 0), 0);

        // Weekly Progress
        const weeklyGoal = userData?.weeklyGoal || 3;
        const workoutsDoneWeek = thisWeekWorkouts.length;

        // Calculate Last Week's Stats
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

        const endOfLastWeek = new Date(endOfWeek);
        endOfLastWeek.setDate(endOfLastWeek.getDate() - 7);

        const lastWeekWorkouts = workoutHistory.filter(h => {
            const d = new Date(h.finishedAt);
            return d >= startOfLastWeek && d <= endOfLastWeek;
        });

        const workoutsDoneLastWeek = lastWeekWorkouts.length;
        let percentageChange = 0;

        if (workoutsDoneLastWeek === 0) {
            percentageChange = workoutsDoneWeek > 0 ? 100 : 0;
        } else {
            percentageChange = ((workoutsDoneWeek - workoutsDoneLastWeek) / workoutsDoneLastWeek) * 100;
        }

        // Map weekdays (Mon=0 to Sun=6)
        const weeklyPattern = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
        thisWeekWorkouts.forEach(h => {
            let d = new Date(h.finishedAt).getDay(); // Sun=0, Mon=1
            let idx = d === 0 ? 6 : d - 1;
            weeklyPattern[idx] = 1;
        });

        return {
            caloriesToday,
            caloriesWeek,
            workoutsDoneWeek,
            weeklyGoal,
            weeklyPattern,
            totalWorkouts: workoutHistory.length,
            percentageChange
        };
    }, [userData, workoutHistory]);

    return (
        <div className="stats-dashboard animate-entry">
            <h4 className="section-title"><FaTrophy className="text-yellow-500" /> ภาพรวมสถิติ</h4>

            {/* 1. Dashboard Cards */}
            <DashboardCards stats={stats} />

            {/* 2. Weekly Progress & Timeline */}
            <WeeklyTimeline stats={stats} preferredDays={userData?.preferredDays || []} />

            {/* 3. Activity Calendar */}
            <ActivityCalendar workoutHistory={workoutHistory} preferredDays={userData?.preferredDays || []} />
        </div>
    );
};

// --- Sub-Components ---

const DashboardCards = ({ stats }) => {
    return (
        <div className="stats-grid">
            {/* Card 1: Calories */}
            <div className="stat-card card-calories">
                <div className="card-header">
                    <div className="icon-wrapper fire-pulse">
                        <FaFire />
                    </div>
                </div>
                <div className="card-content">
                    <div className="main-value">{stats.caloriesToday}</div>
                    <div className="label">แคลอรี่วันนี้</div>
                    <div className="divider"></div>
                    <div className="secondary-info">
                        <div>📊 สัปดาห์นี้: {stats.caloriesWeek}</div>
                        {/* Mock goal for styling demo, or calculate if we had a caloric goal */}
                        <div>🎯 เป้าหมาย: 1500/สัปดาห์</div>
                    </div>
                    {/* Mock Progress */}
                    <div className="progress-bar-mini">
                        <div className="fill" style={{ width: `${Math.min((stats.caloriesWeek / 1500) * 100, 100)}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Card 2: Workouts */}
            <div className="stat-card card-workouts">
                <div className="card-header">
                    <div className="icon-wrapper blue-glow">
                        <FaDumbbell />
                    </div>
                </div>
                <div className="card-content">
                    <div className="main-value">{stats.totalWorkouts}</div>
                    <div className="label">การออกกำลังกายรวม (ครั้ง)</div>
                    <div className="divider"></div>
                    <div className="secondary-info">
                        <div>📅 สัปดาห์นี้: {stats.workoutsDoneWeek} ครั้ง</div>
                        <div className={`trend ${stats.percentageChange >= 0 ? 'positive' : 'negative'}`}>
                            {stats.percentageChange >= 0 ? '📈' : '📉'} {Math.abs(stats.percentageChange).toFixed(0)}% {stats.percentageChange >= 0 ? 'เพิ่มขึ้น' : 'ลดลง'}จากสัปดาห์ก่อน
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const WeeklyTimeline = ({ stats, preferredDays }) => {
    const daysLabel = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
    // Map English days to index 0-6 (Mon-Sun)
    const dayMap = { 'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6 };

    // Determine which days are scheduled
    const scheduledIndices = preferredDays.map(d => dayMap[d]).filter(d => d !== undefined);

    const todayIndex = (new Date().getDay() + 6) % 7; // Mon=0

    return (
        <div className="weekly-timeline-card">
            <div className="section-header">
                <h5>📊 ความคืบหน้าสัปดาห์นี้</h5>
                <div className="meta-info">
                    เป้าหมาย: {stats.weeklyGoal} ครั้ง | ทำแล้ว: <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{stats.workoutsDoneWeek}</span> ครั้ง
                </div>
            </div>

            <div className="timeline-container">
                {/* Line connection (visual only, simplified with dots) */}
                <div className="timeline-line"></div>

                <div className="days-row">
                    {daysLabel.map((label, idx) => {
                        const isDone = stats.weeklyPattern[idx] === 1;
                        const isScheduled = scheduledIndices.includes(idx);
                        const isToday = idx === todayIndex;

                        let statusClass = '';
                        if (isDone) statusClass = 'done';
                        else if (isToday) statusClass = 'today';
                        else if (isScheduled) statusClass = 'scheduled';
                        else statusClass = 'rest';

                        return (
                            <div key={idx} className={`day-node ${statusClass}`}>
                                <div className="node-circle">
                                    {isDone ? <FaCheck /> : (isScheduled || isToday ? '●' : '')}
                                </div>
                                <div className="node-label">{label}</div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="divider" style={{ margin: '1.5rem 0', height: '1px', background: '#e2e8f0' }}></div>

            <div className="goal-progress-section">
                <div className="progress-bar-large" style={{ height: '12px', background: '#f0f0f0', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                    <div className="fill" style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, #4CAF50, #66BB6A)',
                        borderRadius: '6px',
                        width: `${Math.min((stats.workoutsDoneWeek / stats.weeklyGoal) * 100, 100)}%`,
                        transition: 'width 1s ease-out'
                    }}></div>
                </div>
                <div className="goal-status" style={{ fontSize: '0.9rem', color: '#2d3748', textAlign: 'right' }}>
                    {stats.workoutsDoneWeek >= stats.weeklyGoal
                        ? '🎉 ยอดเยี่ยม! คุณทำตามเป้าหมายครบแล้ว'
                        : `🔥 อีก ${stats.weeklyGoal - stats.workoutsDoneWeek} ครั้งจะถึงเป้าหมาย! สู้ๆ`}
                </div>
            </div>
        </div>
    );
};

const ActivityCalendar = ({ workoutHistory }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        // 0 = Sun, 1 = Mon ... 6 = Sat
        // We want Mon = 0, ..., Sun = 6
        const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return (day + 6) % 7;
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    // Generate calendar grid
    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const totalSlots = [...blanks, ...days];

    // Helper to check status of a specific date
    const getDateInfo = (day) => {
        if (!day) return { status: 'empty', intensity: 0, tooltip: '' };

        const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateStr = dateObj.toDateString();
        const now = new Date();
        const isToday = dateStr === now.toDateString();

        const workoutsOnDay = workoutHistory.filter(h => new Date(h.finishedAt).toDateString() === dateStr);
        const count = workoutsOnDay.length;
        const calories = workoutsOnDay.reduce((sum, h) => sum + (h.caloriesBurned || 0), 0);

        let intensity = 0;
        if (count > 0) {
            if (calories > 800) intensity = 4;
            else if (calories > 500) intensity = 3;
            else if (calories > 200) intensity = 2;
            else intensity = 1;
        }

        const thaiMonth = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        const dateTooltip = `${day} ${thaiMonth[currentDate.getMonth()]} ${currentDate.getFullYear() + 543}`;
        const statsTooltip = count > 0 ? `\n${count} กิจกรรม (${calories} kcal)` : '\nไม่มีกิจกรรม';

        return {
            status: isToday ? 'today' : 'neutral',
            intensity,
            tooltip: `${dateTooltip}${statsTooltip}`
        };
    };

    const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

    return (
        <div className="activity-calendar-card">
            <div className="calendar-header">
                <h5>📅 ความสม่ำเสมอ</h5>
                <div className="nav-controls">
                    <button onClick={prevMonth}><FaChevronLeft /></button>
                    <span>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear() + 543}</span>
                    <button onClick={nextMonth}><FaChevronRight /></button>
                </div>
            </div>

            <div className="calendar-grid">
                {/* Headers handled in calendar-grid-days */}
            </div>

            <div className="calendar-grid-days">
                {['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map(d => <div key={d} className="cal-day-header">{d}</div>)}

                {totalSlots.map((day, index) => {
                    const info = getDateInfo(day);
                    return (
                        <div
                            key={index}
                            className={`cal-cell ${info.status} ${day ? `level-${info.intensity}` : 'empty'}`}
                            data-tooltip={info.tooltip}
                        >
                            {/* Visual tweak: if level > 0, hide number or make it white/subtle? SCSS handles color. */}
                            {day}
                        </div>
                    );
                })}
            </div>

            <div className="calendar-legend">
                <span>น้อย</span>
                <div className="legend-squares">
                    <div className="square level-0" style={{ background: '#ebedf0' }}></div>
                    <div className="square level-1" style={{ background: '#9be9a8' }}></div>
                    <div className="square level-2" style={{ background: '#40c463' }}></div>
                    <div className="square level-3" style={{ background: '#30a14e' }}></div>
                    <div className="square level-4" style={{ background: '#216e39' }}></div>
                </div>
                <span>มาก</span>
            </div>
        </div>
    );
};

export default WorkoutStats;
