import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import { AuthContext } from "../../PrivateRouter/AuthContext";
import api from "../../api";
import PageHeader from "../CommenComponents/PageHeader";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { FiMapPin, FiLoader, FiSearch, FiCheck } from "react-icons/fi";



const Checkout = () => {

  const { cart, clearCart } = useContext(StoreContext);
  const { user } = useContext(AuthContext);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const navigate = useNavigate();

  const location = useLocation();

  const buyNowProduct = location.state?.product;
  const buyNowVariant = location.state?.variant;
  const buyNowSize = location.state?.size;
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addressSearch, setAddressSearch] = useState("");
  const [locating, setLocating] = useState(false);
  const buyNowQuantity = location.state?.quantity || 1;

  const fetchAddresses = async () => {
    try {
      const [addressRes, orderRes] = await Promise.all([
        api.get("/addresses").catch(() => ({ data: [] })),
        api.get("/orders").catch(() => ({ data: [] }))
      ]);

      const addressRows = Array.isArray(addressRes.data) ? addressRes.data : [];
      const orderRows = Array.isArray(orderRes.data) ? orderRes.data : [];

      const currentUserId = user?.user_id || user?.id;

      const merged = [...addressRows, ...orderRows].filter((row) => {
        if (!row) return false;

        // Strictly filter to only the logged-in user's addresses
        if (currentUserId) {
          if (String(row.user_id) !== String(currentUserId)) return false;
        }

        const isValidAddress = [
          row.customer_name,
          row.customer_email,
          row.customer_phone,
          row.street_address,
          row.city,
          row.district,
          row.state,
          row.zip_code,
        ].some((value) => String(value || "").trim() !== "");

        return isValidAddress;
      });

      const uniqueAddresses = merged.reduce((acc, row) => {
        const signature = [
          row.customer_name,
          row.customer_email,
          row.customer_phone,
          row.street_address,
          row.city,
          row.district,
          row.state,
          row.country,
          row.zip_code,
        ]
          .filter(Boolean)
          .join("|")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();

        if (!signature) return acc;

        if (!acc.some((item) => {
          const itemSignature = [
            item.customer_name,
            item.customer_email,
            item.customer_phone,
            item.street_address,
            item.city,
            item.district,
            item.state,
            item.country,
            item.zip_code,
          ]
            .filter(Boolean)
            .join("|")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();

          return itemSignature === signature;
        })) {
          acc.push(row);
        }

        return acc;
      }, []);

      setAddresses(uniqueAddresses);
    } catch (error) {
      console.error(error);
      setAddresses([]);
    }
  };

  useEffect(() => {
    if (user?.user_id || user?.id) {
      fetchAddresses();
      // Pre-fill form details if they are empty
      setForm((prev) => ({
        ...prev,
        user_id: prev.user_id || user?.user_id || user?.id || "",
        customer_name: prev.customer_name || user?.username || user?.name || user?.full_name || user?.customer_name || "",
        customer_email: prev.customer_email || user?.email || user?.customer_email || "",
        customer_phone: prev.customer_phone || user?.phone || user?.phone_number || user?.customer_phone || "",
      }));
    } else {
      fetchAddresses();
    }
  }, [user]);

  const selectAddress = (address) => {

    setSelectedAddress(address.id);

    setForm({
      ...form,
      customer_name: address.customer_name,
      customer_email: address.customer_email,
      customer_phone: address.customer_phone,
      street_address: address.street_address,
      city: address.city,
      district: address.district,
      state: address.state,
      country: address.country,
      zip_code: address.zip_code
    });

  };

  const filteredAddresses = addresses.reduce((acc, address) => {
    const searchText = addressSearch.trim().toLowerCase();
    
    // Only show addresses if there is a search term
    if (!searchText) return acc;

    const candidate = [
      address.customer_name,
      address.customer_email,
      address.customer_phone,
      address.street_address,
      address.city,
      address.district,
      address.state,
      address.zip_code,
    ].join(" ").toLowerCase();

    const isMatch = candidate.includes(searchText);
    if (!isMatch) return acc;

    const signature = [
      address.customer_name,
      address.customer_email,
      address.customer_phone,
      address.street_address,
      address.city,
      address.district,
      address.state,
      address.country,
      address.zip_code,
    ]
      .filter(Boolean)
      .join("|")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    if (!signature || acc.some((item) => {
      const itemSignature = [
        item.customer_name,
        item.customer_email,
        item.customer_phone,
        item.street_address,
        item.city,
        item.district,
        item.state,
        item.country,
        item.zip_code,
      ]
        .filter(Boolean)
        .join("|")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
      return itemSignature === signature;
    })) return acc;

    acc.push(address);
    return acc;
  }, []);

  const indianStates = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Delhi"
  ];

  const checkoutItems = buyNowProduct
    ? [
      {
        id: buyNowProduct.id,
        name: buyNowProduct.name,
        image: buyNowVariant?.images?.[0],
        price: buyNowProduct.offer_price,
        quantity: buyNowQuantity,
        size: buyNowSize,
        colorName: buyNowVariant?.color
      }
    ]
    : cart;

  const [form, setForm] = useState({
    user_id: user?.user_id || user?.id || "",
    customer_name: user?.username || user?.name || user?.full_name || user?.customer_name || "",
    customer_email: user?.email || user?.customer_email || "",
    customer_phone: user?.phone || user?.phone_number || user?.customer_phone || "",
    street_address: "",
    city: "",
    district: "",
    state: "",
    country: "India",
    zip_code: "",
    payment_method: "Online Payment"
  });

  const subtotal = checkoutItems.reduce(
    (total, item) => total + parseFloat(item.price || 0) * item.quantity,
    0
  );

  const shipping = 0;
  const total = subtotal + shipping;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported by this browser");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`
          );
          if (!response.ok) throw new Error("Location lookup failed");

          const data = await response.json();
          const address = data.address || {};
          const city = address.city || address.town || address.village || address.municipality || "";
          const district = address.state_district || address.county || address.district || "";
          const street = [
            address.house_number,
            address.road,
            address.neighbourhood || address.suburb,
          ].filter(Boolean).join(", ");

          setForm((previous) => ({
            ...previous,
            street_address: street || data.display_name || previous.street_address,
            city: city || previous.city,
            district: district || previous.district,
            state: address.state || previous.state,
            country: address.country || previous.country,
            zip_code: address.postcode || previous.zip_code,
          }));
          toast.success("Current location added to your address");
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          toast.error("Could not fetch address from your location");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        const message = error.code === error.PERMISSION_DENIED
          ? "Please allow location access in your browser"
          : "Could not access your current location";
        toast.error(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });

  const saveOrder = async (paymentId = null) => {
    try {

      const orderItems = checkoutItems.map((item) => ({
        product_id: item.product_id || item.id,
        quantity: item.quantity,
        variant_color: item.variant_color || item.colorName || "",
        variant_size: item.variant_size || item.size || "",
        price: item.price,
        image: item.image,
        email: form.customer_email,
        user_id: user?.user_id
      }));

      const orderData = {
        ...form,
        user_id: user?.user_id,
        email: form.customer_email,
        payment_status: paymentMethod === "razorpay" ? "paid" : "pending",
        payment_id: paymentId,
        items: orderItems,
        total_amount: total,
        created_at: new Date().toISOString()
      };

      // Save order
      await api.post("/orders", orderData);

      // ❌ removed update-stock API

      // Clear cart
      await clearCart();

      // Reset form
      setForm({
        user_id: user?.user_id || "",
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        street_address: "",
        city: "",
        district: "",
        state: "",
        country: "India",
        zip_code: "",
        payment_method: "Showroom"
      });

      toast.success("Order Placed Successfully!");
      navigate("/account?tab=orders");

    } catch (error) {
      console.error(error);
      alert("Order failed");
    }
  };

  const handleOrder = async () => {

    if (!form.customer_name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!form.customer_email.trim()) {
      toast.error("Please enter email");
      return;
    }

    if (!form.customer_phone.trim()) {
      toast.error("Please enter phone number");
      return;
    }

    if (!form.street_address.trim()) {
      toast.error("Please enter street address");
      return;
    }

    if (!form.city.trim()) {
      toast.error("Please enter city");
      return;
    }

    if (!form.district.trim()) {
      toast.error("Please enter district");
      return;
    }

    if (!form.state.trim()) {
      toast.error("Please select state");
      return;
    }

    if (!form.zip_code.trim()) {
      toast.error("Please enter zip code");
      return;
    }

    if (!checkoutItems.length) {
      alert("No product to checkout");
      return;
    }

    try {

      // CASH ON DELIVERY
      if (paymentMethod === "cod") {
        await saveOrder();
        return;
      }

      // RAZORPAY PAYMENT
      const loaded = await loadRazorpay();

      if (!loaded) {
        alert("Razorpay SDK failed to load");
        return;
      }

      const options = {
        key: "rzp_test_SGj8n5SyKSE10b",
        amount: total * 100,
        currency: "INR",
        name: "Saree World",
        description: "Order Payment",

        handler: async function (response) {

          console.log("Payment Success:", response);

          await saveOrder(response.razorpay_payment_id);

        },

        prefill: {
          name: form.customer_name,
          email: form.customer_email,
          contact: form.customer_phone
        },

        theme: {
          color: "#ef4444"
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (error) {
      console.error(error);
      alert("Payment failed");
    }
  };

  return (
    <>
      <PageHeader title="Checkout" />

      <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 lg:grid-cols-[1.85fr_1fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
            <h1 className="mb-8 text-3xl font-bold text-gray-900">
              Shipping Details
            </h1>

            <div className="mb-8">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Search Saved Address
              </label>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    placeholder="Search by name, phone, address..."
                    className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a66ae9] focus:outline-none focus:ring-1 focus:ring-[#a66ae9]"
                  />
                </div>

                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={locating}
                  className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primary-light disabled:opacity-70"
                >
                  {locating ? <FiLoader className="animate-spin" /> : <FiMapPin />}
                  {locating ? "Fetching..." : "Current Location"}
                </button>
              </div>

              {filteredAddresses.length > 0 && (
                <div className="mt-4 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                  {filteredAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => selectAddress(addr)}
                      className="flex w-full cursor-pointer flex-col gap-1 border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-gray-50 focus:bg-gray-50"
                    >
                      <span className="text-sm font-bold uppercase text-gray-900">
                        {addr.customer_name}
                      </span>
                      <span className="text-sm text-gray-600">
                        {addr.customer_phone}
                      </span>
                      <span className="text-xs text-gray-500">
                        {[
                          addr.street_address,
                          addr.city,
                          addr.district,
                          addr.state,
                          addr.country,
                          addr.zip_code,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  name="customer_name"
                  placeholder="Enter your full name"
                  value={form.customer_name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a66ae9] focus:outline-none focus:ring-1 focus:ring-[#a66ae9]"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    name="customer_phone"
                    placeholder="918940450960"
                    value={form.customer_phone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a66ae9] focus:outline-none focus:ring-1 focus:ring-[#a66ae9]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    name="customer_email"
                    placeholder="Email address"
                    value={form.customer_email}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a66ae9] focus:outline-none focus:ring-1 focus:ring-[#a66ae9]"
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Door Number
                  </label>
                  <input
                    name="street_address"
                    placeholder="Door/Flat/Block No."
                    value={form.street_address}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a66ae9] focus:outline-none focus:ring-1 focus:ring-[#a66ae9]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Street Name
                  </label>
                  <input
                    name="city"
                    placeholder="Street name"
                    value={form.city}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a66ae9] focus:outline-none focus:ring-1 focus:ring-[#a66ae9]"
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    name="city"
                    placeholder="City"
                    value={form.city}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a66ae9] focus:outline-none focus:ring-1 focus:ring-[#a66ae9]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    PIN Code
                  </label>
                  <input
                    name="zip_code"
                    placeholder="PIN Code"
                    value={form.zip_code}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a66ae9] focus:outline-none focus:ring-1 focus:ring-[#a66ae9]"
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    State
                  </label>
                  <select
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-[#a66ae9] focus:outline-none focus:ring-1 focus:ring-[#a66ae9]"
                  >
                    <option value="">Select State</option>
                    {indianStates.map((state, i) => (
                      <option key={i} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <select
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-[#a66ae9] focus:outline-none focus:ring-1 focus:ring-[#a66ae9]"
                  >
                    <option value="India">India</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">
              Order Summary
            </h2>

            <div className="space-y-4">
              {checkoutItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-16 w-16 shrink-0 rounded-lg border border-gray-200 object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 shrink-0 rounded-lg border border-gray-200 bg-[radial-gradient(circle_at_30%_30%,#f9d0ff_0%,#ffcf7f_28%,#d097ff_48%,#6f84ff_70%,#f3d0ff_100%)]" />
                  )}

                  <div className="flex flex-1 flex-col">
                    <p className="text-sm font-bold text-gray-900 line-clamp-1">
                      {item.name}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                      <span>Qty: {item.quantity} {item.size && `| Size: ${item.size}`}</span>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    ₹{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 border-t border-gray-100 pt-6 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900">₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Shipping</span>
                <span className="font-medium text-gray-900">₹{shipping.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-lg font-bold text-gray-900">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOrder}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-primary-light"
            >
              Pay Online
            </button>
          </aside>
        </div>
      </div>
    </>
  );
};

export default Checkout;