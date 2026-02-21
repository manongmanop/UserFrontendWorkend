import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./summaryProgram.css";

function formatDuration(totalSeconds) {
    const seconds = Number(totalSeconds) || 0;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    // padStart(2, '0') จะทำให้เลขหลักเดียวมี 0 นำหน้า เช่น 5 -> 05
    return `${m}:${s.toString().padStart(2, '0')}`;
}
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`; // แสดงเป็น m:ss
}
export default function SummaryProgram() {
    const { uid } = useParams();
    const nav = useNavigate();

    const [data, setData] = useState(null);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!uid || uid === "undefined" || uid === "null") {
            setErr("ไม่พบรหัสผู้ใช้ (UID Invalid)");
            setLoading(false);
            return;
        }
        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                setErr("");
                const res = await axios.get(`/api/__summary_internal/program/${uid}`);
                if (!mounted) return;
                setData(res.data);
            } catch (e) {
                if (!mounted) return;
                console.error("Summary Load Error:", e);
                if (e.response && e.response.status === 404) {
                    setErr("ไม่พบประวัติการเล่นล่าสุด (อาจยังบันทึกไม่เสร็จ)");
                } else {
                    setErr(e?.response?.data?.error || e?.message || "โหลดข้อมูลไม่สำเร็จ");
                }
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [uid]);

    if (loading) {
        return (
            <div className="summary-container">
                <div className="summary-loading">
                    <div className="loading-spinner"></div>
                    <p>กำลังประมวลผลสรุป...</p>
                </div>
            </div>
        );
    }

    if (err) {
        return (
            <div className="summary-container">
                <div className="summary-error-section">
                    <div className="error-header">
                        <h1>⚠️ เกิดข้อผิดพลาด</h1>
                        <button
                            className="btn btn-primary"
                            onClick={() => nav("/")}
                        >
                            กลับหน้าหลัก
                        </button>
                    </div>
                    <div className="error-card">
                        <div className="error-message">{err}</div>
                        <div className="error-info">User ID: {String(uid)}</div>
                        <div className="error-actions">
                            <button
                                className="btn btn-primary"
                                onClick={() => window.location.reload()}
                            >
                                ลองใหม่
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => nav(-1)}
                            >
                                กลับไปหน้าเล่น
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;
    const exerciseProgress = ((data.doneExercises / data.totalExercises) * 100).toFixed(0);

    return (
        <div className="summary-container">
            <div className="summary-header">
                <div className="header-content">
                    <h1 className="header-title">🏋️ สรุปผลการออกกำลังกาย</h1>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={() => nav("/home")}
                    >
                        หน้าหลัก
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => nav(`/history/${uid}`)}
                    >
                        ดูประวัติ
                    </button>
                </div>
            </div>

            <div className="summary-grid">
                <div className="stat-card">
                    <div className="stat-icon time-icon">⏱️</div>
                    <div className="stat-content">
                        <div className="stat-label">เวลาที่ใช้</div>
                        <div className="stat-value">
                            {formatDuration(data.totals?.seconds)}
                        </div>
                        <div className="stat-unit">นาที:วินาที</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon calorie-icon">🔥</div>
                    <div className="stat-content">
                        <div className="stat-label">แคลอรี่ที่เผา</div>
                        <div className="stat-value">{data.totals?.calories ? Number(data.totals.calories).toFixed(2) : "0.00"}</div>
                        <div className="stat-unit">kcal</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon exercise-icon">💪</div>
                    <div className="stat-content">
                        <div className="stat-label">จำนวนท่าที่ทำ</div>
                        <div className="stat-value">{data.doneExercises}</div>
                        <div className="stat-unit">จาก {data.totalExercises} ท่า</div>
                    </div>
                </div>
            </div>

            <div className="progress-section">
                <h2 className="progress-title">ความสำเร็จ</h2>
                <div className="progress-bar-container">
                    <div className="progress-bar-bg">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${exerciseProgress}%` }}
                        ></div>
                    </div>
                    <div className="progress-text">{exerciseProgress}% เสร็จสิ้น</div>
                </div>
            </div>

            <div className="summary-footer">
                <p className="footer-message">✨ ยอดเยี่ยม! คุณทำได้ดีมากจริง ๆ</p>
            </div>
        </div>
    );
}