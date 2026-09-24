import React, { createContext, useState, useCallback, useContext } from "react";
import api from "../api";

export const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
    // Cache states
    const [dashboardData, setDashboardCached] = useState(null);

    // Global loading states (optional, but good for first load)
    const [isInitialDashboardLoaded, setInitialDashboardLoaded] = useState(false);

    // ─── Dashboard ────────────────────────────────────────────────
    const getDashboardData = useCallback(async (forceRefresh = false) => {
        if (!forceRefresh && dashboardData) return dashboardData;
        try {
            const res = await api.get("/dashboard");
            setDashboardCached(res.data);
            setInitialDashboardLoaded(true);
            return res.data;
        } catch (err) {
            console.error("Dashboard cache error:", err);
            throw err;
        }
    }, [dashboardData]);

    const invalidateCache = useCallback((key) => {
        if (key === 'dashboard') setDashboardCached(null);
        if (key === 'all') {
            setDashboardCached(null);
        }
    }, []);

    return (
        <AdminContext.Provider value={{
            dashboardData,
            isInitialDashboardLoaded,
            getDashboardData,
            invalidateCache,
            setDashboardCached,
        }}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => useContext(AdminContext);
