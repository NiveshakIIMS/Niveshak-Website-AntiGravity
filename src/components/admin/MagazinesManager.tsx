"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, BookOpen, Save, X, Download } from "lucide-react";
import { dataService, Magazine } from "@/services/dataService";
import MediaInput from "./MediaInput";
import { motion, AnimatePresence } from "framer-motion";

export default function MagazinesManager() {
    const [magazines, setMagazines] = useState<Magazine[]>([]);

    // Forms
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [magForm, setMagForm] = useState<Magazine | null>(null);

    useEffect(() => {
        dataService.getMagazines().then(setMagazines);
    }, []);

    // --- Magazines Logic ---
    const saveMag = async () => {
        if (!magForm) return;

        let newMags;
        if (isEditing === "new") {
            newMags = [...magazines, magForm];
        } else {
            newMags = magazines.map(m => m.id === magForm.id ? magForm : m);
        }

        setMagazines(newMags);
        await dataService.saveMagazines(newMags);
        setIsEditing(null);
    };

    const deleteMag = async (id: string) => {
        const newMags = magazines.filter(m => m.id !== id);
        setMagazines(newMags);
        await dataService.saveMagazines(newMags);
    };

    const startNewMag = () => {
        setMagForm({
            id: Date.now().toString() + Math.floor(Math.random() * 1000),
            title: "",
            issueDate: "",
            issueMonth: "",
            issueYear: "",
            coverUrl: "",
            pdfUrl: ""
        });
        setIsEditing("new");
    };

    return (
        <div className="p-8 space-y-8 bg-background min-h-full">
            <div className="flex justify-between items-center border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <BookOpen className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        Magazines
                    </h2>
                    <p className="text-muted-foreground mt-1">Manage magazine library and publications.</p>
                </div>
            </div>

            <div className="space-y-6">
                <button onClick={startNewMag} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-600/20 font-medium transition-all hover:-translate-y-0.5"><Plus className="w-4 h-4" /> Add Magazine</button>

                <AnimatePresence>
                    {isEditing && magForm && (
                        <motion.div initial={{ opacity: 0, height: 0, overflow: "hidden" }} animate={{ opacity: 1, height: "auto", transitionEnd: { overflow: "visible" } }} exit={{ opacity: 0, height: 0, overflow: "hidden" }}>
                            <div className="bg-card p-6 rounded-2xl border border-border shadow-xl grid gap-4 border-l-4 border-l-orange-500">
                                <h4 className="font-bold text-foreground mb-2">Editor</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <input placeholder="Title (e.g. Niveshak Jan)" value={magForm.title} onChange={e => setMagForm({ ...magForm, title: e.target.value })} className="p-3 border rounded-lg bg-background border-input text-foreground focus:ring-2 focus:ring-orange-500 outline-none" />
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Issue Date</label>
                                        <input
                                            type="month"
                                            value={magForm.issueDate || ""}
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (val) {
                                                    const date = new Date(val + "-01");
                                                    const month = date.toLocaleString('default', { month: 'long' });
                                                    const year = date.getFullYear().toString();
                                                    setMagForm({ ...magForm, issueDate: val, issueMonth: month, issueYear: year });
                                                } else {
                                                    setMagForm({ ...magForm, issueDate: "", issueMonth: "", issueYear: "" });
                                                }
                                            }}
                                            className="w-full p-3 border rounded-lg bg-background border-input text-foreground focus:ring-2 focus:ring-orange-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <MediaInput
                                        label="Cover Image"
                                        value={magForm.coverUrl}
                                        onChange={(val) => setMagForm({ ...magForm, coverUrl: val })}
                                    />
                                </div>
                                <input placeholder="PDF Link (Drive/OneDrive - View Only)" value={magForm.pdfUrl} onChange={e => setMagForm({ ...magForm, pdfUrl: e.target.value })} className="p-3 border rounded-lg bg-background border-input text-foreground focus:ring-2 focus:ring-orange-500 outline-none" />
                                <input placeholder="FlipHTML5 / Read Online URL" value={magForm.flipUrl || ""} onChange={e => setMagForm({ ...magForm, flipUrl: e.target.value })} className="p-3 border rounded-lg bg-background border-input text-foreground focus:ring-2 focus:ring-orange-500 outline-none" />
                                <div className="flex gap-3 pt-2">
                                    <button onClick={saveMag} className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">Save Details</button>
                                    <button onClick={() => setIsEditing(null)} className="px-5 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground font-medium">Cancel</button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {magazines.map(mag => (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key={mag.id} className="flex gap-4 bg-card p-4 rounded-xl border border-border shadow-sm hover:shadow-lg transition-all group">
                                <img src={mag.coverUrl || "/placeholder.png"} className="w-24 h-32 object-cover rounded-lg bg-muted shadow-md" />
                                <div className="flex-1 flex flex-col">
                                    <h4 className="font-bold text-foreground line-clamp-1">{mag.title}</h4>
                                    <p className="text-sm font-medium text-orange-500">{mag.issueMonth} {mag.issueYear}</p>

                                    <div className="mt-auto flex gap-2">
                                        <button onClick={() => { setMagForm(mag); setIsEditing("edit"); }} className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-xs hover:bg-blue-100">Edit</button>
                                        <button onClick={() => deleteMag(mag.id)} className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-xs hover:bg-red-100">Delete</button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
