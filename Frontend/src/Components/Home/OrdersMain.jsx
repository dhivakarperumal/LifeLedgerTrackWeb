import React, { useEffect, useState, useContext } from "react";
import { Package, Truck, CheckCircle, Clock } from "lucide-react";
import { AuthContext } from "../../PrivateRouter/AuthContext";
import api from "../../api";
import { Printer } from "lucide-react";
import PageContainer from "../CommenComponents/PageContainer";

const StatusBadge = ({ status }) => {
  const getStatusConfig = () => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return {
          classes: "bg-emerald-50 text-emerald-600 border-emerald-200",
          icon: <CheckCircle className="w-4 h-4 mr-1.5" />,
        };

      case "shipped":
        return {
          classes: "bg-blue-50 text-blue-600 border-blue-200",
          icon: <Truck className="w-4 h-4 mr-1.5 animate-pulse" />,
        };

      case "processing":
        return {
          classes: "bg-amber-50 text-amber-600 border-amber-200",
          icon: <Clock className="w-4 h-4 mr-1.5 animate-spin-slow" />,
        };

      default:
        return {
          classes: "bg-gray-50 text-gray-600 border-gray-200",
          icon: <Package className="w-4 h-4 mr-1.5" />,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold border ${config.classes}`}
    >
      {config.icon}
      {status}
    </span>
  );
};

const OrdersMain = () => {
  const { user } = useContext(AuthContext);

  const resolveOrderImage = (image) => {
    if (!image || typeof image !== "string") return "/placeholder.png";
    if (/^(https?:|data:|blob:)/i.test(image)) return image;
    const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
    return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
  };

  const handlePrint = () => {
    const logoUrl = `${window.location.origin}/logo.png`;
    const itemsHtml = selectedOrder.items
      ?.map(
        (item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><img src="${resolveOrderImage(item.image)}" alt="${item.product_name || "Product"}" class="product-image"></td>
      <td>${item.product_name}</td>
      <td>${item.variant_color || "-"}</td>
      <td>${item.variant_size || "-"}</td>
      <td>${item.quantity}</td>
      <td>₹${item.price}</td>
      <td>₹${item.price * item.quantity}</td>
    </tr>
  `,
      )
      .join("");

    const printContent = `
<html>
<head>
<title>Order Invoice</title>

<style>
body{
  font-family: Arial, sans-serif;
  padding:40px;
  background:#f8f8f8;
}

.card{
  max-width:800px;
  margin:auto;
  background:white;
  border-radius:10px;
  padding:30px;
  box-shadow:0 5px 20px rgba(0,0,0,0.1);
}

.brand{
  text-align:center;
  margin-bottom:20px;
}

.brand img{
  height:70px;
  max-width:220px;
  object-fit:contain;
}

h2{
  margin-bottom:20px;
}

.section{
  margin-top:25px;
}

.row{
  display:flex;
  justify-content:space-between;
  border-bottom:1px solid #eee;
  padding:8px 0;
  font-size:14px;
}

table{
  width:100%;
  border-collapse:collapse;
  margin-top:10px;
}

th,td{
  border:1px solid #ddd;
  padding:8px;
  text-align:left;
  font-size:14px;
}

.product-image{
  width:50px;
  height:60px;
  object-fit:cover;
  border-radius:5px;
}

th{
  background:#f5f5f5;
}

.total{
  font-weight:bold;
  font-size:16px;
  margin-top:15px;
}
</style>
</head>

<body>

<div class="card">

<div class="brand">
  <img src="${logoUrl}" alt="Saree Show" />
</div>

<h2>Order Details</h2>

<div class="row">
<span>Order ID</span>
<span>${selectedOrder.order_id || selectedOrder.id}</span>
</div>

<div class="row">
<span>Date</span>
<span>${new Date(selectedOrder.created_at).toLocaleDateString()}</span>
</div>

<div class="row">
<span>Status</span>
<span>${selectedOrder.status}</span>
</div>

<div class="row total">
<span>Total Amount</span>
<span>₹${selectedOrder.total_amount}</span>
</div>

<div class="section">
<h3>Shipping Address</h3>

<p><b>${address?.customer_name || ""}</b></p>
<p>${address?.street_address || ""}</p>
<p>${address?.city || ""}, ${address?.district || ""}</p>
<p>${address?.state || ""} - ${address?.zip_code || ""}</p>
<p>${address?.country || ""}</p>
<p>Phone: ${address?.customer_phone || ""}</p>
<p>Email: ${address?.customer_email || ""}</p>

</div>

<div class="section">

<h3>Products</h3>

<table>

<thead>
<tr>
<th>S No</th>
<th>Image</th>
<th>Product</th>
<th>Color</th>
<th>Size</th>
<th>Qty</th>
<th>Price</th>
<th>Subtotal</th>
</tr>
</thead>

<tbody>

${itemsHtml}

</tbody>

</table>

</div>

</div>

</body>
</html>
`;

    const printWindow = window.open("", "", "width=800,height=600");

    if (!printWindow) return;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [address, setAddress] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get("/orders");

        const allOrders = res.data || [];

        const userOrders = allOrders.filter(
          (order) => order.user_id === user?.user_id,
        );

        setOrders(userOrders);
      } catch (error) {
        console.error("Failed to load orders", error);
      }
    };

    if (user?.user_id) fetchOrders();
  }, [user]);

  const openOrderDetails = async (order) => {
    setLoadingOrder(true);

    try {
      const orderRes = await api.get(`/orders/${order.id}`);
      setSelectedOrder(orderRes.data);

      const addressRes = await api.get(`/addresses/${order.id}`);
      setAddress(addressRes.data);

      setShowPopup(true);
    } catch (error) {
      console.error("Failed to load order details", error);
    } finally {
      setLoadingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 sm:py-14">
      <PageContainer>
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-gray-200 pb-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-light mb-2">Order history</p>
              <h1 className="text-3xl sm:text-4xl font-black text-primary-dark tracking-tight">My Orders</h1>
              <p className="text-sm text-gray-500 mt-2">Track your purchases and review order details.</p>
            </div>
            {orders.length > 0 && (
              <span className="text-sm font-bold text-gray-500 bg-white border border-gray-200 px-4 py-2 rounded-xl">
                {orders.length} {orders.length === 1 ? "order" : "orders"}
              </span>
            )}
          </div>

          {orders.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
              <Package className="w-10 h-10 text-primary-light mx-auto mb-3" />
              <h2 className="text-lg font-bold text-primary-dark">No orders yet</h2>
              <p className="text-sm text-gray-500 mt-1">Your completed purchases will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => openOrderDetails(order)}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden group"
                >
                  <div className="h-1.5 w-full bg-primary-light"></div>

                  {/* ORDER SUMMARY CARD */}

                  <div className="pt-5 px-5 pb-4">
                    {/* <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-gray-800">
                        Order Summary
                      </h3>
                    </div> */}

                    <div className="grid md:grid-cols-2 gap-x-12 gap-y-4 text-sm">
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-500">Order ID</span>
                        <span className="font-semibold">
                          {order.order_id || order.id}
                        </span>
                      </div>

                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-500">Date</span>
                        <span className="font-semibold">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-500">Status</span>
                        <StatusBadge status={order.status} />
                      </div>

                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-500">Customer</span>
                        <span className="font-semibold">{order.customer_name || "-"}</span>
                      </div>

                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-500">Phone</span>
                        <span className="font-semibold">{order.customer_phone || "-"}</span>
                      </div>

                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-500">Payment Method</span>
                        <span className="font-semibold capitalize">{order.payment_method || "-"}</span>
                      </div>

                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <span className="text-gray-500">Payment Status</span>
                        <span className="font-semibold capitalize">{order.payment_status || "-"}</span>
                      </div>

                      <div className="flex justify-between pt-2 text-base font-bold bg-primary/5 px-3 py-2 rounded-lg">
                        <span>Total Amount</span>
                        <span className="text-primary">
                          ₹{order.total_amount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ITEMS */}

                  <div className="px-5 pt-3 pb-5 space-y-3">
                    {order.items?.map((item, index) => (
                      <div
                        key={index}
                        className="flex gap-4 items-start border border-gray-100 rounded-xl p-3 hover:border-primary/30 transition bg-white group-hover:bg-primary/5"
                      >
                          <img
                            src={resolveOrderImage(item.image)}
                          alt={item.product_name}
                          className="w-20 h-24 object-cover rounded-lg border border-gray-100"
                          onError={(e) => {
                            e.target.src = "/placeholder.png";
                          }}
                        />

                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h3 className="font-semibold text-lg text-primary-dark group-hover:text-primary transition">
                              {item.product_name}
                            </h3>

                            <p className="font-bold text-primary text-base bg-primary/10 px-3 py-1 rounded-lg">
                              ₹{item.price}
                            </p>
                          </div>

                          <div className="text-sm text-gray-600 mt-2 space-y-1">
                            {item.variant_color && (
                              <p>Color: {item.variant_color}</p>
                            )}

                            {item.variant_size && (
                              <p>Size: {item.variant_size}</p>
                            )}

                            <p>Quantity: {item.quantity}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageContainer>

      {/* POPUP */}

      {showPopup && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* HEADER */}

            <div className="flex justify-between items-center px-5 sm:px-8 py-5 bg-primary-dark text-white">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Saree Show" className="h-10 w-10 rounded-lg bg-white p-1 object-contain" />
                <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">Order overview</p>
                <h2 className="text-xl sm:text-2xl font-bold tracking-wide">Order Details</h2>
                </div>
              </div>

              <button
                onClick={() => setShowPopup(false)}
                className="text-white text-2xl hover:scale-110 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* CONTENT */}

            <div className="p-5 sm:p-8 overflow-y-auto space-y-8">
              {/* ORDER SUMMARY CARD */}
              <div className="print-area bg-gray-50 border border-gray-200 rounded-xl p-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-gray-800">
                    Order Summary
                  </h3>

                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1 text-xs bg-primary text-white px-3 py-1.5 rounded-md hover:opacity-90 transition"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-x-8 text-sm">
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-primary/10 pb-2">
                      <span className="text-gray-500">Order ID</span>
                      <span className="font-semibold">{selectedOrder.order_id || selectedOrder.id}</span>
                    </div>
                    <div className="flex justify-between border-b border-primary/10 pb-2">
                      <span className="text-gray-500">Status</span>
                      <StatusBadge status={selectedOrder.status} />
                    </div>
                    <div className="flex justify-between border-b border-primary/10 pb-2">
                      <span className="text-gray-500">Customer</span>
                      <span className="font-semibold">{selectedOrder.customer_name || "-"}</span>
                    </div>
                    <div className="flex justify-between border-b border-primary/10 pb-2">
                      <span className="text-gray-500">Phone</span>
                      <span className="font-semibold">{selectedOrder.customer_phone || "-"}</span>
                    </div>
                  </div>

                  <div className="space-y-3 mt-3 md:mt-0">
                    <div className="flex justify-between border-b border-primary/10 pb-2">
                      <span className="text-gray-500">Date</span>
                      <span className="font-semibold">{new Date(selectedOrder.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-primary/10 pb-2">
                      <span className="text-gray-500">Payment Method</span>
                      <span className="font-semibold capitalize">{selectedOrder.payment_method || "-"}</span>
                    </div>
                    <div className="flex justify-between border-b border-primary/10 pb-2">
                      <span className="text-gray-500">Payment Status</span>
                      <span className="font-semibold capitalize">{selectedOrder.payment_status || "-"}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold bg-primary/5 px-3 py-2 rounded-lg">
                      <span>Total Amount</span>
                      <span className="text-primary">₹{selectedOrder.total_amount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ORDER TRACKING */}

               <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 sm:p-6">
                      <h3 className="font-bold text-lg text-gray-800 mb-8">
                        Order Tracking
                      </h3>

                      {(() => {
                        const steps = [
                          "Order Placed",
                          "Packing",
                          "Shipping",
                          "Out for Delivery",
                          "Delivered",
                        ];

                        const status = selectedOrder.status
                          ?.toLowerCase()
                          .trim();

                        const isCancelled =
                          status === "cancelled" || status === "canceled";

                        const getStep = () => {
                          switch (status) {
                            case "processing":
                              return 0;
                            case "packing":
                              return 1;
                            case "shipping":
                              return 2;
                            case "out for delivery":
                              return 3;
                            case "delivered":
                              return 4;
                            default:
                              return 0;
                          }
                        };

                        const currentStep = getStep();

                        return (
                          <>
                            {/* Cancel banner */}
                            {isCancelled && (
                              <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold">
                                This order has been cancelled
                              </div>
                            )}

                            <div className="relative flex justify-between items-center">
                              {/* background line */}
                              <div className="absolute top-4 left-0 w-full h-[3px] bg-gray-200 rounded-full"></div>

                              {/* progress line */}
                              {!isCancelled && (
                                <div
                                  className="absolute top-4 left-0 h-[3px] bg-secondary rounded-full transition-all duration-500"
                                  style={{
                                    width: `${(currentStep / (steps.length - 1)) * 100}%`,
                                  }}
                                />
                              )}

                              {steps.map((step, index) => {
                                const isCompleted =
                                  !isCancelled && index <= currentStep;

                                return (
                                  <div
                                    key={index}
                                    className="relative flex flex-col items-center text-center w-full"
                                  >
                                    <div
                                      className={`z-10 w-10 h-10 flex items-center justify-center rounded-full border-2 font-semibold text-sm
                  ${
                    isCancelled
                      ? "bg-white border-gray-300 text-gray-300"
                      : isCompleted
                        ? "bg-secondary border-secondary text-white"
                        : "bg-white border-gray-300 text-gray-400"
                  }`}
                                    >
                                      {isCompleted ? "✓" : index + 1}
                                    </div>

                                    <p
                                      className={`text-xs mt-3 font-medium ${
                                        isCancelled
                                          ? "text-gray-300"
                                          : isCompleted
                                            ? "text-secondary"
                                            : "text-gray-400"
                                      }`}
                                    >
                                      {step}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>

              {loadingOrder ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin h-12 w-12 border-b-2 border-primary rounded-full"></div>
                </div>
              ) : (
                <>
                  {/* ORDER INFO */}

                  {/* <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-gray-50 border border-gray-100 rounded-2xl p-6">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold">
                        Order ID
                      </p>
                      <p className="font-medium">
                        {selectedOrder.order_id || selectedOrder.id}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold">
                        User ID
                      </p>
                      <p className="font-medium">{selectedOrder.user_id}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold">
                        Order Date
                      </p>
                      <p className="font-medium">
                        {new Date(
                          selectedOrder.created_at,
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold">
                        Payment Method
                      </p>
                      <p className="font-medium capitalize">
                        {selectedOrder.payment_method}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold">
                        Payment Status
                      </p>
                      <p className="font-medium capitalize">
                        {selectedOrder.payment_status}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold">
                        Order Status
                      </p>
                      <StatusBadge status={selectedOrder.status} />
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold">
                        Total Amount
                      </p>
                      <p className="font-bold text-primary-dark text-lg">
                        ₹{selectedOrder.total_amount}
                      </p>
                    </div>
                  </div> */}

                  {/* SHIPPING ADDRESS */}

                  <div>
                    <h3 className="text-lg font-bold text-primary-dark mb-4">
                      Shipping Address
                    </h3>

                    <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                      {address ? (
                        <div className="text-sm text-gray-700 space-y-1">
                          <p className="font-semibold">
                            {address.customer_name}
                          </p>

                          <p>{address.street_address}</p>

                          <p>
                            {address.city}, {address.district}
                          </p>

                          <p>
                            {address.state} - {address.zip_code}
                          </p>

                          <p>{address.country}</p>

                          <p>Phone: {address.customer_phone}</p>

                          <p>Email: {address.customer_email}</p>
                        </div>
                      ) : (
                        <p className="text-gray-500">Address not available</p>
                      )}
                    </div>
                  </div>

                  {/* PRODUCTS */}

                  <div>
                    <h3 className="text-lg font-bold text-primary-dark mb-4">
                      Products
                    </h3>

                    <div className="space-y-5">
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((item, index) => {
                          const subtotal = item.price * item.quantity;

                          return (
                            <div
                              key={index}
                              className="flex gap-4 border border-gray-200 rounded-xl p-4 hover:border-primary/30 transition"
                            >
                              <div className="flex w-6 shrink-0 items-center justify-center text-sm font-bold text-gray-400">
                                {index + 1}
                              </div>
                              <img
                                src={item.image}
                                alt={item.product_name}
                                className="w-20 h-24 object-cover rounded-lg"
                                onError={(e) => {
                                  e.target.src = "/placeholder.png";
                                }}
                              />

                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <h4 className="font-semibold text-lg text-primary-dark">
                                    {item.product_name}
                                  </h4>

                                  <p className="font-bold text-primary text-lg">
                                    ₹{item.price}
                                  </p>
                                </div>

                                <div className="text-sm text-gray-600 mt-3 space-y-1">
                                  {(item.color || item.variant_color) && (
                                    <p>
                                      <span className="font-medium">
                                        Color:
                                      </span>{" "}
                                      {item.color || item.variant_color}
                                    </p>
                                  )}

                                  {(item.size || item.variant_size) && (
                                    <p>
                                      <span className="font-medium">Size:</span>{" "}
                                      {item.size || item.variant_size}
                                    </p>
                                  )}

                                  <p>
                                    <span className="font-medium">
                                      Quantity:
                                    </span>{" "}
                                    {item.quantity}
                                  </p>

                                  <p>
                                    <span className="font-medium">
                                      Subtotal:
                                    </span>{" "}
                                    ₹{subtotal}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-gray-500 text-center py-6">
                          No items in this order
                        </p>
                      )}
                    </div>
                  </div>

                  {/* FOOTER */}

                  <div className="mt-6 border-t border-gray-100 pt-6 flex justify-between items-center">
                    <p className="text-xl font-bold text-primary-dark">
                      Total: ₹{selectedOrder.total_amount}
                    </p>

                    <button
                      onClick={() => setShowPopup(false)}
                      className="bg-primary text-white px-8 py-2.5 rounded-xl font-semibold shadow-md hover:bg-primary-light transition"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>
        {`
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        `}
      </style>
    </div>
  );
};

export default OrdersMain;
