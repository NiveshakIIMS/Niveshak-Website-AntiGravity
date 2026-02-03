"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, FileText, Link as LinkIcon, Upload } from "lucide-react";
import { dataService, Notice } from "@/services/dataService";
import { motion, AnimatePresence } from "framer-motion";
import MediaInput from "./MediaInput";
import TimePicker from "./TimePicker";

export default function NoticesManager() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null); // 'new', 'edit', or null
    const [form, setForm] = useState<Notice | null>(null);

    useEffect(() => {
        dataService.getNotices().then(setNotices);
    }, []);

    const handleSave = async () => {
        if (!form) return;

        let newNotices;
        if (isEditing === "new") {
            newNotices = [form, ...notices];
        } else {
            newNotices = notices.map(n => n.id === form.id ? form : n);
        }

        setNotices(newNotices);
        await dataService.saveNotices(newNotices);
        setIsEditing(null);
        setForm(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this notice?")) return;
        const newNotices = notices.filter(n => n.id !== id);
        setNotices(newNotices);
        await dataService.saveNotices(newNotices);
    };

    const startNew = () => {
        setForm({
            id: Date.now().toString(),
            title: "",
            category: "General",
            content: "",
            date: new Date().toISOString().split('T')[0],
            time: "",
            expiryDate: "",
            imageUrl: "",
            link: "",
            linkLabel: "Learn More"
        });
        setIsEditing("new");
    };

    const startEdit = (notice: Notice) => {
        setForm({ ...notice });
        setIsEditing("edit");
    };

    return (
        <div className="p-8 space-y-8 bg-background min-h-full">
            <div className="flex justify-between items-center border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        Notices Board
                    </h2>
                    <p className="text-muted-foreground mt-1">Manage announcements, promotions, and reminders.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* List Column */}
                <div className="space-y-4">
                    <button
                        onClick={startNew}
                        className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-center gap-2 text-muted-foreground font-bold hover:border-purple-500 hover:text-purple-500 transition-all bg-card/50 hover:bg-card"
                    >
                        <Plus className="w-5 h-5" /> Post New Notice
                    </button>

                    <div className="space-y-3">
                        {notices.map(notice => (
                            <div
                                key={notice.id}
                                className={`p-4 bg-card border rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group flex gap-4 ${form?.id === notice.id ? "border-purple-500 ring-1 ring-purple-500" : "border-border"}`}
                                onClick={() => startEdit(notice)}
                            >
                                <div className="h-16 w-16 bg-muted rounded-lg overflow-hidden shrink-0">
                                    {notice.imageUrl ? (
                                        <img src={notice.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${notice.category === "Urgent" ? "bg-red-100 text-red-600" :
                                            notice.category === "Promotion" ? "bg-purple-100 text-purple-600" :
                                                "bg-blue-100 text-blue-600"
                                            }`}>
                                            {notice.category}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{notice.date}</span>
                                    </div>
                                    <h4 className="font-bold text-foreground truncate">{notice.title}</h4>
                                    <p className="text-sm text-muted-foreground truncate">{notice.content}</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(notice.id); }}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg self-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Editor Column */}
                <AnimatePresence mode="wait">
                    {isEditing && form ? (
                        <motion.div
                            key="editor"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-card border border-border rounded-2xl shadow-xl p-6 sticky top-8"
                        >
                            <h3 className="font-bold text-lg text-foreground mb-6 flex items-center gap-2 border-b border-border pb-4">
                                {isEditing === "new" ? "Create Notice" : "Edit Notice"}
                            </h3>

                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Title</label>
                                        <input
                                            value={form.title}
                                            onChange={e => setForm({ ...form, title: e.target.value })}
                                            className="w-full p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-bold"
                                            placeholder="Notice Headline"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Category</label>
                                        <select
                                            value={form.category}
                                            onChange={e => setForm({ ...form, category: e.target.value })}
                                            className="w-full p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        >
                                            <option value="General">General</option>
                                            <option value="Promotion">Promotion</option>
                                            <option value="Reminder">Reminder</option>
                                            <option value="Urgent">Urgent</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">Content</label>
                                    <textarea
                                        value={form.content}
                                        onChange={e => setForm({ ...form, content: e.target.value })}
                                        className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-purple-500 outline-none min-h-[120px]"
                                        placeholder="Write the full notice content here..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Publish Date</label>
                                        <div className="grid grid-cols-[3fr_2fr] gap-2">
                                            <input
                                                type="date"
                                                value={form.date}
                                                onChange={e => setForm({ ...form, date: e.target.value })}
                                                className="w-full p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            />
                                            <TimePicker
                                                value={form.time || ""}
                                                onChange={(val) => setForm({ ...form, time: val })}
                                                use12HourFormat={false} // Persist as HH:mm for Notices
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Expiry (Optional)</label>
                                        <input
                                            type="date"
                                            value={form.expiryDate || ""}
                                            onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                                            className="w-full p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <MediaInput
                                        label="Attached Image (Optional)"
                                        value={form.imageUrl || ""}
                                        onChange={(val) => setForm({ ...form, imageUrl: val })}
                                    />
                                </div>

                                <div className="grid grid-cols-[1fr_2fr] gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Link Label</label>
                                        <input
                                            value={form.linkLabel}
                                            onChange={e => setForm({ ...form, linkLabel: e.target.value })}
                                            className="w-full p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            placeholder="e.g. Register Now"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">URL</label>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <input
                                                value={form.link || ""}
                                                onChange={e => setForm({ ...form, link: e.target.value })}
                                                className="w-full pl-9 p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-border">
                                    <button
                                        onClick={handleSave}
                                        className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-4 h-4" /> Save Notice
                                    </button>
                                    <button
                                        onClick={() => { setIsEditing(null); setForm(null); }}
                                        className="px-6 py-2.5 bg-muted text-foreground rounded-xl font-bold hover:bg-secondary transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-12 border-2 border-dashed border-border rounded-2xl bg-muted/5">
                            <MegaphoneIcon />
                            <p className="mt-4 font-medium">Select a notice to edit or create a new one.</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function MegaphoneIcon() {
    return (
        <svg className="w-16 h-16 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 11 18-5v12L3 14v-3z" />
            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
    );
}
