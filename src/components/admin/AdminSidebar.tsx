"use client";

import { LayoutDashboard, Users, BookOpen, Calendar, TrendingUp, LogOut, FileText, ArrowLeft, Image as ImageIcon, Award, X, Calculator, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";

interface AdminSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onLogout: () => void;
    isOpen: boolean;
    onClose: () => void;
}

export default function AdminSidebar({ activeTab, setActiveTab, onLogout, isOpen, onClose }: AdminSidebarProps) {
    const { theme, setTheme } = useTheme();

    const menuItems = [
        { id: "hero", label: "Hero Slider", icon: <ImageIcon className="w-5 h-5" /> },
        { id: "about", label: "About Us", icon: <FileText className="w-5 h-5" /> },
        { id: "team", label: "Team Members", icon: <Users className="w-5 h-5" /> },
        { id: "halloffame", label: "Hall of Fame", icon: <Award className="w-5 h-5" /> },
        { id: "magazines", label: "Magazines", icon: <BookOpen className="w-5 h-5" /> },
        { id: "events", label: "Events", icon: <Calendar className="w-5 h-5" /> },
        { id: "notices", label: "Notice Board", icon: <FileText className="w-5 h-5" /> },
        { id: "nif", label: "NIF Dashboard", icon: <TrendingUp className="w-5 h-5" /> },
        { id: "nif_calculator", label: "NIF Calculator", icon: <Calculator className="w-5 h-5" /> },
        { id: "redemption", label: "Redemption Info", icon: <BookOpen className="w-5 h-5" /> },
        { id: "resources", label: "Resources", icon: <FileText className="w-5 h-5" /> },
        { id: "social", label: "Social Links", icon: <Users className="w-5 h-5" /> },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 md:static md:translate-x-0 z-50 w-64 bg-background border-r border-border h-screen md:h-[calc(100vh-4rem)] flex flex-col shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Header */}
                <div className="p-6 border-b border-border bg-muted/5 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                            <LayoutDashboard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            Admin Panel
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1 pl-8">V1.0.0 (Admin)</p>
                    </div>
                    <button onClick={onClose} className="md:hidden p-2 text-muted-foreground hover:bg-muted rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sidebar Navigation */}
                <div className="p-4 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                    <div className="mb-6">
                        <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Modules</h3>
                        <nav className="space-y-1 relative">
                            {menuItems.map((item) => {
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setActiveTab(item.id);
                                            onClose(); // Auto-close on mobile
                                        }}
                                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group relative ${
                                            isActive
                                                ? "text-white"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                        }`}
                                    >
                                        {/* Animated selector pill background */}
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTabSidebar"
                                                className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl -z-10 shadow-lg shadow-blue-500/20"
                                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                        <span className={`relative z-10 mr-3 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-white animate-pulse" : "text-muted-foreground group-hover:text-blue-500"}`}>{item.icon}</span>
                                        <span className="relative z-10">{item.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Bottom Actions & Theme Switcher */}
                <div className="p-4 border-t border-border bg-muted/5 space-y-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    {/* Theme Toggler Pill */}
                    <div className="flex bg-muted/60 p-1 rounded-xl border border-border items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-3">Theme</span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setTheme("light")}
                                className={`p-1.5 rounded-lg transition-all ${
                                    theme === "light"
                                        ? "bg-background text-yellow-500 shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                                title="Light Mode"
                            >
                                <Sun className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setTheme("dark")}
                                className={`p-1.5 rounded-lg transition-all ${
                                    theme === "dark"
                                        ? "bg-background text-blue-400 shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                                title="Dark Mode"
                            >
                                <Moon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <Link
                        href="/"
                        className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-xl transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 mr-3" />
                        Back to Website
                    </Link>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300 rounded-xl transition-colors"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Logout
                    </button>
                </div>
            </aside>
        </>
    );
}
