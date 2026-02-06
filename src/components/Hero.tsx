"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import Image from "next/image";
import { dataService, HeroSlide } from "@/services/dataService";

import { useLogo } from "@/context/LogoContext";

export default function Hero() {
    const [opacity, setOpacity] = useState(1);
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const { isLogoInNav, setLogoInNav } = useLogo();

    useEffect(() => {
        // Load Slides
        const loadSlides = async () => {
            const loadedSlides = await dataService.getHeroSlides();
            setSlides(loadedSlides);
        };
        loadSlides();

        const handleScroll = () => {
            const scrollY = window.scrollY;
            // Opacity logic for background
            const newOpacity = Math.max(0, 1 - scrollY / 300);
            setOpacity(newOpacity);

            // Logo Transition Logic
            if (scrollY > 50) {
                setLogoInNav(true);
            } else if (scrollY < 20) {
                setLogoInNav(false);
            }
        };

        // Initial check and event listener
        handleScroll();
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [setLogoInNav]);

    // Timer for Logo Transition
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (!isLogoInNav) {
            timer = setTimeout(() => {
                setLogoInNav(true);
            }, 5000);
        }
        return () => clearTimeout(timer);
    }, [isLogoInNav, setLogoInNav]);

    // Timer Logic
    useEffect(() => {
        if (slides.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, (slides[currentSlide]?.timer || 5) * 1000);

        return () => clearInterval(interval);
    }, [slides, currentSlide]);

    const slide = slides.length > 0 ? slides[currentSlide] : {
        id: "loading",
        imageUrl: "/hero_background.png",
        objectFit: "cover",
        subtitle: "The Finance Club of IIM Shillong",
        tagline: "The Investment and Finance Club of IIM Shillong",
        description: "Empowering future leaders with financial acumen, market insights, and real-world investment strategies."
    };

    return (
        <section id="hero" className="relative w-full min-h-[70vh] md:min-h-[85vh] lg:min-h-0 lg:aspect-video bg-navy-900 transition-colors duration-500 pb-20 md:pb-24">
            {/* Background Image / Gradient */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={slide.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="absolute inset-0 z-0"
                >
                    <Image
                        src={slide.imageUrl}
                        alt="Background"
                        fill
                        className="object-contain sm:object-cover object-center"
                        style={{ opacity: 0.5 }}
                        priority
                        sizes="100vw"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-navy-900/40 via-navy-900/20 to-navy-900/80 pointer-events-none" />
                </motion.div>
            </AnimatePresence>

            {/* Main Content Container */}
            <div
                className="relative z-10 w-full h-full min-h-[60vh] md:min-h-0 md:aspect-video flex flex-col"
                style={{ opacity }}
            >
                {/* Center Content Area - Logo and Title */}
                <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 md:pt-16">
                    {/* Hero Logo with Scroll Animation - Animates FIRST */}
                    <motion.div
                        initial={{ height: "auto", marginBottom: "1rem" }}
                        animate={{
                            height: isLogoInNav ? 0 : "auto",
                            marginBottom: isLogoInNav ? 0 : "1rem",
                            opacity: isLogoInNav ? 0 : 1
                        }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        className="flex items-center justify-center overflow-hidden"
                    >
                        {!isLogoInNav && (
                            <motion.div
                                layoutId="niveshak-logo"
                                className="relative w-20 h-20 md:w-40 md:h-40"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                            >
                                <Image src="/logo.png" alt="Niveshak Logo" fill className="object-contain drop-shadow-2xl" priority />
                            </motion.div>
                        )}
                    </motion.div>

                    {/* NIVESHAK Title - Animates SECOND with slight delay */}
                    <motion.div
                        initial={{ height: "auto", marginBottom: "1.5rem" }}
                        animate={{
                            height: isLogoInNav ? 0 : "auto",
                            marginBottom: isLogoInNav ? 0 : "1.5rem",
                            opacity: isLogoInNav ? 0 : 1
                        }}
                        transition={{ duration: 0.4, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
                        className="flex items-center justify-center overflow-hidden"
                    >
                        {!isLogoInNav && (
                            <motion.h1
                                layoutId="niveshak-title"
                                className="text-3xl sm:text-4xl md:text-7xl font-extrabold tracking-tighter text-white drop-shadow-2xl uppercase"
                            >
                                NIVESHAK
                            </motion.h1>
                        )}
                    </motion.div>

                    {/* Sub-header Content - Always at bottom on mobile, conditional on desktop */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                        }}
                        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                        className={`flex flex-col items-center text-center max-w-4xl mx-auto transition-all duration-700 ease-in-out absolute bottom-4 left-0 right-0 px-4 md:bottom-8 ${!isLogoInNav ? 'md:relative md:bottom-auto' : ''
                            }`}
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={slide.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="flex flex-col items-center"
                            >
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-xs md:text-sm font-medium mb-4 shadow-sm">
                                    <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent" />
                                    {slide.subtitle || "Mastering the Market"}
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        <h2 className="text-base md:text-2xl font-light text-blue-50 uppercase tracking-widest px-4">
                            {slide.tagline || "The Investment and Finance Club of IIM Shillong"}
                        </h2>

                        <p className="text-sm md:text-base text-gray-300 mt-3 md:mt-4 max-w-2xl mx-auto leading-relaxed px-4">
                            {slide.description || "Empowering future leaders with financial acumen, market insights, and real-world investment strategies."}
                        </p>
                    </motion.div>
                </div>

                {/* Spacer for when content is relative (not logo in nav) */}
                {!isLogoInNav && <div className="h-8 md:h-12" />}
            </div>
        </section>
    );
}
