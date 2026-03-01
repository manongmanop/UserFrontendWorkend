import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

function AdminRoute({ children }) {
    const { user } = useUserAuth();
    const [isAdmin, setIsAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (user) {
                try {
                    const docRef = doc(db, 'admin', user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists() && docSnap.data().role === 'admin') {
                        setIsAdmin(true);
                    } else {
                        setIsAdmin(false);
                    }
                } catch (error) {
                    console.error("Error checking admin status:", error);
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
            }
            setLoading(false);
        };

        checkAdminStatus();
    }, [user]);

    if (loading) {
        return <div className="text-center mt-10">กำลังตรวจสอบสิทธิ์...</div>;
    }

    if (!user || !isAdmin) {
        return <Navigate to="/home" />;
    }

    return children;
}

export default AdminRoute;
