"use client";

import { LayoutDashboard, Users, BookOpen, Calendar, TrendingUp, Settings, LogOut, FileText, ArrowLeft, Image as ImageIcon, Database, Award } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onLogout: () => void;
}

export default function AdminSidebar({ activeTab, setActiveTab, onLogout }: AdminSidebarProps) {
    const menuItems = [
        { id: "hero", label: "Hero Slider", icon: <ImageIcon className="w-5 h-5" /> },
        { id: "about", label: "About Us", icon: <FileText className="w-5 h-5" /> },
        { id: "team", label: "Team Members", icon: <Users className="w-5 h-5" /> },
        { id: "halloffame", label: "Hall of Fame", icon: <Award className="w-5 h-5" /> },
        { id: "magazines", label: "Magazines", icon: <BookOpen className="w-5 h-5" /> },
        { id: "events", label: "Events", icon: <Calendar className="w-5 h-5" /> },
        { id: "notices", label: "Notice Board", icon: <FileText className="w-5 h-5" /> },
        { id: "nif", label: "NIF Dashboard", icon: <TrendingUp className="w-5 h-5" /> },
        { id: "migration", label: "Database", icon: <Database className="w-5 h-5" /> },
        { id: "resources", label: "Resources", icon: <FileText className="w-5 h-5" /> },
        { id: "social", label: "Social Links", icon: <Users className="w-5 h-5" /> },
    ];

    return (
        <aside className="w-64 bg-background border-r border-border h-[calc(100vh-4rem)] flex flex-col shadow-xl z-20 overflow-hidden shrink-0 transition-colors duration-300">
            {/* Header */}
            <div className="p-6 border-b border-border bg-muted/10">
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                    <LayoutDashboard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    Admin Panel
                </h2>
                <p className="text-xs text-muted-foreground mt-1 pl-8">V1.0.0 (Admin)</p>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-2">
                <div className="mb-6">
                    <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Modules</h3>
                    <nav className="space-y-1">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group relative overflow-hidden ${activeTab === item.id
                                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                            >
                                <span className={`relative z-10 mr-3 ${activeTab === item.id ? "text-white" : "text-muted-foreground group-hover:text-blue-500"}`}>{item.icon}</span>
                                <span className="relative z-10">{item.label}</span>
                                {activeTab === item.id && (
                                    <div className="absolute inset-0 bg-blue-500 opacity-0 blur-xl rounded-xl"></div>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/10 space-y-2">
                <Link
                    href="/"
                    className="w-full flex items-center px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-3" />
                    Back to Website
                </Link>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300 rounded-xl transition-colors"
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    Logout
                </button>
            </div>
        </aside>
    );
}
