import { useState, useContext } from "react";
import api from "../../api";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../PrivateRouter/AuthContext";
import { toast } from "react-hot-toast";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", form);
      const userData = {
        ...res.data.user,
        role: String(res.data.user.role || "").trim().toLowerCase(),
      };
      login(userData, res.data.token);
      toast.success("Login successful!");
      if (userData.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Login Error:", error);
      toast.error(error.response?.data?.message || "Login failed");
    }
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      const googleUser = {
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
        googleId: decoded.sub,
      };

      const res = await api.post("/auth/google-login", googleUser);
      const userData = {
        ...res.data.user,
        role: String(res.data.user.role || "").trim().toLowerCase(),
      };

      login(userData, res.data.token);
      toast.success("Google login successful!");

      if (userData.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Google Login Error:", error);
      toast.error(error.response?.data?.message || error.message || "Google login failed");
    }
  };

  return (
    <div className="h-screen w-full font-sans flex overflow-hidden bg-[#faf9f8] relative selection:bg-primary selection:text-white">

      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-pink-100/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-[20%] w-[400px] h-[400px] bg-yellow-100/30 rounded-full blur-[80px] pointer-events-none" />

      {/* SVG Clip Path */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <clipPath id="sCurve" clipPathUnits="objectBoundingBox">
            <path d="M 0 0 L 0.92 0 C 1 0.35, 0.9 0.7, 0.65 1 L 0 1 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* LEFT IMAGE */}
      <div className="hidden lg:block lg:w-5/12 relative h-full z-20 drop-shadow-[20px_0_30px_rgba(0,0,0,0.15)]">
        <div
          className="absolute inset-0 bg-gradient-to-b from-yellow-200 via-yellow-500 to-yellow-700 w-[101.5%] h-full z-10"
          style={{ clipPath: 'url(#sCurve)' }}
        />
        <div
          className="absolute inset-0 bg-black w-full h-full z-20"
          style={{ clipPath: 'url(#sCurve)' }}
        >
          <img
            src="/login.png"
            alt="Premium Sarees"
            className="w-full h-full object-cover opacity-90 transition-transform duration-1000 hover:scale-105 origin-left"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-44 left-12 xl:left-16 text-white z-30">
            <h1 className="text-4xl xl:text-5xl font-serif mb-4 leading-tight drop-shadow-2xl text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">
              Life <br/> Ledger
            </h1>
            <p className="text-gray-200 text-sm max-w-[260px] font-light tracking-wide drop-shadow-md">
              Track daily expenses, capture memories, and keep your personal diary in one secure place.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <div className="h-[2px] w-10 bg-gradient-to-r from-yellow-400 to-transparent" />
              <span className="text-yellow-400 text-sm drop-shadow-lg shadow-yellow-400">✦</span>
              <div className="h-[2px] w-10 bg-gradient-to-l from-yellow-400 to-transparent" />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT FORM */}
      <div className="w-full lg:w-7/12 h-full flex flex-col justify-center px-6 py-4 sm:px-16 lg:px-24 relative z-10 overflow-hidden">
        <div className="max-w-md mx-auto w-full">

          {/* Logo & Header */}
          <div className="text-center mb-5">
            <div className="flex justify-center mb-2 relative">
              <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full scale-150" />
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-yellow-600 relative z-10 drop-shadow-sm">
                <path d="M12 22C12 22 19 18 19 12C19 9 17 6.5 14.5 5.5C13.5 5.1 12.5 5 12 5C11.5 5 10.5 5.1 9.5 5.5C7 6.5 5 9 5 12C5 18 12 22 12 22Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 22C12 22 15.5 17 15.5 11C15.5 7.5 13.5 4 12 2C10.5 4 8.5 7.5 8.5 11C8.5 17 12 22 12 22Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14.5 5.5C16.5 4.5 19 4.5 21 6C21 11 17 17 12 22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9.5 5.5C7.5 4.5 5 4.5 3 6C3 11 7 17 12 22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <p className="text-xs text-yellow-700 font-bold tracking-[0.2em] uppercase mb-4">Your personal life dashboard</p>
            <h3 className="text-xl font-serif text-gray-800 mb-1">Welcome Back</h3>
            <p className="text-gray-500 text-sm">Sign in to manage your expenses, diary, and memories.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email/Mobile */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1 tracking-wide">
                Email / Mobile Number
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  name="identifier"
                  type="text"
                  placeholder="Enter your email or mobile number"
                  onChange={handleChange}
                  className="w-full pl-12 p-3.5 rounded-xl bg-white border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium text-gray-700"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1 tracking-wide">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  onChange={handleChange}
                  className="w-full pl-12 p-3.5 pr-12 rounded-xl bg-white border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium text-gray-700"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 accent-primary" />
                <span className="text-sm text-gray-600 group-hover:text-primary transition-colors">Remember Me</span>
              </label>
              <a href="#" className="text-sm font-semibold text-primary-light hover:text-primary hover:underline transition-colors">
                Forgot Password?
              </a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl text-white font-semibold bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary transition-all flex items-center justify-center gap-2 relative overflow-hidden group shadow-lg shadow-primary/30 cursor-pointer hover:-translate-y-0.5"
            >
              <span className="relative z-10 flex items-center gap-2 tracking-wide">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secure Login
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>

            {/* OR */}
            <div className="flex items-center gap-4 my-1">
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-gray-300 to-gray-300"></div>
              <span className="text-xs text-gray-400 font-bold tracking-widest uppercase">OR</span>
              <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-gray-300 to-gray-300"></div>
            </div>

            {googleClientId && (
              <div className="flex justify-center w-full hover:scale-[1.02] transition-transform">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error("Google login failed")}
                  type="standard"
                  theme="outline"
                  size="large"
                  shape="rectangular"
                  width="100%"
                  logo_alignment="center"
                />
              </div>
            )}

            {/* Register Link */}
            <p className="text-center text-sm text-gray-500">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary-light font-bold hover:underline transition-all">
                Register Now
              </Link>
            </p>

          </form>
        </div>
      </div>

      {/* BOTTOM FEATURES BAR */}
      <div className="hidden lg:flex absolute bottom-0 left-0 w-[55%] h-36 bg-gradient-to-r from-primary-dark to-primary-light z-30 rounded-tr-[100px] shadow-2xl shadow-primary/30 items-center justify-evenly px-12 border-t border-r border-primary-light/50">

        <div className="flex flex-col items-center justify-center text-center group">
          <div className="p-3 bg-white/5 rounded-full mb-2 group-hover:bg-white/10 transition-colors">
            <svg className="w-7 h-7 text-yellow-400 group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 1.343-3 3v1h6v-1c0-1.657-1.343-3-3-3zm-3 5h6v5H9v-5zm-5-3h2m11 0h2M6 18h12" />
            </svg>
          </div>
          <span className="text-white text-[10px] uppercase font-bold tracking-widest">Expense<br/>Insights</span>
        </div>

        <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-yellow-600/30 to-transparent" />

        <div className="flex flex-col items-center justify-center text-center group">
          <div className="p-3 bg-white/5 rounded-full mb-2 group-hover:bg-white/10 transition-colors">
            <svg className="w-7 h-7 text-yellow-400 group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6.75A2.75 2.75 0 016.75 4h10.5A2.75 2.75 0 0120 6.75v10.5A2.75 2.75 0 0117.25 20H6.75A2.75 2.75 0 014 17.25V6.75zm3 2.5h10m-10 4h7" />
            </svg>
          </div>
          <span className="text-white text-[10px] uppercase font-bold tracking-widest">Diary<br/>Journal</span>
        </div>

        <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-yellow-600/30 to-transparent" />

        <div className="flex flex-col items-center justify-center text-center group">
          <div className="p-3 bg-white/5 rounded-full mb-2 group-hover:bg-white/10 transition-colors">
            <svg className="w-7 h-7 text-yellow-400 group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3.75a4.75 4.75 0 014.75 4.75c0 2.55-1.57 4.7-3.97 5.76l-.53.22V18h-1.5v-3.49l-.53-.22A5.74 5.74 0 017.25 8.5 4.75 4.75 0 0112 3.75zm0 15.25h.01" />
            </svg>
          </div>
          <span className="text-white text-[10px] uppercase font-bold tracking-widest">Memory<br/>Vault</span>
        </div>

      </div>

    </div>
  );
}

export default Login;
