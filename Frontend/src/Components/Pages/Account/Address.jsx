import React, { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import { FiGrid, FiList } from "react-icons/fi";
import { FiMapPin } from "react-icons/fi";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { useAuth } from "../../../PrivateRouter/AuthContext";
import api from "../../../api";

const uniqueAddresses = (items) => {
  const seen = new Set();

  return items.filter((address) => {
    const addressKey = [
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
      .map((value) => String(value || "").trim().toLowerCase())
      .join("|");

    if (seen.has(addressKey)) return false;
    seen.add(addressKey);
    return true;
  });
};

export default function Address() {

  const { user } = useAuth();

  const [addresses, setAddresses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [locationLoading, setLocationLoading] = useState(false);

  const [form, setForm] = useState({
    order_id: null,
    user_id: user?.user_id || "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    street_address: "",
    city: "",
    district: "",
    state: "",
    country: "India",
    zip_code: ""
  });

  const fetchAddresses = async () => {
    try {
      const idsToMatch = [user?.user_id, user?.id].filter(Boolean).map(String);

      const res = await api.get("/addresses", {
        params: { user_id: user?.user_id || user?.id }
      });

      let userAddresses = Array.isArray(res.data) ? res.data : [];

      if (idsToMatch.length > 0) {
        userAddresses = userAddresses.filter((addr) =>
          idsToMatch.includes(String(addr.user_id)) ||
            idsToMatch.includes(String(addr.userId))
        );
      }

      if (!userAddresses.length) {
        const fallback = await api.get("/addresses");
        userAddresses = Array.isArray(fallback.data)
          ? fallback.data.filter((addr) => idsToMatch.includes(String(addr.user_id)) || idsToMatch.includes(String(addr.userId)))
          : [];
      }

      if (!userAddresses.length) {
        const orders = await api.get("/orders");
        userAddresses = Array.isArray(orders.data)
          ? orders.data.filter((order) => idsToMatch.includes(String(order.user_id)))
          : [];
      }

      setAddresses(uniqueAddresses(userAddresses));
    } catch (error) {
      console.error(error);
      try {
        const orders = await api.get("/orders");
        const idsToMatch = [user?.user_id, user?.id].filter(Boolean).map(String);
        const userOrders = Array.isArray(orders.data)
          ? orders.data.filter((order) => idsToMatch.includes(String(order.user_id)))
          : [];
        setAddresses(uniqueAddresses(userOrders));
      } catch (fallbackError) {
        console.error(fallbackError);
      }
    }
  };

  useEffect(() => {
    if (user?.user_id) fetchAddresses();
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Location is not supported by this browser");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`,
            { headers: { Accept: "application/json" } }
          );
          if (!response.ok) throw new Error("Unable to fetch address");

          const data = await response.json();
          const address = data.address || {};
          const streetAddress = [
            address.house_number,
            address.road,
            address.neighbourhood,
            address.suburb,
            address.quarter,
          ].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(", ");

          setForm((previous) => ({
            ...previous,
            street_address: streetAddress || data.display_name || previous.street_address,
            city: address.city || address.town || address.village || previous.city,
            district: address.county || address.state_district || previous.district,
            state: address.state || previous.state,
            country: address.country || previous.country,
            zip_code: address.postcode || previous.zip_code,
          }));
          alert("Current location added to the address form");
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          alert("Could not fetch your address. Please enter it manually.");
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error("Location permission failed:", error);
        alert("Please allow location access to fetch your current address");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const addAddress = async () => {

    try {

      await api.post("/addresses", { ...form, user_id: user?.user_id || user?.id });

      alert("Address added");

      setForm({
        order_id: null,
        user_id: user?.user_id,
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        street_address: "",
        city: "",
        district: "",
        state: "",
        country: "India",
        zip_code: ""
      });
      setShowAddressForm(false);

      fetchAddresses();

    } catch (error) {
      console.error(error);
    }
  };

  const editAddress = (address) => {

    setEditingId(address.id);

    setForm(address);
    setShowAddressForm(true);

  };

  const updateAddress = async () => {

    try {

      await api.put(`/addresses/${editingId}`, form);

      alert("Address updated");

      setEditingId(null);
      setShowAddressForm(false);

      fetchAddresses();

    } catch (error) {
      console.error(error);
    }
  };

  const deleteAddress = async (id) => {

    if (!window.confirm("Delete address?")) return;

    try {

      await api.delete(`/addresses/${id}`);

      fetchAddresses();

    } catch (error) {
      console.error(error);
    }
  };

  return (

    <div className="space-y-8 rounded-2xl border border-primary/10 bg-gradient-to-br from-white via-white to-primary/5 p-4 sm:p-6">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary-dark">Saved Addresses</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your delivery addresses.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`p-2 rounded-md transition ${viewMode === "card" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-primary"}`}
              aria-label="Card view"
              title="Card view"
            >
              <FiGrid size={18} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-md transition ${viewMode === "table" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-primary"}`}
              aria-label="Table view"
              title="Table view"
            >
              <FiList size={18} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm((previous) => ({
                ...previous,
                order_id: null,
                user_id: user?.user_id || user?.id || "",
                customer_name: user?.name || user?.username || "",
                customer_email: user?.email || "",
                customer_phone: user?.phone || user?.phone_number || user?.mobile || "",
              }));
              setShowAddressForm((isVisible) => !isVisible);
            }}
            className="bg-primary text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-light transition"
          >
            {showAddressForm ? "Close" : "+ Add Address"}
          </button>
        </div>
      </div>

      {/* ADDRESS LIST */}

      {viewMode === "card" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {addresses.map((address) => (

            <div
              key={address.id}
              className="bg-white border border-gray-300 rounded-xl p-6 shadow-sm"
            >

          <p className="text-sm leading-6">

            {address.customer_name} <br />

            {address.street_address} <br />

            {address.city}, {address.district} <br />

            {address.state} - {address.zip_code} <br />

            {address.country} <br />

            Phone: {address.customer_phone} <br />

            Email: {address.customer_email}

          </p>

          <div className="mt-4 flex gap-2">

            <button
              onClick={() => editAddress(address)}
              className="p-2 rounded-lg text-primary hover:bg-primary/10 transition"
              aria-label="Edit address"
              title="Edit address"
            >
              <FiEdit2 size={17} />
            </button>

            <button
              onClick={() => deleteAddress(address.id)}
              className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
              aria-label="Delete address"
              title="Delete address"
            >
              <FiTrash2 size={17} />
            </button>

          </div>

            </div>

          ))}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-sm">
          <table className="w-full text-left min-w-[720px]">
            <thead className="bg-primary-dark border-b border-primary-light">
              <tr>
                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-white/80 text-center">S No</th>
                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-white/80">Name</th>
                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-white/80">Address</th>
                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-white/80">Phone</th>
                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-white/80">Email</th>
                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-white/80 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {addresses.map((address, index) => (
                <tr key={address.id} className="hover:bg-primary/5 transition">
                  <td className="px-5 py-4 text-sm font-semibold text-gray-600 text-center">{index + 1}</td>
                  <td className="px-5 py-4 font-semibold text-primary-dark">{address.customer_name}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {address.street_address}, {address.city}, {address.district}, {address.state} - {address.zip_code}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{address.customer_phone}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{address.customer_email}</td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <button onClick={() => editAddress(address)} className="inline-flex p-2 rounded-lg text-primary hover:bg-primary/10 transition mr-1" aria-label="Edit address" title="Edit address"><FiEdit2 size={17} /></button>
                    <button onClick={() => deleteAddress(address.id)} className="inline-flex p-2 rounded-lg text-red-600 hover:bg-red-50 transition" aria-label="Delete address" title="Delete address"><FiTrash2 size={17} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ADDRESS FORM */}

      {showAddressForm && <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={() => { setEditingId(null); setShowAddressForm(false); }}
      >
        <div
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 sm:p-8"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-primary-light">Delivery details</p>
              <h2 className="text-xl font-bold text-primary-dark mt-1">
                {editingId ? "Edit Address" : "Add Address"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => { setEditingId(null); setShowAddressForm(false); }}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-primary-dark transition"
              aria-label="Close address form"
            >
              <FiX size={20} />
            </button>
          </div>

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locationLoading}
            className="w-full mb-5 flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition disabled:opacity-60"
          >
            <FiMapPin size={17} />
            {locationLoading ? "Fetching current location..." : "Use Current Location"}
          </button>

        <div className="grid md:grid-cols-2 gap-4">

          <label className="space-y-1.5">
            <span className="block text-sm font-semibold text-gray-700">Full Name</span>
            <input name="customer_name" placeholder="Enter full name" value={form.customer_name} onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"/>
          </label>

          <label className="space-y-1.5">
            <span className="block text-sm font-semibold text-gray-700">Email</span>
            <input name="customer_email" placeholder="Enter email" value={form.customer_email} onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"/>
          </label>

          <label className="space-y-1.5">
            <span className="block text-sm font-semibold text-gray-700">Phone</span>
            <input name="customer_phone" placeholder="Enter phone number" value={form.customer_phone} onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"/>
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="block text-sm font-semibold text-gray-700">Street Address</span>
            <textarea name="street_address" placeholder="Enter street address" value={form.street_address} onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"/>
          </label>

          <label className="space-y-1.5">
            <span className="block text-sm font-semibold text-gray-700">City</span>
            <input name="city" placeholder="Enter city" value={form.city} onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"/>
          </label>

          <label className="space-y-1.5">
            <span className="block text-sm font-semibold text-gray-700">District</span>
            <input name="district" placeholder="Enter district" value={form.district} onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"/>
          </label>

          <label className="space-y-1.5">
            <span className="block text-sm font-semibold text-gray-700">State</span>
            <input name="state" placeholder="Enter state" value={form.state} onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"/>
          </label>

          <label className="space-y-1.5">
            <span className="block text-sm font-semibold text-gray-700">ZIP Code</span>
            <input name="zip_code" placeholder="Enter ZIP code" value={form.zip_code} onChange={handleChange} className="w-full border border-gray-300 p-3 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"/>
          </label>

        </div>

        <div className="mt-6">

          {editingId ? (

            <div className="flex justify-end gap-3">
              <button
                onClick={updateAddress}
                className="bg-primary text-white px-6 py-2 rounded"
              >
                Update Address
              </button>
              <button
                type="button"
                onClick={() => { setEditingId(null); setShowAddressForm(false); }}
                className="border border-gray-200 text-gray-600 px-6 py-2 rounded"
              >
                Cancel
              </button>
            </div>

          ) : (

            <div className="flex justify-end gap-3">
              <button
                onClick={addAddress}
                className="bg-primary text-white px-6 py-2 rounded"
              >
                Add Address
              </button>
              <button
                type="button"
                onClick={() => setShowAddressForm(false)}
                className="border border-gray-200 text-gray-600 px-6 py-2 rounded"
              >
                Cancel
              </button>
            </div>

          )}

        </div>

        </div>
      </div>}

    </div>

  );

}