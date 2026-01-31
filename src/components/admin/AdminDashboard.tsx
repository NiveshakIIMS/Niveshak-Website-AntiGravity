"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminSidebar from "./AdminSidebar";
import HeroManager from "./HeroManager";
import AboutManager from "./AboutManager";
import TeamManager from "./TeamManager";
import MagazinesManager from "./MagazinesManager";
import EventsManager from "./EventsManager";
import NIFManager from "./NIFManager";
import SocialManager from "./SocialManager";
import { supabase } from "@/lib/supabaseClient";

interface AdminDashboardProps {
    setIsAuthenticated: (val: boolean) => void;
}

export default function AdminDashboard({ setIsAuthenticated }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState("hero");

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
    };

    const renderContent = () => {
        switch (activeTab) {
            case "hero": return <HeroManager />;
            case "about": return <AboutManager />;
            case "team": return <TeamManager />;
            case "magazines": return <MagazinesManager />;
            case "events": return <EventsManager />;
            case "nif": return <NIFManager />;
            case "social": return <SocialManager />;
            default: return <HeroManager />;
        }
    };

    return (
        <div className="flex h-screen bg-muted/20 overflow-hidden pt-16">
            <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

            <main className="flex-1 overflow-y-auto relative p-8">
                <div className="absolute inset-0 bg-grid-slate-200/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-50/[0.05] [mask-image:linear-gradient(to_bottom,transparent,black)] pointer-events-none" />

                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.98 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="max-w-6xl mx-auto"
                >
                    <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden ring-1 ring-gray-900/5">
                        {renderContent()}
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
