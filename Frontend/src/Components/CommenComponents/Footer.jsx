import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Facebook,
  Instagram,
  Mail,
  Phone,
  MapPin,
  Home,
  Info,
  ShoppingBag,
  PhoneCall,
  Sparkles,
  Shirt,
  Gem
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import PageContainer from "./PageContainer";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="bg-gradient-to-r from-primary via-secondary to-primary-dark text-white mt-20">

      <PageContainer>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 py-12">

          {/* Section 1 */}
          <div>
            <Link to="/" className="flex items-center gap-3 mb-4">

              <img
                src="/logo.png"
                alt="Saree Show"
                className="w-12 h-12 rounded-lg bg-white p-1"
              />

              <div>
                <h2 className="relative inline-block border-b border-white/30 pb-2 text-xl font-bold after:absolute after:-bottom-px after:left-0 after:h-0.5 after:w-1/2 after:bg-yellow-400">Saree</h2>
                <p className="text-xs opacity-80">Premium Saree Collection</p>
              </div>

            </Link>

            <p className="text-sm opacity-90 leading-relaxed">
              Discover premium sarees and traditional collections for weddings,
              festivals, and special occasions. Quality and elegance in every design.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="relative mb-4 inline-block border-b border-white/30 pb-2 text-xl font-semibold after:absolute after:-bottom-px after:left-0 after:h-0.5 after:w-1/2 after:bg-yellow-400">Quick Links</h2>

            <ul className="space-y-3 text-sm">

              <li>
                <Link
                  to="/"
                  className="flex items-center gap-2 hover:translate-x-1 transition"
                >
                  <Home size={16} />
                  Home
                </Link>
              </li>

              <li>
                <Link
                  to="/about"
                  className="flex items-center gap-2 hover:translate-x-1 transition"
                >
                  <Info size={16} />
                  About Us
                </Link>
              </li>

              <li>
                <Link
                  to="/shop"
                  className="flex items-center gap-2 hover:translate-x-1 transition"
                >
                  <ShoppingBag size={16} />
                  Shop
                </Link>
              </li>

              <li>
                <Link
                  to="/contactus"
                  className="flex items-center gap-2 hover:translate-x-1 transition"
                >
                  <PhoneCall size={16} />
                  Contact Us
                </Link>
              </li>

            </ul>
          </div>

          {/* Categories */}
          <div>
            <h2 className="relative mb-4 inline-block border-b border-white/30 pb-2 text-xl font-semibold after:absolute after:-bottom-px after:left-0 after:h-0.5 after:w-1/2 after:bg-yellow-400">Categories</h2>

            <ul className="space-y-3 text-sm">

              <li className="flex items-center gap-2 hover:translate-x-1 transition">
                <Sparkles size={16} />
                Wedding Sarees
              </li>

              <li className="flex items-center gap-2 hover:translate-x-1 transition">
                <Gem size={16} />
                Silk Sarees
              </li>

              <li className="flex items-center gap-2 hover:translate-x-1 transition">
                <Shirt size={16} />
                Cotton Sarees
              </li>

              <li className="flex items-center gap-2 hover:translate-x-1 transition">
                <ShoppingBag size={16} />
                New Collection
              </li>

            </ul>
          </div>

          {/* Contact */}
          <div>
            <h2 className="relative mb-4 inline-block border-b border-white/30 pb-2 text-xl font-semibold after:absolute after:-bottom-px after:left-0 after:h-0.5 after:w-1/2 after:bg-yellow-400">Contact Us</h2>

            <div className="space-y-3 text-sm">

              <p className="flex items-center gap-2 transition">
                <Phone size={16} />
                +91 98765 43210
              </p>

              <p className="flex items-center gap-2 transition">
                <Mail size={16} />
                support@mystore.com
              </p>

              <p className="flex items-center gap-2 transition">
                <MapPin size={16} />
                Chennai, India
              </p>

            </div>

            {/* Social Icons */}
            <div className="flex gap-4 mt-5">

              <Facebook className="cursor-pointer hover:scale-125 transition duration-300" />

              <Instagram className="cursor-pointer hover:scale-125 transition duration-300" />

              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noreferrer"
                aria-label="Chat with us on WhatsApp"
                title="WhatsApp"
                className="hover:scale-125 transition duration-300"
              >
                <FaWhatsapp size={24} />
              </a>

              <Mail className="cursor-pointer hover:scale-125 transition duration-300" />

            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h2 className="relative mb-4 inline-block border-b border-white/30 pb-2 text-xl font-semibold after:absolute after:-bottom-px after:left-0 after:h-0.5 after:w-1/2 after:bg-yellow-400">Stay Connected</h2>
            <p className="text-sm opacity-90 leading-relaxed mb-4">
              Subscribe for new arrivals, special offers, and saree styling inspiration.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <label htmlFor="footer-subscription-email" className="sr-only">Email address</label>
              <input
                id="footer-subscription-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setSubscribed(false);
                }}
                placeholder="Your email address"
                required
                className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/60 outline-none focus:border-white"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-primary transition hover:bg-yellow-100"
              >
                Subscribe
              </button>
            </form>
            {subscribed && <p className="mt-2 text-xs text-yellow-200">Thanks for subscribing!</p>}
          </div>

        </div>

        {/* Bottom */}
        <div className="border-t border-white/30 py-4 text-center text-sm">
          © {new Date().getFullYear()} My Store. All Rights Reserved.
        </div>

      </PageContainer>
    </footer>
  );
};

export default Footer;