"use client";

import { motion } from "framer-motion";
import { Link2, Clock, Calendar, AlertCircle, Megaphone, Bell } from "lucide-react";
import { Notice } from "@/services/dataService";
import { useState, useEffect } from "react";

interface NoticeCardProps {
    notice: Notice;
    idx: number;
}

export default function NoticeCard({ notice, idx }: NoticeCardProps) {
    const [timeLeft, setTimeLeft] = useState("");

    // Countdown Logic
    useEffect(() => {
        if (!notice.expiryDate) return;

        const calculateTime = () => {
            const now = new Date().getTime();
            const expiry = new Date(notice.expiryDate!).getTime();
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeLeft("Expired");
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            if (days > 0) {
                setTimeLeft(`${days} day${days > 1 ? 's' : ''} to go`);
            } else {
                setTimeLeft(`${hours}h remaining`);
            }
        };

        calculateTime();
        const timer = setInterval(calculateTime, 60000); // Update every minute
        return () => clearInterval(timer);
    }, [notice.expiryDate]);

    // Icon & Color based on Category
    let icon = <Megaphone className="w-5 h-5" />;
    let colorClass = "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    let borderClass = "border-blue-200 dark:border-blue-900";

    switch (notice.category) {
        case "Urgent":
            icon = <AlertCircle className="w-5 h-5" />;
            colorClass = "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
            borderClass = "border-red-200 dark:border-red-900";
            break;
        case "Promotion":
            icon = <Megaphone className="w-5 h-5" />;
            colorClass = "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
            borderClass = "border-purple-200 dark:border-purple-900";
            break;
        case "Reminder":
            icon = <Bell className="w-5 h-5" />;
            colorClass = "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400";
            borderClass = "border-yellow-200 dark:border-yellow-900";
            break;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`group relative bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all border ${borderClass} flex flex-col h-full`}
        >
            {/* Image (Optional) */}
            {notice.imageUrl && (
                <div className="relative h-40 w-full overflow-hidden bg-muted">
                    <img
                        src={notice.imageUrl}
                        alt={notice.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/50 to-transparent" />
                </div>
            )}

            <div className="p-5 flex flex-col flex-1">
                {/* Header: Date + Expiry */}
                <div className="flex justify-between items-start mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${colorClass}`}>
                        {icon}
                        {notice.category}
                    </span>
                    {notice.expiryDate && timeLeft !== "Expired" && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg border border-orange-100 dark:border-orange-900/50">
                            <Clock className="w-3.5 h-3.5" />
                            {timeLeft}
                        </span>
                    )}
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2 leading-tight group-hover:text-accent transition-colors">
                    {notice.title}
                </h3>

                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1 whitespace-pre-line">
                    {notice.content}
                </p>

                {/* Footer: Date & Link */}
                <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(notice.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {notice.time && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span>{new Date(`1970-01-01T${notice.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                            </>
                        )}
                    </div>

                    {notice.link && (
                        <a
                            href={notice.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm font-bold text-accent hover:underline hover:text-accent/80 transition-colors"
                        >
                            {notice.linkLabel || "View Details"}
                            <Link2 className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </div>

            {/* Hover Glow Effect */}
            <div className="absolute inset-0 border-2 border-accent/0 group-hover:border-accent/10 rounded-2xl pointer-events-none transition-colors" />
        </motion.div>
    );
}
