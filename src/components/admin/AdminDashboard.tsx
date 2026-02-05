"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import HeroManager from "./HeroManager";
import AboutManager from "./AboutManager";
import TeamManager from "./TeamManager";
import MagazinesManager from "./MagazinesManager";
import EventsManager from "./EventsManager";
import NIFManager from "./NIFManager";
import SocialManager from "./SocialManager";
import NoticesManager from "./NoticesManager";
import ResourcesManager from "./ResourcesManager";
import MigrationManager from "./MigrationManager";
import MFAEnrollment from "./MFAEnrollment";
import { supabase } from "@/lib/supabaseClient";

interface AdminDashboardProps {
    setIsAuthenticated: (val: boolean) => void;
}

export default function AdminDashboard({ setIsAuthenticated }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState("hero");
    const [showMFA, setShowMFA] = useState(false);
    const [isMFAEnabled, setIsMFAEnabled] = useState(false);

    useEffect(() => {
        const checkMFA = async () => {
            const { data } = await supabase.auth.mfa.listFactors();
            if (data && data.totp.length > 0) {
                setIsMFAEnabled(true);
            }
        };
        checkMFA();
    }, [showMFA]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
    };

    const handleMFASuccess = () => {
        setShowMFA(false);
        setIsMFAEnabled(true);
        alert("Two-Factor Authentication Enabled Successfully!");
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
            case "notices": return <NoticesManager />;
            case "resources": return <ResourcesManager />;
            case "migration": return <MigrationManager />;
            default: return <HeroManager />;
        }
    };

    return (
        <div className="flex h-screen bg-muted/20 overflow-hidden pt-16">
            <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

            <main className="flex-1 overflow-y-auto relative p-8">
                <div className="absolute inset-0 bg-grid-slate-200/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-50/[0.05] [mask-image:linear-gradient(to_bottom,transparent,black)] pointer-events-none" />

                <div className="flex justify-end mb-6">
                    <button
                        onClick={() => setShowMFA(true)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-sm border ${isMFAEnabled ? "bg-green-100/50 border-green-200 text-green-700 hover:bg-green-100" : "bg-white border-border text-foreground hover:bg-muted"}`}
                    >
                        <ShieldCheck className={`w-4 h-4 ${isMFAEnabled ? "text-green-600" : "text-muted-foreground"}`} />
                        {isMFAEnabled ? "2FA Active" : "Setup 2FA"}
                    </button>
                </div>

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

            {/* MFA Modal */}
            {showMFA && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-background w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-border animate-in fade-in zoom-in duration-200 relative">
                        {isMFAEnabled ? (
                            <div className="p-8 text-center space-y-6">
                                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                    <ShieldCheck className="w-8 h-8 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-2">2FA is Enabled</h3>
                                    <p className="text-muted-foreground">Your account is secured. You can generate limited backup codes or disable it currently only via Supabase dashboard if you get locked out.</p>
                                </div>
                                <button onClick={() => setShowMFA(false)} className="px-6 py-2 bg-muted hover:bg-muted/80 rounded-lg font-medium">Close</button>
                            </div>
                        ) : (
                            <MFAEnrollment
                                onEnrollmentComplete={handleMFASuccess}
                                onCancel={() => setShowMFA(false)}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
