import React, { useContext, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../PrivateRouter/AuthContext.jsx";
import { useAppLock } from "./AppLockContext.jsx";
import AppLockScreen from "./AppLockScreen.jsx";
import Loader from "../Components/CommenComponents/Loader.jsx";

const SecurityStatusError = () => {
  const { loadError, refreshStatus, setLoadError } = useAppLock();
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    try {
      await refreshStatus();
    } catch (error) {
      setLoadError(
        error?.response?.data?.message
          || "Security settings are still unavailable. Retry again.",
      );
    } finally {
      setRetrying(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <section
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg"
        aria-labelledby="security-status-heading"
      >
        <h1 id="security-status-heading" className="text-xl font-bold text-slate-900">
          Unable to verify security settings
        </h1>
        <p role="alert" className="mt-3 text-sm text-slate-600">
          {loadError || "Retry before opening private data."}
        </p>
        <button
          type="button"
          onClick={retry}
          disabled={retrying}
          className="mt-5 rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-wait disabled:opacity-60"
        >
          {retrying ? "Checking..." : "Retry"}
        </button>
      </section>
    </main>
  );
};

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useContext(AuthContext);
  const { settings, locked, loading: lockLoading, loadError } = useAppLock();

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

  if (loadError) return <SecurityStatusError />;
  if (settings?.enabled && locked) return <AppLockScreen />;

  return children;
};

export default PrivateRoute;