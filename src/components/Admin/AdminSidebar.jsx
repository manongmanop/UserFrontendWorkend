import React from "react";
import { Link, useLocation } from "react-router-dom";
import { MdDashboard, MdPeople, MdFitnessCenter, MdLogout } from "react-icons/md";
import { useUserAuth } from "../../context/UserAuthContext";

function AdminSidebar() {
    const location = useLocation();
    const { logOut } = useUserAuth();

    const handleLogout = async () => {
        try {
            await logOut();
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    const menuItems = [
        { name: "Dashboard", path: "/admin/dashboard", icon: <MdDashboard /> },
        { name: "จัดการผู้ใช้งาน", path: "/admin/users", icon: <MdPeople /> },
        { name: "จัดการโปรแกรม", path: "/admin/programs", icon: <MdFitnessCenter /> },
    ];

    return (
        <div style={{
            width: "250px",
            backgroundColor: "#1f2937",
            color: "white",
            display: "flex",
            flexDirection: "column",
            boxShadow: "2px 0 5px rgba(0,0,0,0.1)"
        }}>
            <div style={{ padding: "20px", fontSize: "1.5rem", fontWeight: "bold", borderBottom: "1px solid #374151" }}>
                ระบบจัดการ (Admin)
            </div>

            <div style={{ flex: 1, padding: "20px 0" }}>
                {menuItems.map((item) => {
                    const isActive = location.pathname.includes(item.path);
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                padding: "15px 20px",
                                color: isActive ? "#3b82f6" : "#d1d5db",
                                textDecoration: "none",
                                backgroundColor: isActive ? "#111827" : "transparent",
                                borderLeft: isActive ? "4px solid #3b82f6" : "4px solid transparent",
                                transition: "all 0.2s"
                            }}
                        >
                            <span style={{ marginRight: "10px", fontSize: "1.2rem" }}>{item.icon}</span>
                            {item.name}
                        </Link>
                    );
                })}
            </div>

            <div style={{ padding: "20px", borderTop: "1px solid #374151" }}>
                <button
                    onClick={handleLogout}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        padding: "10px",
                        background: "transparent",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: "1rem"
                    }}
                >
                    <MdLogout style={{ marginRight: "10px" }} /> ออกจากระบบ
                </button>
            </div>
        </div>
    );
}

export default AdminSidebar;
