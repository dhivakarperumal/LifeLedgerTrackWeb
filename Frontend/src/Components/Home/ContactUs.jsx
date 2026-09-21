import React, { useState, useRef, useEffect } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  MessageCircle,
  ChevronDown,
  CheckCircle,
  Star,
  Heart,
  Sparkles,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  ArrowRight,
  User,
  AtSign,
  PhoneCall,
  FileText,
  MessageSquare,
  Headset,
  Briefcase,
  Scissors,
  Camera,
  QrCode,
  ShieldCheck,
  Quote,
} from "lucide-react";
import PageContainer from "../CommenComponents/PageContainer";
import PageHeader from "../CommenComponents/PageHeader";

// --- REUSABLE ANIMATION WRAPPER ---
const FadeIn = ({ children, delay = 0, className = "", direction = "up" }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const translateValue =
    direction === "up"
      ? "translateY(32px)"
      : direction === "left"
        ? "translateX(-32px)"
        : direction === "right"
          ? "translateX(32px)"
          : "translateY(0)";

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate(0,0)" : translateValue,
        transition: `opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

// --- FLOATING BACKGROUND SHAPE ---
const FloatingShape = ({ size, color, top, left, delay, duration = "6s" }) => (
  <div
    className="absolute rounded-full opacity-20 pointer-events-none"
    style={{
      width: size,
      height: size,
      background: color,
      top,
      left,
      animation: `floatShape ${duration} ease-in-out ${delay}s infinite alternate`,
      filter: "blur(4px)",
    }}
  />
);

// --- DATA ---
const departments = [
  {
    icon: Headset,
    title: "Customer Support",
    desc: "For order updates, tracking, and general queries.",
    email: "support@sareeshop.com",
    phone: "+91 98765 43210",
  },
  {
    icon: Briefcase,
    title: "Wholesale & Bulk",
    desc: "For B2B inquiries and bulk order discounts.",
    email: "b2b@sareeshop.com",
    phone: "+91 98765 54321",
  },
  {
    icon: Scissors,
    title: "Custom Stitching",
    desc: "Discuss your measurements and custom blouse requirements.",
    email: "tailor@sareeshop.com",
    phone: "+91 98765 12345",
  },
  {
    icon: Camera,
    title: "Press & Media",
    desc: "For PR, collaborations, and media inquiries.",
    email: "pr@sareeshop.com",
    phone: "+91 98765 67890",
  },
];

const team = [
  {
    name: "Ananya Sharma",
    role: "Senior Stylist",
    img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80",
  },
  {
    name: "Rahul Verma",
    role: "Support Lead",
    img: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80",
  },
  {
    name: "Priya Patel",
    role: "Bridal Consultant",
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80",
  },
];

const processSteps = [
  {
    step: "01",
    title: "We Receive Your Message",
    desc: "Your inquiry is instantly routed to the right specialist based on context.",
  },
  {
    step: "02",
    title: "Expert Review",
    desc: "Our team assesses your requirements, checking inventory and best options.",
  },
  {
    step: "03",
    title: "Personalized Response",
    desc: "You receive a tailored solution or consultation via email or phone call.",
  },
];

const faqs = [
  {
    q: "What types of sarees do you offer?",
    a: "We offer a wide range including Kanchipuram Silk, Banarasi, Chiffon, Georgette, Cotton, Linen, and designer sarees. Each piece is handpicked for quality and authenticity.",
  },
  {
    q: "Do you provide international shipping?",
    a: "Yes! We ship worldwide. International delivery typically takes 7-14 business days. Shipping charges vary by location and are calculated at checkout.",
  },
  {
    q: "What is your return & exchange policy?",
    a: "We offer a 7-day easy return and exchange policy. Items must be unworn, unwashed, and in original packaging with tags intact. Custom orders are non-returnable.",
  },
  {
    q: "Can I get custom blouse stitching?",
    a: "Absolutely! We provide custom blouse stitching services. Share your measurements and preferred design, and our expert tailors will craft the perfect blouse for you.",
  },
  {
    q: "Do you offer bulk or wholesale pricing?",
    a: "Yes, we offer special pricing for bulk orders and wholesale buyers. Please use the Wholesale department contact above to discuss your requirements.",
  },
  {
    q: "How can I track my order?",
    a: "Once your order is shipped, you'll receive a tracking link via email and SMS. You can also track your order from your account dashboard.",
  },
];

const subjectOptions = [
  "General Inquiry",
  "Order Related",
  "Product Information",
  "Bulk / Wholesale Order",
  "Returns & Exchange",
  "Custom Stitching",
  "Feedback & Suggestions",
  "Other",
];

const ContactUs = () => {
  const [openFaq, setOpenFaq] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(true);

  // Determine if store is currently open (9AM to 8PM IST logic simulation)
  useEffect(() => {
    const checkStoreStatus = () => {
      const now = new Date();
      // Simple simulation for UI purposes: Open between 9:00 and 20:00 local time
      const hour = now.getHours();
      setIsStoreOpen(hour >= 9 && hour < 20);
    };
    checkStoreStatus();
    const timer = setInterval(checkStoreStatus, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    }, 1500);
  };

  return (
    <div className="bg-[#FCFAFA] min-h-screen overflow-hidden selection:bg-primary/20 selection:text-primary-dark">
      <style>{`
        @keyframes floatShape {
          0%   { transform: translateY(0) rotate(0deg) scale(1); }
          100% { transform: translateY(-40px) rotate(20deg) scale(1.1); }
        }
        @keyframes pulseDot {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(153,27,27,0.25); }
          50%      { box-shadow: 0 0 0 15px rgba(153,27,27,0); }
        }
        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(30px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity:0; transform:scale(0.8); }
          to   { opacity:1; transform:scale(1); }
        }
        .hero-gradient {
          background: linear-gradient(135deg, #7F1D1D 0%, #991B1B 45%, #B91C1C 100%);
        }
        .primary-gradient-text {
          background: linear-gradient(to right, #7F1D1D, #991B1B, #B91C1C);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .card-hover { transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease; }
        .card-hover:hover { transform: translateY(-8px); box-shadow: 0 25px 50px -12px rgba(153,27,27,0.15); }
        .input-focus:focus { border-color: #991B1B; box-shadow: 0 0 0 4px rgba(153,27,27,0.1); }
        .glass-panel { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
      `}</style>

      {/* ═══════════════════ 1. HERO SECTION ═══════════════════ */}
      {/* <section className="hero-gradient relative pt-32 pb-40 overflow-hidden">
       
        <FloatingShape
          size="150px"
          color="rgba(255,255,255,0.05)"
          top="5%"
          left="5%"
          delay={0}
          duration="7s"
        />
        <FloatingShape
          size="100px"
          color="rgba(255,255,255,0.04)"
          top="50%"
          left="85%"
          delay={1}
          duration="5s"
        />
        <FloatingShape
          size="80px"
          color="rgba(255,255,255,0.07)"
          top="30%"
          left="75%"
          delay={2}
          duration="6s"
        />
        <FloatingShape
          size="200px"
          color="rgba(255,255,255,0.03)"
          top="60%"
          left="15%"
          delay={0.5}
          duration="8s"
        />

      
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <PageContainer>
          <div className="relative z-10 text-center max-w-4xl mx-auto">
      
            <div
              style={{ animation: "fadeSlideUp 0.8s ease forwards" }}
              className="inline-flex items-center gap-3 glass-panel px-5 py-2.5 rounded-full text-white/90 text-sm mb-8 shadow-2xl shadow-black/10"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${isStoreOpen ? "bg-green-400" : "bg-red-400"}`}
                  style={
                    isStoreOpen ? { animation: "pulseDot 2s infinite" } : {}
                  }
                />
                <span className="font-medium tracking-wide">
                  {isStoreOpen
                    ? "Online & Ready to Help"
                    : "Currently Offline - Leave a message"}
                </span>
              </div>
              <span className="w-px h-4 bg-white/20" />
              <span className="flex items-center gap-1.5 opacity-80">
                <Clock className="w-3.5 h-3.5" /> Replies in ~15 mins
              </span>
            </div>

            <h1
              className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight"
              style={{ animation: "fadeSlideUp 0.8s ease 0.1s both" }}
            >
              How Can We{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-200 to-white italic">
                Help You?
              </span>
            </h1>

            <p
              className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-light"
              style={{ animation: "fadeSlideUp 0.8s ease 0.2s both" }}
            >
              Whether you need style advice, order support, or just want to say
              hello, our dedicated team of saree experts is here for you.
            </p>

            
            <div
              className="flex flex-col sm:flex-row justify-center items-center gap-5"
              style={{ animation: "fadeSlideUp 0.8s ease 0.3s both" }}
            >
              <a
                href="#form-section"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-primary font-bold px-8 py-4 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] hover:scale-105 transition-all duration-300"
              >
                <Mail className="w-5 h-5" /> Send a Message
              </a>
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 glass-panel text-white font-bold px-8 py-4 rounded-full hover:bg-white/10 hover:scale-105 transition-all duration-300"
              >
                <MessageCircle className="w-5 h-5" /> Chat on WhatsApp
              </a>
            </div>
          </div>
        </PageContainer>

   
        <div className="absolute bottom-[-1px] left-0 right-0">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full"
          >
            <path
              d="M0 120L1440 120L1440 60C1440 60 1100 0 720 0C340 0 0 60 0 60L0 120Z"
              fill="#FCFAFA"
            />
          </svg>
        </div>
      </section> */}

      <PageHeader title="Contact Us" />

      {/* ═══════════════════ 2. DEPARTMENT CARDS ═══════════════════ */}
      <PageContainer>
        <div className="relative z-20 py-15">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {departments.map((dept, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="bg-white rounded-3xl p-6 border border-primary/5 shadow-xl shadow-primary/5 card-hover group relative overflow-hidden h-full flex flex-col">
                  {/* Decorative corner blur */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />

                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-5 border border-gray-200 group-hover:border-primary/20 group-hover:shadow-lg transition-all">
                    <dept.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-xl text-gray-800 mb-2">
                    {dept.title}
                  </h3>
                  <p className="text-gray-500 text-sm mb-6 flex-grow leading-relaxed">
                    {dept.desc}
                  </p>

                  <div className="space-y-3 pt-4 border-t border-gray-100 mt-auto">
                    <a
                      href={`mailto:${dept.email}`}
                      className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary transition-colors font-medium"
                    >
                      <Mail className="w-4 h-4 text-primary/60" /> {dept.email}
                    </a>
                    <a
                      href={`tel:${dept.phone}`}
                      className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary transition-colors font-medium"
                    >
                      <Phone className="w-4 h-4 text-primary/60" /> {dept.phone}
                    </a>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </PageContainer>

      {/* ═══════════════════ 3. CONTACT FORM & PROCESS ═══════════════════ */}
      <section id="form-section" className="py-16 md:py-24 bg-white relative">
        {/* Background accent */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/[0.02] rounded-l-[100px] pointer-events-none hidden lg:block" />

        <PageContainer>
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-stretch">
            {/* LEFT: FORM */}
            <div className="lg:col-span-7">
              <FadeIn direction="right">
                <div className="mb-10">
                  <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
                    Let's Start a{" "}
                    <span className="text-primary-light">Conversation</span>
                  </h2>
                  <p className="text-gray-500 text-lg">
                    Fill out the form below. We're excited to hear from you.
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative">
                  {submitted ? (
                    <div
                      className="py-20 text-center"
                      style={{ animation: "scaleIn 0.5s ease forwards" }}
                    >
                      <div
                        className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-50 flex items-center justify-center border border-green-100"
                        style={{ animation: "pulseGlow 2s infinite" }}
                      >
                        <CheckCircle className="w-12 h-12 text-primary" />
                      </div>
                      <h3 className="text-3xl font-bold text-gray-800 mb-3">
                        Message Sent Successfully!
                      </h3>
                      <p className="text-gray-500 text-lg max-w-sm mx-auto">
                        Thank you for reaching out. A specialist will be in
                        touch with you at{" "}
                        <span className="font-semibold text-gray-700">
                          {formData.email || "your provided email"}
                        </span>{" "}
                        shortly.
                      </p>
                      <button
                        onClick={() => setSubmitted(false)}
                        className="mt-8 text-primary font-semibold hover:underline"
                      >
                        Send another message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-6">
                        {/* Name Input */}
                        <div className="relative group">
                          <label className="text-sm font-semibold text-gray-700 mb-2 block">
                            Full Name <span className="text-primary">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <User className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              required
                              placeholder="e.g. Meera Lakshmi"
                              className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 input-focus transition-all duration-300"
                            />
                          </div>
                        </div>

                        {/* Email Input */}
                        <div className="relative group">
                          <label className="text-sm font-semibold text-gray-700 mb-2 block">
                            Email Address{" "}
                            <span className="text-primary">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <AtSign className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              required
                              placeholder="meera@example.com"
                              className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 input-focus transition-all duration-300"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                        {/* Phone Input */}
                        <div className="relative group">
                          <label className="text-sm font-semibold text-gray-700 mb-2 block">
                            Phone Number
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <PhoneCall className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              placeholder="+91 98765 43210"
                              className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 input-focus transition-all duration-300"
                            />
                          </div>
                        </div>

                        {/* Subject Select */}
                        <div className="relative group">
                          <label className="text-sm font-semibold text-gray-700 mb-2 block">
                            Subject <span className="text-primary">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <FileText className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                            </div>
                            <select
                              name="subject"
                              value={formData.subject}
                              onChange={handleChange}
                              required
                              className="w-full pl-11 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 appearance-none input-focus transition-all duration-300 cursor-pointer"
                            >
                              <option value="" disabled>
                                Select a reason...
                              </option>
                              {subjectOptions.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Message Input */}
                      <div className="relative group">
                        <label className="text-sm font-semibold text-gray-700 mb-2 flex justify-between">
                          <span>
                            Message <span className="text-primary">*</span>
                          </span>
                          <span
                            className={`font-normal ${formData.message.length > 900 ? "text-red-500" : "text-gray-400"}`}
                          >
                            {formData.message.length}/1000
                          </span>
                        </label>
                        <div className="relative">
                          <div className="absolute top-4 left-4 pointer-events-none">
                            <MessageSquare className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                          </div>
                          <textarea
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            required
                            maxLength="1000"
                            rows="5"
                            placeholder="Please provide as much detail as possible..."
                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 input-focus transition-all duration-300 resize-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={sending}
                        className="w-full py-4 text-white text-lg font-bold rounded-2xl bg-gradient-to-r from-primary-dark via-primary to-primary-light flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1 transition-all duration-300 disabled:opacity-70 disabled:transform-none cursor-pointer"
                      >
                        {sending ? (
                          <>
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                            Processing...
                          </>
                        ) : (
                          <>
                            Send Message <Send className="w-5 h-5" />
                          </>
                        )}
                      </button>
                      <p className="text-center text-sm text-gray-500 mt-4 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-green-500" /> Your
                        information is secure and encrypted.
                      </p>
                    </form>
                  )}
                </div>
              </FadeIn>
            </div>

            {/* RIGHT: PROCESS & TEAM */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <FadeIn direction="left" delay={200}>
                <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10 mb-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/40 blur-3xl rounded-full" />
                  <h3 className="text-2xl font-bold text-primary-dark mb-8">
                    What happens next?
                  </h3>

                  <div className="space-y-8 relative">
                    {/* Vertical Connecting Line */}
                    <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-primary/20" />

                    {processSteps.map((step, i) => (
                      <div key={i} className="flex gap-5 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-white border-2 border-primary flex items-center justify-center font-bold text-primary shadow-md flex-shrink-0">
                          {step.step}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-800 mb-1">
                            {step.title}
                          </h4>
                          <p className="text-gray-600 text-sm leading-relaxed">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>

              {/* Meet the Team */}
              <FadeIn direction="left" delay={400}>
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-primary" /> Meet Our Support
                    Experts
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Real people, passionate about sarees, ready to assist you.
                  </p>

                  <div className="flex flex-wrap gap-4">
                    {team.map((member, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <img
                          src={member.img}
                          alt={member.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                        />
                        <div>
                          <p className="text-sm font-bold text-gray-800">
                            {member.name}
                          </p>
                          <p className="text-xs text-primary font-medium">
                            {member.role}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* ═══════════════════ 4. ENHANCED FAQ SECTION ═══════════════════ */}
      {/* <section className="py-24 bg-gray-50 border-t border-gray-100">
        <PageContainer>
          <div className="max-w-4xl mx-auto">
            <FadeIn>
              <div className="text-center mb-16">
                <span className="text-primary font-bold tracking-wider uppercase text-sm mb-3 block">
                  Got Questions?
                </span>
                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
                  Frequently Asked{" "}
                  <span className="primary-gradient-text">Questions</span>
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-primary-dark via-primary to-primary-light mx-auto rounded-full" />
              </div>
            </FadeIn>

            <div className="space-y-4">
              {faqs.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <FadeIn key={i} delay={i * 50}>
                    <div
                      className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isOpen ? "border-primary/50 shadow-xl shadow-primary/5" : "border-gray-200 hover:border-primary/30"}`}
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : i)}
                        className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer group"
                      >
                        <span className="flex items-center gap-4">
                          <span
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${isOpen ? "bg-primary text-white scale-110 shadow-md" : "bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary"}`}
                          >
                            0{i + 1}
                          </span>
                          <span
                            className={`text-lg font-semibold transition-colors ${isOpen ? "text-primary" : "text-gray-800"}`}
                          >
                            {faq.q}
                          </span>
                        </span>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all bg-gray-50 ${isOpen ? "rotate-180 bg-primary/10" : ""}`}
                        >
                          <ChevronDown
                            className={`w-5 h-5 transition-colors ${isOpen ? "text-primary" : "text-gray-400 group-hover:text-primary"}`}
                          />
                        </div>
                      </button>
                      <div
                        className="overflow-hidden transition-all duration-500 ease-in-out"
                        style={{
                          maxHeight: isOpen ? "300px" : "0px",
                          opacity: isOpen ? 1 : 0,
                        }}
                      >
                        <div className="px-6 pb-6 pt-2 pl-[4.5rem]">
                          <p className="text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 relative">
                            <Quote className="absolute top-2 right-2 w-8 h-8 text-gray-200 opacity-50" />
                            {faq.a}
                          </p>
                        </div>
                      </div>
                    </div>
                  </FadeIn>
                );
              })}
            </div>

            <FadeIn delay={400}>
              <div className="mt-12 text-center bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-center gap-4">
                <p className="text-gray-600 font-medium">
                  Still have questions? We're here to help.
                </p>
                <a
                  href="#form-section"
                  className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white rounded-full font-semibold transition-colors shadow-md"
                >
                  Contact Support
                </a>
              </div>
            </FadeIn>
          </div>
        </PageContainer>
      </section> */}

      {/* ═══════════════════ 5. FLAGSHIP STORE & MAP ═══════════════════ */}
      <section className="py-24 bg-white">
        <PageContainer>
          <FadeIn>
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div>
                <span className="text-primary font-bold tracking-wider uppercase text-sm mb-3 block">
                  Visit Us
                </span>
                <h2 className="text-3xl md:text-5xl font-bold text-gray-900">
                  Our{" "}
                  <span className="text-primary-light">Flagship Store</span>
                </h2>
              </div>
              <p className="text-gray-500 max-w-md text-sm md:text-base border-l-2 border-primary pl-4 py-1">
                Experience the rich textures, vibrant colors, and unparalleled
                craftsmanship of our sarees in person.
              </p>
            </div>
          </FadeIn>

          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Interactive Map */}
            <FadeIn className="lg:col-span-8 h-full">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-200 h-[500px] lg:h-[600px] group">
                {/* Simulated interior image shown on hover */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558769132-cb1aea458c5e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80')] bg-cover bg-center z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <div className="absolute inset-0 bg-black/40 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none flex items-center justify-center">
                  <span className="text-white font-bold text-xl tracking-widest uppercase border-2 border-white px-6 py-2 backdrop-blur-sm rounded-lg shadow-2xl">
                    Store Interior
                  </span>
                </div>

                <iframe
                  title="store-location"
                  src="https://maps.google.com/maps?q=T.Nagar%20Chennai%20Tamil%20Nadu&t=&z=14&ie=UTF8&iwloc=&output=embed"
                  className="w-full h-full border-0 grayscale hover:grayscale-0 transition-all duration-[1500ms]"
                  loading="lazy"
                />

                {/* Floating Store Card */}
                <div className="absolute bottom-6 left-6 z-20 bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl max-w-sm transform group-hover:-translate-y-2 transition-transform duration-500">
                  <h4 className="font-bold text-gray-900 text-lg mb-2 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" /> Saree Boutique
                    Chennai
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 font-medium">
                    123, Silk Weaver Street, Usman Road,
                    <br />
                    T. Nagar, Chennai, Tamil Nadu 600017
                  </p>
                  <a
                    href="https://maps.google.com/?q=T.Nagar+Chennai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-bold py-3 rounded-xl transition-colors shadow-md"
                  >
                    Get Directions <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </FadeIn>

            {/* Store Information Beside Map */}
            <FadeIn delay={200} className="lg:col-span-4 space-y-6">
              {/* Operating Hours Card */}
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <Clock className="w-6 h-6 text-primary p-1 bg-primary/10 rounded-lg" />{" "}
                  Operating Hours
                </h3>
                <div className="space-y-4">
                  {[
                    { day: "Monday - Friday", time: "9:00 AM - 8:00 PM" },
                    { day: "Saturday", time: "9:00 AM - 9:00 PM" },
                    { day: "Sunday", time: "10:00 AM - 5:00 PM" },
                  ].map((h, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                    >
                      <span className="text-gray-600 font-medium">{h.day}</span>
                      <span className="text-gray-900 font-bold">{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* QR Code / Mobile App Card */}
              {/* <div className="bg-gradient-to-br from-primary-dark to-primary rounded-3xl p-8 border border-primary-light shadow-2xl shadow-primary/20 text-white relative overflow-hidden">
                <FloatingShape
                  size="150px"
                  color="rgba(255,255,255,0.1)"
                  top="-20px"
                  left="-20px"
                  delay={0}
                />
                <div className="relative z-10 flex gap-5 items-center">
                  <div className="bg-white p-3 rounded-xl shadow-inner flex-shrink-0">
                    <QrCode className="w-16 h-16 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Save Our Contact</h3>
                    <p className="text-white/80 text-sm leading-relaxed">
                      Scan QR to instantly message us on WhatsApp or save
                      contact details.
                    </p>
                  </div>
                </div>
              </div> */}

              {/* Customer Support Card */}
              <div className="bg-gradient-to-br from-primary-dark to-primary rounded-3xl p-8 border border-primary-light shadow-2xl shadow-primary/20 text-white relative overflow-hidden">

                <div className="flex gap-5 items-center">

                  <div className="bg-white p-3 rounded-xl shadow-inner flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-16 h-16 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 5.636a9 9 0 11-12.728 0 9 9 0 0112.728 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 9h6v6H9z"
                      />
                    </svg>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg mb-1">Need Help?</h3>

                    <p className="text-white/80 text-sm leading-relaxed mb-3">
                      Our support team is available to assist you.
                    </p>

                    <a
                      href="https://wa.me/91986543210"
                      target="_blank"
                      className="inline-block bg-white text-primary font-semibold px-4 py-2 rounded-lg text-sm hover:bg-gray-100 transition"
                    >
                      Chat on WhatsApp
                    </a>
                  </div>

                </div>

              </div>

              {/* Social Channels */}
              <div className="bg-gray-50 rounded-3xl p-8 border border-gray-200">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
                  Connect Socially
                </h3>
                <div className="flex gap-4">
                  {[
                    {
                      icon: Instagram,
                      color: "hover:bg-pink-600 hover:border-pink-600",
                    },
                    {
                      icon: Facebook,
                      color: "hover:bg-blue-600 hover:border-blue-600",
                    },
                    {
                      icon: Twitter,
                      color: "hover:bg-sky-500 hover:border-sky-500",
                    },
                    {
                      icon: Youtube,
                      color: "hover:bg-red-600 hover:border-red-600",
                    },
                  ].map((s, i) => (
                    <a
                      key={i}
                      href="#"
                      className={`w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-white transition-all duration-300 shadow-sm hover:shadow-lg ${s.color}`}
                    >
                      <s.icon className="w-5 h-5" />
                    </a>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </PageContainer>
      </section>

      
    </div>
  );
};

export default ContactUs;
