"use client";

import React from "react";

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-background transition-colors duration-300">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading...</p>
            </div>
        </div>
    );
}
