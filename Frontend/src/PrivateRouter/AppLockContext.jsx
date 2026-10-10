import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import api, { getAppLockToken, setAppLockToken } from "../api.js";

const AppLockContext = createContext(null);

export const useAppLock = () => useContext(AppLockContext);

export const AppLockProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState(null);
  const [locked, setLocked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const channelRef = useRef(null);
  const idleLockRef = useRef(null);
  const lastActivityAtRef = useRef(Date.now());

  const refreshStatus = async () => {
    const { data } = await api.get("/app-lock/status");
    setSettings(data);
    setLoadError("");
    if (!data.enabled) {
      setAppLockToken(null);
      setLocked(false);
    } else if (!getAppLockToken()) {
      setLocked(true);
    }
    return data;
  };

  const lock = async (broadcast = true) => {
    const token = getAppLockToken();
    setAppLockToken(null);
    setLocked(true);
    if (token && user) {
      try { await api.post("/app-lock/lock", null, { headers: { "X-App-Lock-Token": token } }); } catch (error) { /* The in-memory grant is still discarded. */ }
    }
    if (broadcast) channelRef.current?.postMessage({ type: "lock" });
  };
  idleLockRef.current = lock;

  const acceptGrant = (token) => {
    setAppLockToken(token);
    setLocked(false);
    setLoadError("");
  };

  const unlockWithCredential = async (method, credential) => {
    setUnlocking(true);
    try {
      const { data } = await api.post("/app-lock/unlock", { method, credential });
      acceptGrant(data.token);
      return true;
    } finally {
      setUnlocking(false);
    }
  };

  const applySettings = async (nextSettings) => {
    setSettings(nextSettings);
    if (nextSettings.enabled) {
      await lock();
    } else {
      setAppLockToken(null);
      setLocked(false);
    }
  };

  useEffect(() => {
    if (authLoading) return undefined;
    let active = true;
    setAppLockToken(null);
    setLoading(Boolean(user));
    setLoadError("");

    if (!user) {
      setSettings(null);
      setLocked(false);
      setLoading(false);
      return undefined;
    }

    setLocked(true);
    api.post("/app-lock/lock")
      .then(() => api.get("/app-lock/status"))
      .then(({ data }) => {
        if (!active) return;
        setSettings(data);
        setLocked(Boolean(data.enabled));
        if (data.enabled) channelRef.current?.postMessage({ type: "lock" });
      })
      .catch(() => {
        if (!active) return;
        setSettings({ enabled: true, method: "password", biometricEnabled: false, biometricEnrolled: false });
        setLocked(true);
        setLoadError("Security status could not be verified. Retry before opening private data.");
      })
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [user?.id, authLoading]);

  useEffect(() => {
    if (!user || !settings?.enabled || locked || loading) return undefined;
    const timeoutMs = Number(settings.idleTimeoutMinutes) * 60 * 1000;
    if (timeoutMs <= 0) return undefined;

    lastActivityAtRef.current = Date.now();
    const markActivity = () => {
      if (document.visibilityState === "visible") lastActivityAtRef.current = Date.now();
    };
    const checkIdleTime = () => {
      if (Date.now() - lastActivityAtRef.current >= timeoutMs) {
        void idleLockRef.current?.();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && settings.lockOnHidden) {
        void idleLockRef.current?.();
      } else if (document.visibilityState === "visible") {
        checkIdleTime();
      }
    };
    const onPageHide = () => { void idleLockRef.current?.(); };
    const events = ["pointerdown", "keydown", "touchstart", "pointermove"];
    events.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    const interval = window.setInterval(checkIdleTime, 1000);
    return () => {
      window.clearInterval(interval);
      events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [user?.id, settings?.enabled, settings?.lockOnHidden, settings?.idleTimeoutMinutes, locked, loading]);

  useEffect(() => {
    if (!user) return undefined;
    const channel = typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel(`life-ledger-lock-${user.id}`)
      : null;
    channelRef.current = channel;
    const onMessage = (event) => {
      if (event.data?.type === "lock") void lock(false);
    };
    channel?.addEventListener("message", onMessage);
    const onRequired = () => void lock(false);
    window.addEventListener("app-lock-required", onRequired);
    return () => {
      channel?.removeEventListener("message", onMessage);
      channel?.close();
      channelRef.current = null;
      window.removeEventListener("app-lock-required", onRequired);
    };
  }, [user?.id, settings?.enabled]);

  return (
    <AppLockContext.Provider value={{
      settings,
      locked,
      loading: loading || authLoading,
      loadError,
      unlocking,
      lock,
      refreshStatus,
      applySettings,
      unlockWithCredential,
      acceptGrant,
      setLoadError,
    }}>
      {children}
    </AppLockContext.Provider>
  );
};