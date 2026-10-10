import { useEffect, useRef, useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { Delete, Eye, EyeOff, Fingerprint, LockKeyhole, LogOut, RotateCcw } from "lucide-react";
import api from "../api.js";
import { useAuth } from "./AuthContext.jsx";
import { useAppLock } from "./AppLockContext.jsx";
import { useNavigate } from "react-router-dom";

export const PatternGrid = ({ value, onChange, disabled = false }) => {
  const [points, setPoints] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const pointsRef = useRef([]);
  const gridRef = useRef(null);
  const coordinates = [50, 150, 250];
  const locationOf = (index) => [coordinates[index % 3], coordinates[Math.floor(index / 3)]];

  const addPointAt = (event) => {
    const bounds = gridRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = ((event.clientX - bounds.left) / bounds.width) * 300;
    const y = ((event.clientY - bounds.top) / bounds.height) * 300;
    const index = coordinates.reduce((nearest, coordinateX, column) => {
      coordinates.forEach((coordinateY, row) => {
        const candidate = row * 3 + column;
        const [candidateX, candidateY] = locationOf(candidate);
        const distance = Math.hypot(x - candidateX, y - candidateY);
        if (distance < 34 && (nearest.index < 0 || distance < nearest.distance)) {
          nearest.index = candidate;
          nearest.distance = distance;
        }
      });
      return nearest;
    }, { index: -1, distance: Infinity }).index;

    if (index < 0 || pointsRef.current.includes(index)) return;
    const next = [...pointsRef.current, index];
    pointsRef.current = next;
    setPoints(next);
    onChange(next.join(","));
  };

  const reset = () => {
    pointsRef.current = [];
    setPoints([]);
    onChange("");
  };

  useEffect(() => {
    if (!value) {
      pointsRef.current = [];
      setPoints([]);
    }
  }, [value]);

  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div
        ref={gridRef}
        role="group"
        aria-label="Nine-dot pattern lock"
        className="relative aspect-square touch-none select-none rounded-2xl bg-[#f4f5ef]"
        onPointerDown={(event) => {
          if (disabled) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          reset();
          setDrawing(true);
          addPointAt(event);
        }}
        onPointerMove={(event) => drawing && addPointAt(event)}
        onPointerUp={() => setDrawing(false)}
        onPointerCancel={() => setDrawing(false)}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 300 300" aria-hidden="true">
          {points.slice(1).map((point, index) => {
            const [x1, y1] = locationOf(points[index]);
            const [x2, y2] = locationOf(point);
            return <line key={`${points[index]}-${point}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#647447" strokeWidth="7" strokeLinecap="round" />;
          })}
        </svg>
        {Array.from({ length: 9 }, (_, index) => {
          const [x, y] = locationOf(index);
          const selected = points.includes(index);
          return (
            <button
              key={index}
              type="button"
              disabled={disabled}
              aria-label={`Pattern dot ${index + 1}${selected ? ", selected" : ""}`}
              onClick={(event) => {
                if (disabled || drawing || pointsRef.current.includes(index)) return;
                event.stopPropagation();
                const next = [...pointsRef.current, index];
                pointsRef.current = next;
                setPoints(next);
                onChange(next.join(","));
              }}
              className={`absolute z-10 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ${selected ? "bg-[#647447]" : "bg-transparent"}`}
              style={{ left: `${x / 3}%`, top: `${y / 3}%` }}
            >
              <span className={`h-4 w-4 rounded-full border-2 border-[#647447] ${selected ? "bg-white" : "bg-[#647447]/25"}`} />
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
        <span>{points.length} dots selected</span>
        <button type="button" onClick={reset} disabled={disabled} className="inline-flex items-center gap-1.5 font-semibold text-[#53633b] disabled:opacity-50">
          <RotateCcw size={15} aria-hidden="true" /> Reset
        </button>
      </div>
    </div>
  );
};

export const PinKeypad = ({ value, onChange, onSubmit, disabled, actionLabel = "Unlock", minLength = 4 }) => {
  const enter = (digit) => onChange(value.length < 6 ? `${value}${digit}` : value);
  const backspace = () => onChange(value.slice(0, -1));
  const buttonClass = "grid aspect-square place-items-center rounded-xl border border-slate-200 bg-white text-lg font-semibold text-slate-800 transition hover:border-[#8EA66B] hover:bg-[#f4f6ef] disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <div className="mx-auto w-full max-w-[260px]">
      <div className="mb-4 flex h-10 items-center justify-center gap-3" aria-label={`${value.length} PIN digits entered`}>
        {Array.from({ length: 6 }, (_, index) => <span key={index} className={`h-3 w-3 rounded-full ${index < value.length ? "bg-[#53633b]" : "bg-slate-200"}`} />)}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button key={digit} type="button" disabled={disabled || value.length >= 6} onClick={() => enter(digit)} className={buttonClass} aria-label={`Enter ${digit}`}>{digit}</button>
        ))}
        <button type="button" disabled={disabled || !value} onClick={() => onChange("")} className={buttonClass} aria-label="Clear PIN">C</button>
        <button type="button" disabled={disabled || value.length >= 6} onClick={() => enter("0")} className={buttonClass} aria-label="Enter 0">0</button>
        <button type="button" disabled={disabled || !value} onClick={backspace} className={buttonClass} aria-label="Delete last digit"><Delete size={19} /></button>
      </div>
      <button type="button" disabled={disabled || value.length < minLength} onClick={onSubmit} className="mt-3 w-full rounded-xl bg-[#53633b] px-4 py-3 font-semibold text-white transition hover:bg-[#414f2e] disabled:cursor-not-allowed disabled:opacity-50">{actionLabel}</button>
    </div>
  );
};

export const PasswordField = ({ value, onChange, label = "Password", disabled = false, autoComplete = "current-password" }) => {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block text-left text-sm font-medium text-slate-700">
      {label}
      <span className="relative mt-2 block">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 outline-none transition focus:border-[#8EA66B] focus:ring-2 focus:ring-[#8EA66B]/20 disabled:opacity-60"
        />
        <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500">
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
};

export const checkPlatformAuthenticatorSupport = async () => {
  if (!window.isSecureContext || !navigator.credentials || !window.PublicKeyCredential) return false;
  if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== "function") return false;
  try { return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); }
  catch (error) { return false; }
};

