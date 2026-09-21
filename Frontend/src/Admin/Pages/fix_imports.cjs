const fs = require('fs');
const path = 'd:/Q Techx Projects/Webs/Saree_Web_Sites/frontend/src/Admin/Pages/Orders.jsx';
let code = fs.readFileSync(path, 'utf-8');
const fixedImports = `import React, { useState, useEffect, useContext } from "react";
import { useAdmin } from "../../PrivateRouter/AdminContext";
import { Link } from "react-router-dom";
import {
    FiSearch,
    FiFilter,
    FiEye,
    FiTruck,
    FiCheckCircle,
    FiXCircle,
    FiClock,
    FiShoppingBag,
    FiDownload,
    FiMoreVertical,
    FiPlus,
    FiPackage,
    FiPrinter,
    FiCalendar
} from "react-icons/fi";
import api from "../../api";
import { toast, Toaster } from "react-hot-toast";

const Orders = ({ statusFilter = "All" }) => {`;

code = code.replace(/^.*const \[searchTerm/s, fixedImports + '\n    const [searchTerm');
fs.writeFileSync(path, code, 'utf-8');
console.log('Fixed imports');
