import React from 'react';
import { useRouteError, Link } from 'react-router-dom';
import { FiAlertCircle, FiHome, FiArrowLeft } from 'react-icons/fi';

const ErrorPage = () => {
    const error = useRouteError();
    console.error(error);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100 p-12 text-center border border-gray-100 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner border border-red-100 animate-bounce">
                    <FiAlertCircle />
                </div>

                <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-4">
                    Oops!
                </h1>

                <p className="text-gray-500 font-bold mb-8 uppercase tracking-widest text-xs italic">
                    {error.statusText || error.message || "An unexpected error occurred"}
                </p>

                <div className="space-y-4">
                    <Link
                        to="/admin"
                        className="flex items-center justify-center gap-3 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-200 active:scale-95"
                    >
                        <FiHome /> Back to Dashboard
                    </Link>

                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center justify-center gap-3 w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-gray-100"
                    >
                        <FiArrowLeft /> Go Back
                    </button>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-50">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
                        Error ID: {error.status || "500"} • Palace Artisan Admin
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ErrorPage;
