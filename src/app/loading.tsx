"use client";

import React from "react";

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0d1b2a] transition-colors duration-300">
            <div className="relative w-28 h-28 flex items-center justify-center animate-pulse">
                <img
                    src="/pwa-icon.png?v=2"
                    alt="Loading..."
                    className="w-full h-full object-contain"
                />
            </div>
        </div>
    );
}
