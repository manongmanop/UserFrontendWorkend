import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "";

function ProgramManagement() {
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPrograms = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/programs`);
            setPrograms(res.data);
        } catch (err) {
            console.error("Error fetching programs:", err);
            Swal.fire("ข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลโปรแกรมได้", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrograms();
    }, []);

    const handleDelete = async (id, name) => {
        const result = await Swal.fire({
            title: "ลบโปรแกรม?",
            text: `คุณต้องการลบโปรแกรม "${name}" หรือไม่? ข้อมูลจะไม่สามารถกู้คืนได้`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "ลบ",
            cancelButtonText: "ยกเลิก"
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_BASE}/api/programs/${id}`);
                Swal.fire("สำเร็จ", "ลบโปรแกรมเรียบร้อยแล้ว", "success");
                fetchPrograms();
            } catch (err) {
                console.error("Error deleting program:", err);
                Swal.fire("ข้อผิดพลาด", "ไม่สามารถลบโปรแกรมได้", "error");
            }
        }
    };

    if (loading) return <div>กำลังโหลดรายชื่อโปรแกรม...</div>;

    return (
        <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ color: "#333", margin: 0 }}>จัดการโปรแกรม</h2>
                <button
                    style={{
                        padding: "8px 16px",
                        backgroundColor: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "bold"
                    }}
                    onClick={() => Swal.fire('Info', 'ระบบเพิ่มโปรแกรมสามารถเชื่อมกับหน้าเพิ่มที่ทำไว้แล้วทีหลัง', 'info')}
                >
                    + เพิ่มโปรแกรมใหม่
                </button>
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "2px solid #e5e7eb" }}>
                            <th style={{ padding: "12px 15px", color: "#4b5563" }}>ลำดับ</th>
                            <th style={{ padding: "12px 15px", color: "#4b5563" }}>รูปโปรแกรม</th>
                            <th style={{ padding: "12px 15px", color: "#4b5563" }}>ชื่อโปรแกรม</th>
                            <th style={{ padding: "12px 15px", color: "#4b5563" }}>จำนวนท่า</th>
                            <th style={{ padding: "12px 15px", color: "#4b5563" }}>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {programs.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>ไม่มีข้อมูลโปรแกรม</td>
                            </tr>
                        ) : (
                            programs.map((program, index) => (
                                <tr key={program._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                    <td style={{ padding: "12px 15px" }}>{index + 1}</td>
                                    <td style={{ padding: "12px 15px" }}>
                                        {program.imageUrl ? (
                                            <img src={program.imageUrl.startsWith("http") ? program.imageUrl : `${API_BASE}${program.imageUrl}`} alt="Program" style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "5px" }} />
                                        ) : (
                                            <div style={{ width: "50px", height: "50px", backgroundColor: "#e5e7eb", borderRadius: "5px" }}></div>
                                        )}
                                    </td>
                                    <td style={{ padding: "12px 15px", fontWeight: "bold" }}>{program.name || "ไม่มีชื่อ"}</td>
                                    <td style={{ padding: "12px 15px" }}>{program.exercises ? program.exercises.length : "0"} ท่า</td>
                                    <td style={{ padding: "12px 15px" }}>
                                        <button
                                            onClick={() => handleDelete(program._id, program.name)}
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

export default ProgramManagement;
