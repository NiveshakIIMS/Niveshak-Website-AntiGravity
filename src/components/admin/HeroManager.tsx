"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Image as ImageIcon, Check, X } from "lucide-react";
import { dataService, HeroSlide } from "@/services/dataService";
import MediaInput from "./MediaInput";
import { motion, AnimatePresence } from "framer-motion";

export default function HeroManager() {
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<HeroSlide | null>(null);

    useEffect(() => {
        dataService.getHeroSlides().then(setSlides);
    }, []);

    const handleSave = () => {
        if (!editForm) return;
        const newSlides = slides.map(s => s.id === editForm.id ? editForm : s);
        setSlides(newSlides);
        dataService.saveHeroSlides(newSlides);
        setIsEditing(null);
        setEditForm(null);
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this slide?")) {
            const newSlides = slides.filter(s => s.id !== id);
            setSlides(newSlides);
            dataService.saveHeroSlides(newSlides);
        }
    };

    const handleAdd = () => {
        const newSlide: HeroSlide = {
            id: Date.now().toString(),
            imageUrl: "/hero_background.png",
            title: "New Headline",
            subtitle: "New Subtitle",
            objectFit: "cover",
            timer: 5
        };
        const newSlides = [...slides, newSlide];
        setSlides(newSlides);
        dataService.saveHeroSlides(newSlides);
        setEditForm(newSlide);
        setIsEditing(newSlide.id);
    };

    return (
        <div className="p-8 space-y-8 bg-background min-h-full">
            <div className="flex justify-between items-center border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <ImageIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        Hero Slider
                    </h2>
                    <p className="text-muted-foreground mt-1">Manage the rotating banner on the homepage.</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5"
                >
                    <Plus className="w-5 h-5" /> Add Slide
                </button>
            </div>

            <div className="space-y-6">
                <AnimatePresence>
                    {slides.map((slide) => (
                        <motion.div
                            key={slide.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`bg-card rounded-2xl border transition-all ${isEditing === slide.id ? "border-blue-500 shadow-lg ring-1 ring-blue-500" : "border-border shadow-sm hover:shadow-md"}`}
                        >
                            <div className="flex flex-col md:flex-row gap-6 p-6">
                                {/* Preview Area */}
                                <div className="w-full md:w-64 h-40 bg-muted rounded-xl overflow-hidden relative group shrink-0 border border-border">
                                    <img src={slide.imageUrl || "/hero_background.png"} alt="Preview" className={`w-full h-full object-${slide.objectFit}`} />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white text-xs font-medium px-2 py-1 bg-black/50 rounded backdrop-blur-sm">
                                            {slide.objectFit === "cover" ? "Fill Screen" : "Original Ratio"}
                                        </span>
                                    </div>
                                </div>

                                {/* Edit Form or Display */}
                                <div className="flex-1 space-y-4">
                                    {isEditing === slide.id && editForm ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1 col-span-2">
                                                <MediaInput
                                                    label="Image Source"
                                                    value={editForm.imageUrl}
                                                    onChange={(val) => setEditForm({ ...editForm, imageUrl: val })}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
                                                <input
                                                    type="text"
                                                    value={editForm.title}
                                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                                    className="w-full p-2.5 rounded-lg bg-background border border-input focus:ring-2 focus:ring-blue-500 outline-none font-bold text-foreground"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subtitle</label>
                                                <input
                                                    type="text"
                                                    value={editForm.subtitle}
                                                    onChange={(e) => setEditForm({ ...editForm, subtitle: e.target.value })}
                                                    className="w-full p-2.5 rounded-lg bg-background border border-input focus:ring-2 focus:ring-blue-500 outline-none text-foreground"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration (Sec)</label>
                                                <input
                                                    type="number"
                                                    value={editForm.timer || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                                                        setEditForm({ ...editForm, timer: val });
                                                    }}
                                                    className="w-full p-2.5 rounded-lg bg-background border border-border focus:ring-2 focus:ring-blue-500 outline-none text-foreground"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Display Mode</label>
                                                <select
                                                    value={editForm.objectFit}
                                                    onChange={(e) => setEditForm({ ...editForm, objectFit: e.target.value as "cover" | "contain" })}
                                                    className="w-full p-2.5 rounded-lg bg-background border border-input focus:ring-2 focus:ring-blue-500 outline-none text-foreground"
                                                >
                                                    <option value="cover">Fill Area (Cover)</option>
                                                    <option value="contain">Show Full Image (Contain)</option>
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col justify-center h-full space-y-2">
                                            <h3 className="text-xl font-bold text-foreground">{slide.title}</h3>
                                            <p className="text-muted-foreground">{slide.subtitle}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs">{slide.subtitle.substring(0, 20)}...</span>
                                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs">⏱ {slide.timer}s</span>
                                                <span className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs uppercase">{slide.objectFit}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2 justify-center border-l border-gray-100 dark:border-navy-700 pl-6 min-w-[100px]">
                                    {isEditing === slide.id ? (
                                        <>
                                            <button onClick={handleSave} className="flex items-center justify-center gap-2 w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20">
                                                <Check className="w-4 h-4" /> Save
                                            </button>
                                            <button onClick={() => { setIsEditing(null); setEditForm(null); }} className="flex items-center justify-center gap-2 w-full py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors">
                                                <X className="w-4 h-4" /> Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => { setIsEditing(slide.id); setEditForm(slide); }} className="w-full py-2 bg-card border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-medium">
                                            Edit
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(slide.id)} className="w-full py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
