import { useAuth } from "../../PrivateRouter/AuthContext";
import { Mail, Phone, ShieldCheck, UserRound } from "lucide-react";

const Profile = () => {
  const { profileName, email, phone, role } = useAuth();

  const profile = {
    name: profileName || "Admin User",
    email: email || "admin@lifelink.com",
    phone: phone || "Not provided",
    role: role || "Admin",
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
    </div>
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
