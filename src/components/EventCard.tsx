"use client";

import { Clock, MapPin, Video, Calendar, Hourglass } from "lucide-react";
import { Event } from "@/services/dataService";

import { useTheme } from "@/components/ThemeProvider";

interface EventCardProps {
    event: Event;
}

export default function EventCard({ event }: EventCardProps) {
    const { theme } = useTheme();
    const eventDate = new Date(event.date);
    const today = new Date();

    // Reset time for accurate day difference
    const d1 = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const diffTime = d1.getTime() - d2.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let countdownText = "";
    if (diffDays > 0) {
        countdownText = `${diffDays} Day${diffDays > 1 ? 's' : ''} to go`;
    } else if (diffDays === 0) {
        countdownText = "Today";
    } else {
        countdownText = "Completed";
    }

    const isPortrait = event.orientation === "portrait";
    const isSquare = event.orientation === "square";

    // Determine aspect ratio class
    let aspectRatioClass = "aspect-video"; // Default Landscape
    if (isPortrait) aspectRatioClass = "aspect-[3/4]";
    if (isSquare) aspectRatioClass = "aspect-square";



    return (
        <div className={`bg-card border border-border rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all hover:-translate-y-1 group flex flex-col h-full w-full max-w-md mx-auto`}>
            {/* Cover Image Container */}
            <div className={`relative overflow-hidden bg-muted w-full ${aspectRatioClass}`}>
                <img
                    src={event.imageUrl || "/hero_background.png"}
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Status Badge */}
                <div className="absolute top-4 left-4 z-10">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${event.type === "Live" ? "bg-red-600 text-white animate-pulse" :
                        event.type === "Upcoming" ? "bg-blue-600 text-white" : "bg-gray-600 text-white"
                        }`}>
                        {event.type}
                    </span>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-6 flex flex-col flex-1">
                <h3 className="font-bold text-card-foreground mb-4 line-clamp-2 text-2xl tracking-tight">
                    {event.title}
                </h3>

                <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-base text-muted-foreground">
                        <div className="p-2 bg-secondary rounded-full shrink-0"><Clock className="w-5 h-5 text-accent" /></div>
                        <span className="font-medium">{event.time}</span>
                    </div>
                    <div className="flex items-center gap-3 text-base text-muted-foreground">
                        <div className="p-2 bg-secondary rounded-full shrink-0"><MapPin className="w-5 h-5 text-accent" /></div>
                        <span className="font-medium">{event.location}</span>
                    </div>
                </div>

                {/* Bottom Section: Date & Countdown */}
                <div className="mt-auto pt-6 border-t border-border/50 flex flex-wrap justify-between items-end gap-4">
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-foreground">{eventDate.getDate()}</span>
                            <div className="flex flex-col leading-none">
                                <span className="text-sm font-bold uppercase text-accent tracking-wider">{eventDate.toLocaleString('default', { month: 'short' })}</span>
                                <span className="text-xs text-muted-foreground">{eventDate.getFullYear()}</span>
                            </div>
                        </div>
                        <div className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {eventDate.toLocaleString('default', { weekday: 'long' })}
                        </div>
                    </div>

                    <div className="text-right">
                        <div
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold shadow-sm border ${diffDays === 0 ? "bg-green-50 text-green-600 border-transparent dark:bg-green-900/30 dark:text-green-400" :
                                diffDays < 0 ? "bg-gray-100 text-gray-500 border-transparent dark:bg-gray-800 dark:text-gray-400" :
                                    "transition-colors duration-300" // classes for diffDays > 0 are handled by style
                                }`}
                            style={diffDays > 0 ? {
                                backgroundColor: theme === "dark" ? "rgba(30, 58, 138, 0.3)" : "#ffffff",
                                color: theme === "dark" ? "#60a5fa" : "#000000",
                                borderColor: theme === "dark" ? "#1e40af" : "#e5e7eb"
                            } : {}}
                        >
                            <Hourglass className="w-3 h-3" />
                            {countdownText}
                        </div>
                    </div>
                </div>

                {event.isOnline && event.meetingLink && (
                    <a
                        href={event.meetingLink}
                        target="_blank"
                        className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-accent text-white font-semibold hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:-translate-y-1"
                    >
                        <Video className="w-4 h-4" /> Join Meeting
                    </a>
                )}
            </div>
        </div>
    );
}
