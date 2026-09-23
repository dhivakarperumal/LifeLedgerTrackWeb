import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./PrivateRouter/AuthContext.jsx";
import { StoreProvider } from "./PrivateRouter/StoreContext.jsx";
import PrivateRoute from "./PrivateRouter/PrivateRouter.jsx";
import { AdminProvider } from "./PrivateRouter/AdminContext.jsx";
import { Toaster } from "react-hot-toast";
import Loader from "./Components/CommenComponents/Loader.jsx";

// Lazy Load Main Components
const Home = React.lazy(() => import("./Components/Home/Home.jsx"));
const Login = React.lazy(() => import("./Components/Auth/Login.jsx"));
const Register = React.lazy(() => import("./Components/Auth/Register.jsx"));

// Lazy Load Admin Components
const AdminPanel = React.lazy(() => import("./Admin/AdminPanel.jsx"));
const Dashboard = React.lazy(() => import("./Admin/Dashboard.jsx"));
const AllProducts = React.lazy(() => import("./Components/Pages/AllProducts.jsx"));
const AllExpensive = React.lazy(() => import("./Admin/Pages/AllExpensive.jsx"));
const Category = React.lazy(() => import("./Admin/Pages/Category.jsx"));
const DiaryManagement = React.lazy(() => import("./Admin/Pages/DiaryManagement.jsx"));
const DiaryDetails = React.lazy(() => import("./Admin/Pages/DiaryDetails.jsx"));
const MemoriesManagement = React.lazy(() => import("./Admin/Pages/MemoriesManagement.jsx"));
const MemoryDetails = React.lazy(() => import("./Admin/Pages/MemoryDetails.jsx"));

const Users = React.lazy(() => import("./Admin/Pages/Users.jsx"));

const ErrorPage = React.lazy(() => import("./Admin/Pages/ErrorPage.jsx"));
const Transfer = React.lazy(() => import("./Admin/Pages/Transfer.jsx"));
const Income = React.lazy(() => import("./Admin/Pages/Billing.jsx"));
const Reports = React.lazy(() => import("./Admin/Pages/Reports.jsx"));
const CalendarReminder = React.lazy(() => import("./Admin/Pages/CalendarReminder.jsx"));
const Profile = React.lazy(() => import("./Admin/Pages/Profile.jsx"));

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
    errorElement: <ErrorPage />,
  },
  { path: "/login", element: <Login /> },
  {
    path: "/home",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [{ path: "", element: <Home /> }],
  },
  { path: "/register", element: <Register /> },
  {
    path: "/admin",
    element: (
      <PrivateRoute allowedRoles={["admin"]}>
        <AdminProvider>
          <AdminPanel />
        </AdminProvider>
      </PrivateRoute>
    ),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "products/all", element: <AllProducts /> },
      { path: "products/category", element: <Category /> },
      { path: "expensive/all", element: <AllExpensive /> },
      { path: "expensive/category", element: <Category /> },
      { path: "users/all", element: <Users initialTab="All" /> },
      { path: "users/new", element: <Users initialTab="New" /> },
      { path: "users/diary", element: <DiaryManagement /> },
      { path: "users/diary/:id", element: <DiaryDetails /> },
      { path: "users/memories", element: <MemoriesManagement /> },
      { path: "users/memories/:id", element: <MemoryDetails /> },
      { path: "more/income", element: <Income /> },
      { path: "more/transfer", element: <Transfer /> },
      { path: "more/add", element: <Transfer /> },
      { path: "reports", element: <Reports /> },
      { path: "profile", element: <Profile /> },
      { path: "planner/calendar", element: <CalendarReminder /> },
      { path: "planner/reminders", element: <CalendarReminder /> },
    ],
  },
]);

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const app = (
  <AuthProvider>
    <StoreProvider>
      <Toaster position="top-left" reverseOrder={false} />
      <React.Suspense fallback={<Loader />}>
        <RouterProvider router={router} />
      </React.Suspense>
    </StoreProvider>
  </AuthProvider>
);

createRoot(document.getElementById("root")).render(
  googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider>
  ) : (
    app
  )
);
