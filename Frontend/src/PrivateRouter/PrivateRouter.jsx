import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../PrivateRouter/AuthContext.jsx";
import { useAppLock } from "./AppLockContext.jsx";
import AppLockScreen from "./AppLockScreen.jsx";
import Loader from "../Components/CommenComponents/Loader.jsx";

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useContext(AuthContext);
  const { settings, locked, loading: lockLoading } = useAppLock();

  if (loading || lockLoading) {
    return <Loader />;
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const normalizedUserRole = String(user?.role || "").trim().toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map((role) => String(role).trim().toLowerCase());

  // Role check
  if (normalizedAllowedRoles.length && !normalizedAllowedRoles.includes(normalizedUserRole)) {
    return (
      <div className="p-6 text-center text-red-600">
        You are not authorized to view this page
      </div>
    );
  }

  if (settings?.enabled && locked) return <AppLockScreen />;

  return children;
};

export default PrivateRoute;