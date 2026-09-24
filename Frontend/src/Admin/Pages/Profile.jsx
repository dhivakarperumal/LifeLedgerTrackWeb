import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, Phone, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { useAuth } from "../../PrivateRouter/AuthContext";

const Profile = () => {
  const { user, profileName, email, phone, role, logout } = useAuth();
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordStatus, setPasswordStatus] = useState({ type: "", message: "" });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const profile = {
    name: profileName || "Admin User",
    email: email || "admin@lifelink.com",
    phone: phone || "Not provided",
    role: role || "Admin",
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordStatus({ type: "", message: "" });

    if (passwords.next.length < 6) {
      setPasswordStatus({ type: "error", message: "New password must be at least 6 characters." });
      return;
    }

    if (passwords.next !== passwords.confirm) {
      setPasswordStatus({ type: "error", message: "New password and confirm password do not match." });
      return;
    }

    const userId = user?.id || user?.user_id;
    if (!userId) {
      setPasswordStatus({ type: "error", message: "Unable to identify your account. Please sign in again." });
      return;
    }

    try {
      setIsSavingPassword(true);
      const response = await api.put(`/auth/profile/${userId}/password`, {
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });
      setPasswords({ current: "", next: "", confirm: "" });
      setPasswordStatus({ type: "success", message: response.data?.message || "Password changed successfully." });
    } catch (error) {
      setPasswordStatus({
        type: "error",
        message: error.response?.data?.message || "Unable to change password. Please try again.",
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const userId = user?.id || user?.user_id;
    if (!userId) return;

    const confirmed = window.confirm("Deactivate your account? Your user details will be kept, but the account will no longer be able to log in.");
    if (!confirmed) return;

    try {
      await api.patch(`/auth/users/${userId}/status`, { status: "Inactive" });
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setPasswordStatus({ type: "error", message: error.response?.data?.message || "Unable to delete your account." });
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 mt-10 duration-700">
    

      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)] lg:grid lg:grid-cols-[0.78fr_1.4fr]">
        <section className="relative overflow-hidden bg-[#1F0A3C] px-7 py-8 text-white sm:px-10 lg:px-8 lg:py-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border-[28px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full border-[32px] border-white/10" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-white/70">Life Ledger</span>
              <ShieldCheck size={20} className="text-white/70" />
            </div>
            <div className="mt-12 flex items-center gap-4 lg:mt-auto lg:block">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.75rem] bg-white text-4xl font-black text-[#1F0A3C] shadow-xl">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="mt-0 lg:mt-6">
                <h2 className="text-3xl font-black tracking-tight">{profile.name}</h2>
                <p className="mt-2 text-sm font-bold uppercase tracking-[0.22em] text-white/70">{profile.role}</p>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-white/80 lg:mt-12">
              <span className="h-2.5 w-2.5 rounded-full bg-lime-300 shadow-[0_0_0_4px_rgba(190,242,100,0.18)]" />
              Account active
            </div>
          </div>
        </section>

        <section className="p-6 sm:p-9 lg:p-10">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Personal details</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Account information</h2>
            </div>
            <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-[#1F0A3C]/10 text-[#1F0A3C] sm:flex">
              <UserRound size={20} />
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <ProfileDetail icon={<UserRound size={18} />} label="Full name" value={profile.name} />
            <ProfileDetail icon={<ShieldCheck size={18} />} label="Role" value={profile.role} />
            <ProfileDetail icon={<Mail size={18} />} label="Email address" value={profile.email} wide />
            <ProfileDetail icon={<Phone size={18} />} label="Phone number" value={profile.phone} wide />
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-9">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1F0A3C] text-white">
              <LockKeyhole size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Security</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Change password</h2>
            </div>
          </div>
          <p className="max-w-sm text-sm leading-6 text-slate-500 sm:text-right">Use a strong password with at least 6 characters to keep your account protected.</p>
        </div>

        <form onSubmit={handlePasswordChange} className="mt-7 grid gap-5 md:grid-cols-3">
          <PasswordField
            label="Current password"
            value={passwords.current}
            onChange={(value) => setPasswords((current) => ({ ...current, current: value }))}
            autoComplete="current-password"
          />
          <PasswordField
            label="New password"
            value={passwords.next}
            onChange={(value) => setPasswords((current) => ({ ...current, next: value }))}
            autoComplete="new-password"
            minLength={6}
          />
          <PasswordField
            label="Confirm password"
            value={passwords.confirm}
            onChange={(value) => setPasswords((current) => ({ ...current, confirm: value }))}
            autoComplete="new-password"
            minLength={6}
          />

          <div className="flex flex-col gap-3 md:col-span-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={`text-sm font-semibold ${passwordStatus.type === "error" ? "text-red-600" : "text-emerald-600"}`} aria-live="polite">
              {passwordStatus.message}
            </p>
            <button
              type="submit"
              disabled={isSavingPassword || !passwords.current || !passwords.next || !passwords.confirm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1F0A3C] px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LockKeyhole size={16} />
              {isSavingPassword ? "Updating..." : "Update password"}
            </button>
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-4 rounded-[2rem] border border-red-100 bg-red-50/60 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-500">Danger zone</p>
          <h2 className="mt-1 text-lg font-black text-slate-900">Deactivate account</h2>
          <p className="mt-1 text-sm text-slate-600">Mark your account inactive and sign out. Your user details will be preserved.</p>
        </div>
        <button
          type="button"
          onClick={handleDeleteAccount}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-600 hover:text-white"
        >
          <Trash2 size={16} />
          Deactivate account
        </button>
      </section>
    </div>
  );
};

const PasswordField = ({ label, value, onChange, autoComplete, minLength }) => (
  <PasswordFieldInput
    label={label}
    value={value}
    onChange={onChange}
    autoComplete={autoComplete}
    minLength={minLength}
  />
);

const PasswordFieldInput = ({ label, value, onChange, autoComplete, minLength }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="block">
    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
    <div className="relative">
      <input
        type={isVisible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#1F0A3C] focus:bg-white focus:ring-4 focus:ring-[#1F0A3C]/10"
      />
      <button
        type="button"
        onClick={() => setIsVisible((visible) => !visible)}
        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-[#1F0A3C]"
        aria-label={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
      >
        {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </label>
  );
};

const ProfileDetail = ({ icon, label, value, wide = false }) => (
  <div className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-[#1F0A3C]/30 ${wide ? "md:col-span-2" : ""}`}>
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#1F0A3C] shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="mt-1.5 break-words text-lg font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  </div>
);

export default Profile;
