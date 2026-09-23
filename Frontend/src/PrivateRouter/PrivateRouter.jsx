import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../PrivateRouter/AuthContext.jsx";

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Loading...</div>;
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

  return children;
};

export default PrivateRoute;