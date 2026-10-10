import { useEffect, useState } from "react";
import { Fingerprint, Grid3X3, KeyRound, LockKeyhole, ShieldCheck, Timer, UnlockKeyhole } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import api from "../../api.js";
import { useAppLock } from "../../PrivateRouter/AppLockContext.jsx";
import { checkPlatformAuthenticatorSupport, PasswordField, PatternGrid, PinKeypad } from "../../PrivateRouter/AppLockScreen.jsx";

const lockMethods = [
    { id: "biometric", label: "Fingerprint", detail: "Platform authenticator", icon: Fingerprint },
    { id: "pin", label: "PIN", detail: "4 to 6 digits", icon: KeyRound },
    { id: "pattern", label: "Pattern", detail: "Connect at least 4 dots", icon: Grid3X3 },
    { id: "password", label: "Password", detail: "12 characters minimum", icon: LockKeyhole },
];

const Settings = () => {
    const { settings, applySettings, refreshStatus, lock } = useAppLock();
    const [enabled, setEnabled] = useState(false);
    const [method, setMethod] = useState("pin");
    const [lockOnHidden, setLockOnHidden] = useState(true);
    const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(5);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricSupport, setBiometricSupport] = useState(null);
    const [currentPassword, setCurrentPassword] = useState("");
    const [credential, setCredential] = useState("");
    const [confirmCredential, setConfirmCredential] = useState("");
    const [credentialStage, setCredentialStage] = useState("first");
    const [changeCredential, setChangeCredential] = useState(false);
    const [confirmDisable, setConfirmDisable] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        checkPlatformAuthenticatorSupport().then(setBiometricSupport);
    }, []);

    useEffect(() => {
        if (!settings) return;
        setEnabled(Boolean(settings.enabled));
        setMethod(settings.method || "pin");
        setLockOnHidden(settings.lockOnHidden !== false);
        setIdleTimeoutMinutes(Number(settings.idleTimeoutMinutes ?? 5));
        setBiometricEnabled(Boolean(settings.biometricEnabled));
    }, [settings]);

    const needsCredential = enabled && method !== "biometric" && (
        method !== settings?.method || !settings?.hasCredential || changeCredential
    );

    const selectMethod = (value) => {
        setMethod(value);
        setCredential("");
        setConfirmCredential("");
        setCredentialStage("first");
        setChangeCredential(value !== settings?.method || !settings?.hasCredential);
        if (value === "biometric") setBiometricEnabled(true);
        setError("");
    };

    const registerBiometric = async () => {
        setError("");
        setNotice("");
        if (!currentPassword) {
            setError("Enter your account password first to confirm this security change.");
            return;
        }
        setBusy(true);
        try {
            const { data: options } = await api.post("/app-lock/webauthn/register/options", { currentPassword });
            const response = await startRegistration({ optionsJSON: options });
            await api.post("/app-lock/webauthn/register/verify", { response });
            await refreshStatus();
            setBiometricEnabled(true);
            setNotice("Platform authenticator registered and verified.");
        } catch (requestError) {
            setError(requestError.name === "NotAllowedError"
                ? "Biometric registration was cancelled. No authenticator was changed."
                : requestError.response?.data?.message || "Biometric registration failed.");
        } finally {
            setBusy(false);
        }
    };

    const saveSettings = async (event) => {
        event.preventDefault();
        setError("");
        setNotice("");
        if (!currentPassword) {
            setError("Enter your account password to confirm security changes.");
            return;
        }
        if (settings?.enabled && !enabled && !confirmDisable) {
            setError("Confirm that you want to disable App Lock.");
            return;
        }
        if (enabled && biometricSupport === false && (method === "biometric" || biometricEnabled)) {
            setError("This browser or device cannot use platform biometrics. Choose another method.");
            return;
        }
        if (enabled && biometricEnabled && !settings?.biometricEnrolled) {
            setError("Register a platform authenticator before enabling biometric unlock.");
            return;
        }
        if (needsCredential) {
            if (method !== "password" && credentialStage !== "ready") {
                setError("Enter and confirm the new lock credential.");
                return;
            }
            if (method === "password" && (!credential || !confirmCredential)) {
                setError("Enter and confirm the new lock password.");
                return;
            }
            if (credential !== confirmCredential) {
                setError("The new lock credentials do not match.");
                return;
            }
            if (method === "pin" && !/^\d{4,6}$/.test(credential)) {
                setError("PIN must contain 4 to 6 digits.");
                return;
            }
            if (method === "pattern" && (credential.split(",").length < 4 || new Set(credential.split(",")).size !== credential.split(",").length)) {
                setError("Pattern must use at least 4 different dots.");
                return;
            }
            if (method === "password" && (credential.length < 12 || credential.length > 128)) {
                setError("Lock password must be between 12 and 128 characters.");
                return;
            }
        }

        setBusy(true);
        try {
            const body = {
                currentPassword,
                enabled,
                method,
                lockOnHidden,
                idleTimeoutMinutes: Number(idleTimeoutMinutes),
                biometricEnabled: biometricEnabled || method === "biometric",
                confirmDisable: confirmDisable && !enabled,
            };
            if (needsCredential) {
                body.credential = credential;
                body.confirmCredential = confirmCredential;
            }
            const { data } = await api.put("/app-lock/settings", body);
            setCredential("");
            setConfirmCredential("");
            setCredentialStage("first");
            setCurrentPassword("");
            setChangeCredential(false);
            setConfirmDisable(false);
            if (data.settings.enabled) {
                await applySettings(data.settings);
            } else {
                await applySettings(data.settings);
                setNotice(data.message);
            }
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to save App Lock settings.");
        } finally {
            setBusy(false);
        }
    };

    const advanceCredential = () => {
        if (credentialStage === "first") {
            setCredentialStage("confirm");
        } else {
            setCredentialStage("ready");
        }
    };

    const credentialLabel = credentialStage === "first" ? "New credential" : "Confirm credential";

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-8">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#647447]">Security & Access</p>
                    <h1 className="mt-2 text-2xl font-bold text-slate-900">App Lock</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">Require a verified lock method before opening private Life Ledger data.</p>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${settings?.enabled ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                    <span className={`h-2 w-2 rounded-full ${settings?.enabled ? "bg-emerald-600" : "bg-slate-400"}`} />
                    {settings?.enabled ? "App Lock is on" : "App Lock is off"}
                </div>
            </header>

            <form onSubmit={saveSettings} className="space-y-5">
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="mt-0.5 text-[#647447]" size={21} aria-hidden="true" />
                            <div>
                                <h2 className="font-bold text-slate-900">Lock protection</h2>
                                <p className="mt-1 text-sm text-slate-500">Your private pages and authenticated data APIs are gated together.</p>
                            </div>
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-3">
                            <span className="text-sm font-semibold text-slate-700">{enabled ? "Enabled" : "Disabled"}</span>
                            <input type="checkbox" checked={enabled} onChange={(event) => { setEnabled(event.target.checked); setConfirmDisable(false); }} className="peer sr-only" aria-label="Enable App Lock" />
                            <span className="relative h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-[#647447] after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#647447] peer-focus-visible:ring-offset-2" />
                        </label>
                    </div>

                    <div className="pt-5">
                        <h3 className="text-sm font-bold text-slate-800">Choose a lock method</h3>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {lockMethods.map(({ id, label, detail, icon: Icon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    aria-pressed={method === id}
                                    disabled={id === "biometric" && biometricSupport === false}
                                    onClick={() => selectMethod(id)}
                                    className={`flex min-h-20 items-center gap-3 rounded-xl border p-4 text-left transition ${method === id ? "border-[#647447] bg-[#f3f5ef] ring-1 ring-[#647447]" : "border-slate-200 bg-white hover:border-slate-300"} disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                    <Icon size={20} className={method === id ? "text-[#53633b]" : "text-slate-500"} aria-hidden="true" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-semibold text-slate-800">{label}</span>
                                        <span className="mt-0.5 block text-xs text-slate-500">{id === "biometric" && biometricSupport === null ? "Checking device support..." : detail}</span>
                                    </span>
                                    {method === id && <span className="sr-only">Selected</span>}
                                </button>
                            ))}
                        </div>
                        {biometricSupport === false && <p className="mt-3 text-sm text-amber-800">Platform biometric unlock is unavailable. Use HTTPS or localhost and a supported browser/device.</p>}
                    </div>

                    {method === "biometric" || biometricEnabled ? (
                        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-slate-800">Platform authenticator</h3>
                                    <p className="mt-1 text-sm text-slate-500">Register with a server-verified passkey prompt. Life Ledger never reads fingerprint data.</p>
                                    <p className="mt-2 text-sm font-medium">{settings?.biometricEnrolled ? "Authenticator registered" : "No authenticator registered"}</p>
                                </div>
                                <button type="button" onClick={registerBiometric} disabled={busy || !currentPassword || biometricSupport !== true} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
                                    {settings?.biometricEnrolled ? "Register another device" : "Register device"}
                                </button>
                            </div>
                            <label className="mt-4 flex items-start gap-3 border-t border-slate-200 pt-4 text-sm text-slate-700">
                                <input type="checkbox" checked={biometricEnabled || method === "biometric"} disabled={!settings?.biometricEnrolled && method !== "biometric"} onChange={(event) => setBiometricEnabled(event.target.checked)} className="mt-0.5 accent-[#647447]" />
                                <span>Allow biometric unlock as an alternate method</span>
                            </label>
                        </div>
                    ) : null}

                    {enabled && needsCredential && method !== "biometric" && (
                        <div className="mt-6 rounded-xl border border-slate-200 p-4 sm:p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h3 className="font-bold text-slate-800">Set up {lockMethods.find((item) => item.id === method)?.label}</h3>
                                    <p className="mt-1 text-sm text-slate-500">{method === "password" ? "Use 12 to 128 characters." : method === "pin" ? "Choose 4 to 6 digits." : "Draw at least 4 different dots."}</p>
                                </div>
                            </div>

                            {method === "pin" && credentialStage !== "ready" && (
                                <div className="mt-5">
                                    <p className="mb-2 text-center text-sm font-semibold text-slate-700">{credentialStage === "first" ? "Enter a new PIN" : "Enter the PIN again"}</p>
                                    <PinKeypad value={credentialStage === "first" ? credential : confirmCredential} onChange={credentialStage === "first" ? setCredential : setConfirmCredential} onSubmit={advanceCredential} actionLabel={credentialStage === "first" ? "Continue" : "Confirm PIN"} disabled={busy} />
                                </div>
                            )}

                            {method === "pattern" && credentialStage !== "ready" && (
                                <div className="mt-5">
                                    <p className="mb-3 text-center text-sm font-semibold text-slate-700">{credentialStage === "first" ? "Draw a new pattern" : "Draw it again to confirm"}</p>
                                    <PatternGrid value={credentialStage === "first" ? credential : confirmCredential} onChange={credentialStage === "first" ? setCredential : setConfirmCredential} disabled={busy} />
                                    <button type="button" onClick={advanceCredential} disabled={(credentialStage === "first" ? credential : confirmCredential).split(",").length < 4} className="mt-4 w-full rounded-xl bg-[#53633b] px-4 py-3 font-semibold text-white disabled:opacity-50">{credentialStage === "first" ? "Continue" : "Confirm pattern"}</button>
                                </div>
                            )}

                            {method === "password" && (
                                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                    <PasswordField value={credential} onChange={setCredential} label="New lock password" autoComplete="new-password" disabled={busy} />
                                    <PasswordField value={confirmCredential} onChange={setConfirmCredential} label="Confirm lock password" autoComplete="new-password" disabled={busy} />
                                </div>
                            )}
                            {credentialStage === "ready" && method !== "password" && <p className="mt-4 text-sm font-medium text-emerald-800">Credential entered twice. It will be hashed on the server when you save.</p>}
                        </div>
                    )}

                    {enabled && method !== "biometric" && settings?.hasCredential && method === settings?.method && (
                        <label className="mt-5 flex items-start gap-3 text-sm text-slate-600">
                            <input type="checkbox" checked={changeCredential} onChange={(event) => { setChangeCredential(event.target.checked); setCredential(""); setConfirmCredential(""); setCredentialStage("first"); }} className="mt-0.5 accent-[#647447]" />
                            <span>Change my {lockMethods.find((item) => item.id === method)?.label.toLowerCase()}</span>
                        </label>
                    )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <div className="flex items-center gap-3">
                        <Timer size={20} className="text-[#647447]" aria-hidden="true" />
                        <div>
                            <h2 className="font-bold text-slate-900">Lock policy</h2>
                            <p className="mt-1 text-sm text-slate-500">Choose when the app should require your lock method again.</p>
                        </div>
                    </div>
                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                            <input type="checkbox" checked={lockOnHidden} onChange={(event) => setLockOnHidden(event.target.checked)} className="mt-0.5 accent-[#647447]" />
                            <span><strong className="block">Lock when the tab is hidden</strong><span className="mt-1 block text-slate-500">Lock as soon as Life Ledger moves to the background.</span></span>
                        </label>
                        <label className="text-sm font-semibold text-slate-700">
                            Inactivity timeout
                            <select value={idleTimeoutMinutes} onChange={(event) => setIdleTimeoutMinutes(Number(event.target.value))} className="mt-2 block w-full rounded-lg border border-slate-200 bg-white px-3 py-3 outline-none focus:border-[#647447]">
                                <option value={0}>Disabled</option>
                                <option value={1}>1 minute</option>
                                <option value={5}>5 minutes</option>
                                <option value={10}>10 minutes</option>
                                <option value={30}>30 minutes</option>
                            </select>
                        </label>
                    </div>
                    <button type="button" onClick={() => { void lock(); }} disabled={!settings?.enabled} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                        <UnlockKeyhole size={16} aria-hidden="true" /> Lock now
                    </button>
                </section>

                {settings?.enabled && !enabled && (
                    <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                        <input type="checkbox" checked={confirmDisable} onChange={(event) => setConfirmDisable(event.target.checked)} className="mt-0.5 accent-amber-700" />
                        <span><strong className="block">Confirm disabling App Lock</strong><span className="mt-1 block">Private pages will no longer require a separate unlock.</span></span>
                    </label>
                )}

                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <h2 className="font-bold text-slate-900">Confirm with your account password</h2>
                    <p className="mt-1 text-sm text-slate-500">Required every time you change lock settings or credentials.</p>
                    <div className="mt-4 max-w-lg">
                        <PasswordField value={currentPassword} onChange={setCurrentPassword} label="Account password" disabled={busy} />
                    </div>
                </section>

                {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
                {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

                <div className="flex flex-wrap items-center justify-end gap-3">
                    <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#53633b] px-6 py-3 font-semibold text-white transition hover:bg-[#414f2e] disabled:cursor-wait disabled:opacity-60">
                        <ShieldCheck size={17} aria-hidden="true" /> {busy ? "Saving..." : "Save security settings"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
