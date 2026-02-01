"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TimePickerProps {
    value: string;
    onChange: (value: string) => void;
    use12HourFormat?: boolean; // If true, returns "hh:mm AM/PM", else "HH:mm"
}

export default function TimePicker({ value, onChange, use12HourFormat = false }: TimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse initial value
    const parseTime = (val: string) => {
        if (!val) return { hour: 12, minute: 0, period: "AM" };

        // Check if already 12h format like "5:00 PM"
        const match12 = val.match(/(\d+):(\d+)\s?(AM|PM)/i);
        if (match12) {
            return {
                hour: parseInt(match12[1]),
                minute: parseInt(match12[2]),
                period: match12[3].toUpperCase()
            };
        }

        // Assume 24h format "17:00"
        const [h, m] = val.split(':').map(Number);
        if (isNaN(h)) return { hour: 12, minute: 0, period: "AM" }; // Fallback

        const period = h >= 12 ? "PM" : "AM";
        const hour12 = h % 12 || 12;
        return { hour: hour12, minute: m || 0, period };
    };

    const [selected, setSelected] = useState(parseTime(value));

    useEffect(() => {
        setSelected(parseTime(value));
    }, [value]);

    useEffect(() => {
        // Close on click outside
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const updateTime = (newHour: number, newMinute: number, newPeriod: string) => {
        setSelected({ hour: newHour, minute: newMinute, period: newPeriod });

        let output = "";
        if (use12HourFormat) {
            output = `${newHour}:${newMinute.toString().padStart(2, '0')} ${newPeriod}`;
        } else {
            // Convert to 24h
            let h24 = newHour;
            if (newPeriod === "PM" && h24 !== 12) h24 += 12;
            if (newPeriod === "AM" && h24 === 12) h24 = 0;
            output = `${h24.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
        }
        onChange(output);
    };

    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-purple-500 outline-none flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-2 text-foreground">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                        {selected.hour}:{selected.minute.toString().padStart(2, '0')} {selected.period}
                    </span>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute z-[100] top-full mt-2 right-0 w-72 bg-card border border-border rounded-xl shadow-xl overflow-hidden p-4 grid grid-cols-3 gap-2"
                    >
                        {/* Hour Column */}
                        <div className="flex flex-col items-center h-48 overflow-y-auto custom-scrollbar snap-y snap-mandatory bg-muted/20 rounded-lg">
                            <div className="py-2 text-xs font-bold text-muted-foreground uppercase sticky top-0 bg-card w-full text-center z-10">Hr</div>
                            {hours.map(h => (
                                <button
                                    key={h}
                                    onClick={() => updateTime(h, selected.minute, selected.period)}
                                    className={`w-full py-2 snap-center text-sm font-bold transition-colors ${selected.hour === h ? "text-purple-600 bg-purple-100 dark:bg-purple-900/30" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    {h}
                                </button>
                            ))}
                        </div>

                        {/* Minute Column */}
                        <div className="flex flex-col items-center h-48 overflow-y-auto custom-scrollbar snap-y snap-mandatory bg-muted/20 rounded-lg">
                            <div className="py-2 text-xs font-bold text-muted-foreground uppercase sticky top-0 bg-card w-full text-center z-10">Min</div>
                            {minutes.map(m => (
                                <button
                                    key={m}
                                    onClick={() => updateTime(selected.hour, m, selected.period)}
                                    className={`w-full py-2 snap-center text-sm font-bold transition-colors ${selected.minute === m ? "text-purple-600 bg-purple-100 dark:bg-purple-900/30" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    {m.toString().padStart(2, '0')}
                                </button>
                            ))}
                        </div>

                        {/* AM/PM Column */}
                        <div className="flex flex-col items-center justify-center gap-2 h-48 bg-muted/20 rounded-lg">
                            <button
                                onClick={() => updateTime(selected.hour, selected.minute, "AM")}
                                className={`w-12 py-2 rounded-lg text-sm font-bold transition-colors ${selected.period === "AM" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "bg-card text-muted-foreground hover:bg-muted"}`}
                            >
                                AM
                            </button>
                            <button
                                onClick={() => updateTime(selected.hour, selected.minute, "PM")}
                                className={`w-12 py-2 rounded-lg text-sm font-bold transition-colors ${selected.period === "PM" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "bg-card text-muted-foreground hover:bg-muted"}`}
                            >
                                PM
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