const AppLockScreen = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { settings, loading, loadError, unlocking, unlockWithCredential, acceptGrant, refreshStatus, lock, setLoadError } = useAppLock();
  const [credential, setCredential] = useState("");
  const [pattern, setPattern] = useState("");
  const [error, setError] = useState("");
  const [biometricSupport, setBiometricSupport] = useState(false);
  const [busy, setBusy] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => { checkPlatformAuthenticatorSupport().then(setBiometricSupport); }, []);

  const submitCredential = async (method = settings?.method, value = credential) => {
    setError("");
    try {
      const ok = await unlockWithCredential(method, value);
      if (!ok) return;
      setCredential("");
      setPattern("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to unlock. Try again.");
    }
  };

  const unlockBiometric = async () => {
    setError("");
    setBusy(true);
    try {
      const { data: options } = await api.post("/app-lock/webauthn/authenticate/options");
      const response = await startAuthentication({ optionsJSON: options });
      const { data } = await api.post("/app-lock/webauthn/authenticate/verify", { response });
      acceptGrant(data.token);
    } catch (requestError) {
      setError(requestError.name === "NotAllowedError"
        ? "Biometric authentication was cancelled. Use your fallback credential instead."
        : requestError.response?.data?.message || "Biometric authentication failed. Use your fallback credential instead.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#1F0A3C] text-white" role="status">Checking security status...</div>;

  const method = settings?.method || "password";
  const allowBiometric = settings?.biometricEnrolled && (settings?.biometricEnabled || method === "biometric");
  const disabled = unlocking || busy;

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-[#1F0A3C] via-[#2d2041] to-[#334726] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-white/40 bg-white p-6 shadow-2xl shadow-black/20 sm:p-9" aria-labelledby="lock-heading">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#eef1e8] text-[#53633b]"><LockKeyhole size={25} aria-hidden="true" /></div>
        <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-[#647447]">Life Ledger</p>
        <h1 id="lock-heading" className="mt-2 text-center text-2xl font-bold text-slate-900">App locked</h1>
        <p className="mt-2 text-center text-sm text-slate-500">{user?.name || user?.username || "Your account"}</p>

        {loadError ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p>{loadError}</p>
            <button type="button" onClick={() => refreshStatus().catch(() => setLoadError("Security status is still unavailable."))} className="mt-3 font-bold underline">Retry</button>
          </div>
        ) : (
          <div className="mt-7">
            {allowBiometric && !useFallback && (
              <div className="space-y-3">
                <button type="button" onClick={unlockBiometric} disabled={disabled || !biometricSupport} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#53633b] px-4 py-3.5 font-semibold text-white hover:bg-[#414f2e] disabled:cursor-not-allowed disabled:opacity-50">
                  <Fingerprint size={19} aria-hidden="true" /> Unlock with device
                </button>
                {!biometricSupport && <p className="text-center text-sm text-amber-700">This browser or device does not support platform biometrics, or this page is not running in a secure context.</p>}
                <button type="button" onClick={() => setUseFallback(true)} className="w-full py-2 text-sm font-semibold text-slate-600 underline underline-offset-4">Use another lock method</button>
              </div>
            )}

            {(method === "pin" && (!allowBiometric || useFallback)) && <PinKeypad value={credential} onChange={setCredential} onSubmit={() => submitCredential("pin")} disabled={disabled} />}
            {(method === "pattern" && (!allowBiometric || useFallback)) && (
              <div className="space-y-4">
                <PatternGrid value={pattern} onChange={setPattern} disabled={disabled} />
                <button type="button" onClick={() => submitCredential("pattern", pattern)} disabled={disabled || pattern.split(",").length < 4} className="w-full rounded-xl bg-[#53633b] px-4 py-3 font-semibold text-white hover:bg-[#414f2e] disabled:opacity-50">Unlock</button>
              </div>
            )}
            {(method === "password" && (!allowBiometric || useFallback)) && (
              <div className="space-y-4">
                <PasswordField value={credential} onChange={setCredential} disabled={disabled} />
                <button type="button" onClick={() => submitCredential("password")} disabled={disabled || !credential} className="w-full rounded-xl bg-[#53633b] px-4 py-3 font-semibold text-white hover:bg-[#414f2e] disabled:opacity-50">Unlock</button>
              </div>
            )}
            {(method === "biometric" && useFallback) && (
              <div className="space-y-4">
                <PasswordField value={credential} onChange={setCredential} label="Account password" disabled={disabled} />
                <button type="button" onClick={() => submitCredential("password")} disabled={disabled || !credential} className="w-full rounded-xl bg-[#53633b] px-4 py-3 font-semibold text-white hover:bg-[#414f2e] disabled:opacity-50">Unlock</button>
                <button type="button" onClick={() => setUseFallback(false)} className="w-full py-2 text-sm font-semibold text-slate-600 underline underline-offset-4">Back to biometrics</button>
              </div>
            )}
            {method !== "biometric" && allowBiometric && useFallback && <button type="button" onClick={() => setUseFallback(false)} className="mt-4 w-full py-2 text-sm font-semibold text-slate-600 underline underline-offset-4">Back to biometrics</button>}
          </div>
        )}

        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">{error}</p>}
        {disabled && <p role="status" className="mt-4 text-center text-sm text-slate-500">Verifying...</p>}
        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
          <button type="button" onClick={() => { void lock(); }} className="text-sm font-semibold text-slate-500 underline underline-offset-4">Stay locked</button>
          <button type="button" onClick={() => { logout(); navigate("/login", { replace: true }); }} className="ml-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 underline underline-offset-4">
            <LogOut size={15} aria-hidden="true" /> Log out
          </button>
        </div>
      </section>
    </main>
  );
};

export default AppLockScreen;