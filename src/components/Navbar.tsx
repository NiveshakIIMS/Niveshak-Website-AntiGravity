"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon, ChevronDown, TrendingUp } from "lucide-react";
import { useLogo } from "@/context/LogoContext";
import { useTheme } from "@/components/ThemeProvider";

const navItems = [
    { name: "Home", href: "/#hero" },
    { name: "About Us", href: "/about" },
    { name: "Team", href: "/team" },
    { name: "Magazines", href: "/magazines" },
    { name: "Events", href: "/events" },
    { name: "NAV", href: "/dashboard" },
];
import { usePathname } from "next/navigation";

// ... (inside component)
export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const { isLogoInNav } = useLogo();
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === "/#hero") return pathname === "/";
        return pathname.startsWith(href);
    }

    return (
        <nav className="fixed w-full z-50 transition-all duration-300 bg-navy-900/70 border-b border-navy-800 shadow-lg backdrop-blur-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">

                    {/* Left Side: Logo (Always Visible) */}
                    <div className="flex-shrink-0 w-64 h-20 overflow-visible relative flex items-center">
                        <Link href="/" className="flex items-center gap-3 group">
                            {isLogoInNav && (
                                <>
                                    <motion.div
                                        layoutId="niveshak-logo"
                                        className="relative w-10 h-10 transform transition-transform group-hover:scale-110"
                                        transition={{ duration: 0.5 }}
                                    >
                                        <img className="w-full h-full object-contain" src="/logo.png" alt="Niveshak Logo" />
                                    </motion.div>
                                    <motion.span
                                        layoutId="niveshak-title"
                                        className="font-bold text-xl tracking-tight text-white block whitespace-nowrap"
                                        transition={{ duration: 0.5 }}
                                    >
                                        NIVESHAK
                                    </motion.span>
                                </>
                            )}
                        </Link>
                    </div>

                    {/* Center: Nav Items (Desktop) */}
                    <div className="hidden md:flex flex-1 justify-center items-center">
                        <div className="flex bg-navy-800/50 p-1.5 rounded-full border border-navy-700/50 backdrop-blur-sm">
                            {navItems.map((item) => {
                                const active = isActive(item.href);
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-sm ${active
                                            ? "bg-white text-navy-900 shadow-md scale-105"
                                            : "text-gray-300 hover:text-white hover:bg-navy-800"
                                            }`}
                                    >
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Actions (Desktop) */}
                    <div className="hidden md:flex items-center gap-3 w-auto justify-end">

                        <Link href="/admin" className="px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-bold uppercase tracking-wide hover:opacity-90 transition-all transform hover:-translate-y-0.5 shadow-md">
                            Admin Login
                        </Link>

                        {/* Theme Toggle */}
                        <button
                            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                            className="p-2.5 rounded-full bg-navy-800 text-gray-300 border border-navy-700 hover:bg-navy-700 hover:text-white transition-colors"
                        >
                            {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="-mr-2 flex md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            type="button"
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-navy-800 focus:outline-none"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-navy-900 border-b border-navy-800 overflow-hidden"
                    >
                        <div className="px-4 pt-4 pb-6 space-y-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className="block px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wide text-gray-300 hover:text-white hover:bg-navy-800"
                                >
                                    {item.name}
                                </Link>
                            ))}
                            <div className="h-px bg-navy-800 my-2" />
                            <Link href="/admin" onClick={() => setIsOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wide text-gray-300 hover:text-white hover:bg-navy-800">
                                Admin Login
                            </Link>
                            <button
                                onClick={() => {
                                    setTheme(theme === 'light' ? 'dark' : 'light');
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wide text-gray-300 hover:text-white hover:bg-navy-800 flex items-center justify-between"
                            >
                                <span>Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode</span>
                                {theme === 'light' ? <Moon className="w-4 h-4 ml-2" /> : <Sun className="w-4 h-4 ml-2" />}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
