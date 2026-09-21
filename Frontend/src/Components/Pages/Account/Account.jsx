import React, { useState } from "react";
import { FiUser, FiPackage, FiMapPin, FiLock} from "react-icons/fi";
import SetPassword from "./SetPassword";
import PersonalInfo from "./PersonalInfo";
import Orders from "./Orders";
import Address from "./Address";
import PageHeader from "../../CommenComponents/PageHeader";
import PageContainer from "../../CommenComponents/PageContainer";
import { useSearchParams } from "react-router-dom";

export default function Account() {

  const [searchParams] = useSearchParams();
const tab = searchParams.get("tab");

const [activeTab, setActiveTab] = useState(tab || "personal");

  const menuItems = [
    {
      key: "personal",
      label: "Personal Info",
      icon: <FiUser size={18} />,
    },
    {
      key: "orders",
      label: "My Orders",
      icon: <FiPackage size={18} />,
    },
    {
      key: "address",
      label: "Manage Address",
      icon: <FiMapPin size={18} />,
    },
    {
  key: "password",
  label: "Set Password",
  icon: <FiLock size={18} />,
},
  ];

  return (
    <>
      <PageHeader title="My Account" />
      <div className="min-h-screen bg-[#F8F6F2] py-16">
        <PageContainer>
          <div className=" grid lg:grid-cols-4 gap-10">

            {/* SIDEBAR */}

            <div className="bg-white rounded-2xl shadow-md p-6 space-y-2 h-fit">

              <h2 className="text-lg font-bold text-gray-800 mb-4">
                My Account
              </h2>

              {menuItems.map((item) => (

                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium transition cursor-pointer
              
              ${activeTab === item.key
                      ? "bg-primary text-white shadow-md"
                      : "hover:bg-gray-100 text-gray-700"
                    }`}
                >
                  {item.icon}
                  {item.label}
                </button>

              ))}

            </div>

            {/* MAIN CONTENT */}

            <div className="lg:col-span-3">

              {activeTab === "personal" && <PersonalInfo />}

              {activeTab === "orders" && <Orders />}

              {activeTab === "address" && <Address />}

              {activeTab === "password" && <SetPassword />}

            </div>

          </div>
        </PageContainer>
      </div>

    </>
  );
}