import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "";

function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/users`);
            setUsers(res.data);
        } catch (err) {
            console.error("Error fetching users:", err);
            Swal.fire("ข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลผู้ใช้งานได้", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async (id, uid) => {
        const result = await Swal.fire({
            title: "แน่ใจหรือไม่?",
            text: "บัญชีผู้ใช้นี้จะถูกลบถาวร รวมถึงข้อมูลประวัติการออกกำลังกาย",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "ลบ",
            cancelButtonText: "ยกเลิก"
        });

        if (result.isConfirmed) {
            try {
                // NOTE: In a full production app, you might also need an admin endpoint to delete the user from Firebase Auth
                await axios.delete(`${API_BASE}/api/users/${id}`);
                Swal.fire("ลบสำเร็จ", "ผู้ใช้ถูกลบออกจากระบบฐานข้อมูลแล้ว", "success");
                fetchUsers(); // Refresh list
            } catch (err) {
                console.error("Error deleting user:", err);
                Swal.fire("ข้อผิดพลาด", "ไม่สามารถลบผู้ใช้งานได้", "error");
            }
        }
    };

    if (loading) return <div>กำลังโหลดรายชื่อ...</div>;

    return (
        <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
            <h2 style={{ marginBottom: "20px", color: "#333" }}>จัดการผู้ใช้งาน</h2>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "2px solid #e5e7eb" }}>
                            <th style={{ padding: "12px 15px", color: "#4b5563" }}>ลำดับ</th>
                            <th style={{ padding: "12px 15px", color: "#4b5563" }}>ชื่อ</th>
                            <th style={{ padding: "12px 15px", color: "#4b5563" }}>อีเมล</th>
                            <th style={{ padding: "12px 15px", color: "#4b5563" }}>วันที่สมัคร</th>
                            <th style={{ padding: "12px 15px", color: "#4b5563" }}>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>ไม่มีข้อมูลผู้ใช้งาน</td>
                            </tr>
                        ) : (
                            users.map((user, index) => (
                                <tr key={user._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                    <td style={{ padding: "12px 15px" }}>{index + 1}</td>
                                    <td style={{ padding: "12px 15px", fontWeight: "bold" }}>{user.name || "ไม่มีชื่อ"}</td>
                                    <td style={{ padding: "12px 15px" }}>{user.email || "-"}</td>
                                    <td style={{ padding: "12px 15px" }}>{new Date(user.createdAt).toLocaleDateString("th-TH")}</td>
                                    <td style={{ padding: "12px 15px" }}>
                                        <button
                                            onClick={() => handleDelete(user._id, user.firebaseUid)}
                                            style={{
                                                padding: "6px 12px",
                                                backgroundColor: "#ef4444",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "4px",
                                                cursor: "pointer"
                                            }}
                                        >
                                            ลบ
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default UserManagement;
