import { useAuth } from "../../PrivateRouter/AuthContext";

const Profile = () => {
  const { profileName, email, phone, role } = useAuth();

  const profile = {
    name: profileName || "Admin User",
    email: email || "admin@lifelink.com",
    phone: phone || "Not provided",
    role: role || "Admin",
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Account</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Profile</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-violet-100 text-3xl font-bold text-violet-700">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="mt-5 text-center">
            <h2 className="text-2xl font-bold text-slate-900">{profile.name}</h2>
            <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">{profile.role}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Full name</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{profile.name}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Role</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{profile.role}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Email</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{profile.email}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Phone</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{profile.phone}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
