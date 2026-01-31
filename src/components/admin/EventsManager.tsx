/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, BookOpen, Save, X, Download } from "lucide-react";
import { dataService, Event } from "@/services/dataService";
import MediaInput from "./MediaInput";
import { motion, AnimatePresence } from "framer-motion";

export default function EventsManager() {
    const [events, setEvents] = useState<Event[]>([]);

    // Forms
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [eventForm, setEventForm] = useState<Event | null>(null);

    useEffect(() => {
        dataService.getEvents().then(setEvents);
    }, []);

    // --- Events Logic ---
    const saveEvent = async () => {
        if (!eventForm) return;

        let newEvents;
        if (isEditing === "new") {
            newEvents = [...events, eventForm];
        } else {
            newEvents = events.map(e => e.id === eventForm.id ? eventForm : e);
        }
        setEvents(newEvents);
        await dataService.saveEvents(newEvents);
        setIsEditing(null);
    };

    const deleteEvent = async (id: string) => {
        const newEvents = events.filter(e => e.id !== id);
        setEvents(newEvents);
        await dataService.saveEvents(newEvents);
    };

    const startNewEvent = () => {
        setEventForm({ id: Date.now().toString(), title: "", date: "", time: "", location: "", type: "Upcoming", imageUrl: "", isOnline: false });
        setIsEditing("new");
    };

    return (
        <div className="p-8 space-y-8 bg-background min-h-full">
            <div className="flex justify-between items-center border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        Events Manager
                    </h2>
                    <p className="text-muted-foreground mt-1">Manage event schedules, workshops, and competitions.</p>
                </div>
            </div>

            <div className="space-y-6">
                <button onClick={startNewEvent} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 font-medium transition-all hover:-translate-y-0.5"><Plus className="w-4 h-4" /> Add Event</button>

                <AnimatePresence>
                    {isEditing && eventForm && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="bg-card p-6 rounded-2xl border border-border shadow-xl grid gap-4 border-l-4 border-l-blue-500">
                                <h4 className="font-bold text-foreground mb-2">Event Editor</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <input placeholder="Event Title" value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} className="p-3 border rounded-lg bg-background border-input text-foreground focus:ring-2 focus:ring-blue-500 outline-none" />
                                    <select value={eventForm.type} onChange={e => setEventForm({ ...eventForm, type: e.target.value as any })} className="p-3 border rounded-lg bg-background border-input text-foreground focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="Upcoming">Upcoming</option>
                                        <option value="Live">Live (Pulse Red)</option>
                                        <option value="Past">Past</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} className="p-3 border rounded-lg bg-background border-input text-foreground focus:ring-2 focus:ring-blue-500 outline-none" />
                                    <input type="time" value={eventForm.time} onChange={e => setEventForm({ ...eventForm, time: e.target.value })} className="p-3 border rounded-lg bg-background border-input text-foreground focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <input placeholder="Location" value={eventForm.location} onChange={e => setEventForm({ ...eventForm, location: e.target.value })} className="p-3 border rounded-lg bg-background border-input text-foreground focus:ring-2 focus:ring-blue-500 outline-none" />

                                {/* Image and Orientation */}
                                <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                                    <div className="space-y-1">
                                        <MediaInput
                                            label="Event Cover"
                                            value={eventForm.imageUrl}
                                            onChange={(val) => setEventForm({ ...eventForm, imageUrl: val })}
                                        />
                                    </div>
                                    <select
                                        value={eventForm.orientation || "landscape"}
                                        onChange={e => setEventForm({ ...eventForm, orientation: e.target.value as "landscape" | "portrait" })}
                                        className="p-3 border rounded-lg bg-background border-input text-foreground focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="landscape">Landscape / Square</option>
                                        <option value="portrait">Portrait (Poster)</option>
                                        <option value="square">Square</option>
                                    </select>
                                </div>
                                {eventForm.isOnline && (
                                    <input placeholder="Meeting Link" value={eventForm.meetingLink || ""} onChange={e => setEventForm({ ...eventForm, meetingLink: e.target.value })} className="p-3 border rounded-lg bg-background border-input text-foreground focus:ring-2 focus:ring-blue-500 outline-none" />
                                )}

                                <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                                    <input type="checkbox" className="w-5 h-5 accent-blue-500" checked={eventForm.isOnline} onChange={e => setEventForm({ ...eventForm, isOnline: e.target.checked })} />
                                    <label className="text-sm font-medium text-foreground">Is Online Event?</label>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button onClick={saveEvent} className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">Save Event</button>
                                    <button onClick={() => setIsEditing(null)} className="px-5 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground font-medium">Cancel</button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-3">
                    <AnimatePresence>
                        {events.map(event => (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key={event.id} className="flex justify-between items-center bg-card p-5 rounded-xl border border-border shadow-sm hover:shadow-md transition-all">
                                <div className="flex gap-4 items-center">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${event.type === "Live" ? "bg-red-500 animate-pulse" : "bg-blue-500"}`}>
                                        {new Date(event.date).getDate()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-lg text-foreground">{event.title}</h4>
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${event.type === "Live" ? "bg-red-100 text-red-600" : "bg-muted text-muted-foreground"}`}>{event.type}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground flex gap-3 mt-1">
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {event.date}</span>
                                            <span className="flex items-center gap-1"><X className="w-3 h-3 rotate-45" /> {event.time}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEventForm(event); setIsEditing("edit"); }} className="p-2 hover:bg-muted rounded-lg text-blue-500 transition-colors"><BookOpen className="w-5 h-5" /></button>
                                    <button onClick={() => deleteEvent(event.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
