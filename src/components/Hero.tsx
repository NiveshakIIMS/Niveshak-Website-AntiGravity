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

    // if (slides.length === 0) return null; // REMOVED to prevent CLS

    const slide = slides.length > 0 ? slides[currentSlide] : {
        id: "loading",
        imageUrl: "/hero_background.png", // Fallback image or empty
        objectFit: "cover",
        subtitle: "The Finance Club of IIM Shillong"
    };

    return (
        <section id="hero" className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-start pt-24 md:pt-44 bg-navy-900 transition-colors duration-500">
            {/* Background Image / Gradient */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={slide.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 z-0"
                >
                    <Image
                        src={slide.imageUrl}
                        alt="Background"
                        fill
                        className={`object-${slide.objectFit} object-top opacity-30 dark:opacity-40`}
                        style={{ objectPosition: 'center 20%' }}
                        priority
                    />
                    {/* Gradient adapts to theme -> Reverted to always Dark Navy */}
                    <div className="absolute inset-0 bg-gradient-to-b from-navy-900/50 via-navy-900/20 to-navy-900 pointer-events-none" />
                </motion.div>
            </AnimatePresence>

            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center" style={{ opacity }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="flex flex-col items-center"
                >
                    {/* Hero Logo with Scroll Animation */}
                    <div className="h-40 mb-6 flex items-center justify-center">
                        {!isLogoInNav && (
                            <motion.div
                                layoutId="niveshak-logo"
                                className="relative w-32 h-32 md:w-52 md:h-52"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <Image src="/logo.png" alt="Niveshak Logo" fill className="object-contain drop-shadow-2xl" priority />
                            </motion.div>
                        )}
                    </div>

                    <div className="h-24 mb-6 flex items-center justify-center">
                        {!isLogoInNav && (
                            <motion.h1
                                layoutId="niveshak-title"
                                className="text-4xl md:text-8xl font-extrabold tracking-tighter text-white drop-shadow-2xl uppercase"
                            >
                                NIVESHAK
                            </motion.h1>
                        )}
                    </div>

                    <motion.div
                        animate={{ y: isLogoInNav ? 200 : 0 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="flex flex-col items-center"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={slide.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.5 }}
                                className="flex flex-col items-center"
                            >
                                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-sm font-medium mb-6 shadow-sm">
                                    <TrendingUp className="w-4 h-4 text-accent" />
                                    {slide.subtitle || "Mastering the Market"}
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        <h2 className="text-lg md:text-2xl font-light text-blue-50 mb-8 max-w-4xl mx-auto uppercase tracking-wider">
                            The Investment and Finance Club of IIM Shillong
                        </h2>

                        <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto hidden md:block leading-relaxed">
                            Empowering future leaders with financial acumen, market insights, and real-world investment strategies.
                        </p>
                    </motion.div>


                </motion.div>
            </div>
        </section>
    );
}
