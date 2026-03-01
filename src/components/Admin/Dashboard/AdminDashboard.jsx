import React, { useEffect, useState } from "react";
import axios from "axios";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../../firebase";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "";

function AdminDashboard() {
    const [stats, setStats] = useState({ totalUsers: 0, totalPrograms: 0, totalAdmins: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch users from MongoDB (or Firebase depending on your structure)
                const usersRes = await axios.get(`${API_BASE}/api/users`);
                const programsRes = await axios.get(`${API_BASE}/api/programs`);

                // Fetch admins from Firestore
                const adminSnapshot = await getDocs(collection(db, "admin"));

                setStats({
                    totalUsers: usersRes.data.length || 0,
                    totalPrograms: programsRes.data.length || 0,
                    totalAdmins: adminSnapshot.size || 0
                });
            } catch (err) {
                console.error("Error fetching admin stats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div>กำลังโหลดข้อมูลสรุปผล...</div>;

    return (
        <div>
            <h2 style={{ marginBottom: "20px", color: "#333" }}>Dashboard Overview</h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>

                {/* Card 1: Users */}
                <div style={{ background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderLeft: "5px solid #3b82f6" }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "#6b7280", fontSize: "1rem" }}>ผู้ใช้งานทั้งหมด (Users)</h4>
                    <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "#1f2937" }}>{stats.totalUsers}</p>
                </div>

                {/* Card 2: Programs */}
                <div style={{ background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderLeft: "5px solid #10b981" }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "#6b7280", fontSize: "1rem" }}>โปรแกรมออกกำลังกาย</h4>
                    <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "#1f2937" }}>{stats.totalPrograms}</p>
                </div>

                {/* Card 3: Admins */}
                <div style={{ background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderLeft: "5px solid #f59e0b" }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "#6b7280", fontSize: "1rem" }}>ผู้ดูแลระบบ (Admins)</h4>
                    <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "#1f2937" }}>{stats.totalAdmins}</p>
                </div>

            </div>
        </div>
    );
}

export default AdminDashboard;
