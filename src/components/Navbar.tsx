"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon, ChevronDown, TrendingUp, Download } from "lucide-react";
import { useLogo } from "@/context/LogoContext";
import { useTheme } from "@/components/ThemeProvider";

const navItems = [
    { name: "Home", href: "/#hero" },
    { name: "About Us", href: "/about" },
    { name: "Team", href: "/team" },
    { name: "Magazines", href: "/magazines" },
    { name: "Events", href: "/events" },
    { name: "Notice Board", href: "/notices" },
    { name: "NIF", href: "/dashboard" },
    { name: "Resources", href: "/resources" },
];
import { usePathname } from "next/navigation";

// ... (inside component)
export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const { isLogoInNav, setLogoInNav } = useLogo();
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === "/#hero") return pathname === "/";
        return pathname.startsWith(href);
    }

    // Force Logo visibility on non-home pages
    useEffect(() => {
        if (pathname !== "/") {
            setLogoInNav(true);
        }
    }, [pathname, setLogoInNav]);

    // Register Service Worker for PWA
    useEffect(() => {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            window.addEventListener("load", () => {
                navigator.serviceWorker.register("/sw.js").then(
                    (registration) => {
                        console.log("ServiceWorker registered successfully with scope: ", registration.scope);
                    },
                    (err) => {
                        console.log("ServiceWorker registration failed: ", err);
                    }
                );
            });
        }
    }, []);

    if (pathname.startsWith("/admin")) return null;

    return (
        <nav className="fixed w-full z-50 transition-all duration-300 bg-navy-900/70 border-b border-navy-800 shadow-lg backdrop-blur-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20 relative">

                    {/* Left & Center Logos Wrapper (Grouped on mobile, split on desktop) */}
                    <div className="flex items-center gap-3 md:gap-0 w-auto h-20">
                        {/* Section 1: IIM Shillong Logo (Left) */}
                        <a href="https://www.iimshillong.ac.in/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full p-0.5 overflow-hidden shadow-sm hover:scale-105 transition-transform shrink-0">
                            <img src="/iim-shillong-logo.png" alt="IIM Shillong" className="w-full h-full object-contain" />
                        </a>

                        {/* Section 2: Niveshak Logo (Centered on desktop, flows on mobile) */}
                        <div className="flex-shrink-0 w-auto h-20 overflow-visible relative flex items-center justify-center md:absolute md:left-1/2 md:transform md:-translate-x-1/2 md:top-0">
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
                    </div>

                    {/* Section 3: Right Side (Desktop & Mobile) */}
                    <div className="flex items-center gap-2.5 md:gap-4">
                        {/* Desktop Navigation & Actions */}
                        <div className="hidden md:flex items-center gap-3 lg:gap-4">
                            {/* Nav Items Container */}
                            <div className="flex bg-navy-800/50 p-1 rounded-full border border-navy-700/50 backdrop-blur-sm">
                                {navItems.map((item) => {
                                    const active = isActive(item.href);
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-[10px] lg:text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-sm whitespace-nowrap ${active
                                                ? "bg-white text-navy-900 shadow-md scale-105"
                                                : "text-gray-300 hover:text-white hover:bg-navy-800"
                                                }`}
                                        >
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Theme Toggle (Neumorphic Pill) */}
                            <button
                                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                                className="relative flex items-center w-[90px] lg:w-[104px] h-[34px] lg:h-[40px] rounded-full bg-navy-900/90 shadow-[inset_0_3px_6px_rgba(0,0,0,0.6),inset_0_-1px_2px_rgba(255,255,255,0.05)] p-1 shrink-0 outline-none border border-navy-800/50"
                                aria-label="Toggle Theme"
                                style={{ justifyContent: theme === 'light' ? 'flex-start' : 'flex-end' }}
                            >
                                {/* Text Background */}
                                <div className="absolute inset-0 flex items-center justify-between px-2.5 lg:px-3.5 pointer-events-none">
                                    <span className={`text-[10px] lg:text-xs font-bold uppercase tracking-wider transition-opacity duration-300 ${theme === 'dark' ? 'text-gray-300 opacity-100' : 'opacity-0'}`}>DARK</span>
                                    <span className={`text-[10px] lg:text-xs font-bold uppercase tracking-wider transition-opacity duration-300 ${theme === 'light' ? 'text-gray-300 opacity-100' : 'opacity-0'}`}>LIGHT</span>
                                </div>
                                
                                {/* Thumb */}
                                <motion.div
                                    layout
                                    className="relative z-10 flex items-center justify-center h-full aspect-square rounded-full bg-navy-800 shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-1px_1px_rgba(0,0,0,0.2)] text-gray-200 border border-navy-700"
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                >
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={theme}
                                            initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                            exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {theme === 'light' ? <Sun className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" /> : <Moon className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-blue-300" />}
                                        </motion.div>
                                    </AnimatePresence>
                                </motion.div>
                            </button>

                            {/* Admin Button */}
                            <Link href="/admin" className="px-4 lg:px-6 py-2 lg:py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-bold uppercase tracking-wide hover:opacity-90 transition-all transform hover:-translate-y-0.5 shadow-md whitespace-nowrap shrink-0">
                                Admin
                            </Link>
                        </div>

                        {/* Mobile Theme Toggle Icon (Just the icon, visible on mobile only) */}
                        <button
                            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                            className="flex md:hidden p-2 bg-navy-800/60 hover:bg-navy-800 text-gray-300 hover:text-white rounded-full transition-all border border-navy-700/50 active:scale-95 shrink-0"
                            aria-label="Toggle Theme"
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={theme}
                                    initial={{ scale: 0.6, opacity: 0, rotate: -45 }}
                                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                    exit={{ scale: 0.6, opacity: 0, rotate: 45 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {theme === 'light' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-blue-300" />}
                                </motion.div>
                            </AnimatePresence>
                        </button>

                        {/* Mobile Menu Button */}
                        <div className="flex items-center md:hidden">
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
            </div>

            {/* Mobile Menu Dropdown Card (Floating glassmorphism card with spring animation) */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -15 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="absolute top-[88px] right-4 left-4 md:hidden rounded-2xl border border-navy-700/50 bg-navy-900/90 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
                    >
                        <div className="px-4 pt-4 pb-6 space-y-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className="block px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wide text-gray-300 hover:text-white hover:bg-navy-800 transition-colors"
                                >
                                    {item.name}
                                </Link>
                            ))}
                            <Link
                                href="/notices"
                                onClick={() => setIsOpen(false)}
                                className={`block px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wide text-gray-300 hover:text-white hover:bg-navy-800 flex items-center justify-between transition-colors ${pathname === "/notices" ? "text-white bg-navy-800" : ""}`}
                            >
                                Notice Board
                                <span className="flex h-2 w-2 rounded-full bg-red-500"></span>
                            </Link>
                            <div className="h-px bg-navy-800/80 my-2" />
                            <Link href="/admin" onClick={() => setIsOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wide text-gray-300 hover:text-white hover:bg-navy-800 transition-colors">
                                Admin Login
                            </Link>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    if (window.showNiveshakInstallPrompt) {
                                        window.showNiveshakInstallPrompt();
                                    } else {
                                        alert("PWA installation is not supported on this browser/device. Try opening in Safari (iOS) or Chrome (Android).");
                                    }
                                }}
                                className="w-full text-left block px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wide text-gray-300 hover:text-white hover:bg-navy-800 transition-colors flex items-center justify-between"
                            >
                                <span>Install Web App</span>
                                <Download className="w-4 h-4 text-accent" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
