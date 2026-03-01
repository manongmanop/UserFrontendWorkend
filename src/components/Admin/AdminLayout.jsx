import React from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import "../../App.css";

function AdminLayout() {
    return (
        <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f4f7f6" }}>
            {/* Sidebar เฉพาะของ Admin */}
            <AdminSidebar />

            {/* พื้นที่ของ Content แตกต่างกันไปตาม Route ที่เรียก (เช่น Dashboard, Users, Programs) */}
            <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
                <Outlet />
            </div>
        </div>
    );
}

export default AdminLayout;
