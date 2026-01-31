/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Plus, Trash2, GripVertical, Check, X, Linkedin, Instagram, Facebook, Twitter, Youtube, Mail, Link as LinkIcon, Globe } from "lucide-react";
import { dataService, SocialLink } from "@/services/dataService";

const PLATFORMS = [
    { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-600" },
    { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-600" },
    { id: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-500" },
    { id: "twitter", label: "Twitter (X)", icon: Twitter, color: "text-sky-500" },
    { id: "youtube", label: "YouTube", icon: Youtube, color: "text-red-500" },
    { id: "email", label: "Email", icon: Mail, color: "text-orange-500" },
    { id: "other", label: "Website / Other", icon: Globe, color: "text-gray-500" },
] as const;

export default function SocialManager() {
    const [links, setLinks] = useState<SocialLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // New Link State
    const [newPlatform, setNewPlatform] = useState<SocialLink["platform"]>("linkedin");
    const [customLabel, setCustomLabel] = useState("");
    const [newUrl, setNewUrl] = useState("");

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        setError(null);
        try {
            const settings = await dataService.getSiteSettings();
            setLinks(settings.socialLinks || []);
        } catch (err: any) {
            console.error("Load Settings Failed:", err);
            setError(err.message || "Failed to load settings.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await dataService.saveSiteSettings({ socialLinks: links });
            // Simple alert for immediate feedback since we don't have a toast component
            alert("Links saved successfully!");
            setIsDirty(false);
        } catch (error) {
            console.error("Failed to save:", error);
            alert("Failed to save links. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const addLink = () => {
        if (!newUrl) return;
        const newLink: SocialLink = {
            id: Date.now().toString(),
            platform: newPlatform,
            url: newUrl,
            label: newPlatform === 'other' ? customLabel : undefined,
            isActive: true
        };
        setLinks([...links, newLink]);
        setNewUrl("");
        setCustomLabel("");
        setIsDirty(true);
    };

    const removeLink = (id: string) => {
        setLinks(links.filter(l => l.id !== id));
        setIsDirty(true);
    };

    const toggleActive = (id: string) => {
        setLinks(links.map(l => l.id === id ? { ...l, isActive: !l.isActive } : l));
        setIsDirty(true);
    };

    const getIcon = (platform: string) => {
        return PLATFORMS.find(p => p.id === platform)?.icon || Globe;
    };

    if (loading) return <div className="text-center py-12 text-muted-foreground">Loading settings...</div>;

    return (
        <div className="space-y-8">
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
                    <div className="font-bold">Error:</div>
                    <div className="break-all">{error}</div>
                    <button onClick={loadSettings} className="ml-auto hover:underline text-sm">Retry</button>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Social Media Links</h2>
                    <p className="text-muted-foreground">Manage your social icons in the website footer.</p>
                </div>
                {isDirty && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg hover:shadow-green-600/20"
                    >
                        {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                        Save Changes
                    </motion.button>
                )}
            </div>

            {/* Add New Link */}
            <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
                <h3 className="font-semibold text-lg text-foreground">Add New Link</h3>
                <div className="flex flex-col md:flex-row gap-4">
                    <select
                        value={newPlatform}
                        onChange={(e) => setNewPlatform(e.target.value as any)}
                        className="p-3 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto min-w-[150px]"
                    >
                        {PLATFORMS.map(p => (
                            <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                    </select>

                    {newPlatform === 'other' && (
                        <input
                            type="text"
                            placeholder="Platform Name (e.g. Threads)"
                            value={customLabel}
                            onChange={(e) => setCustomLabel(e.target.value)}
                            className="p-3 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-48"
                        />
                    )}

                    <input
                        type="text"
                        placeholder={newPlatform === 'email' ? "niveshak@example.com" : "https://..."}
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        className="flex-1 p-3 rounded-xl bg-background border border-border outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={addLink}
                        disabled={!newUrl}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" /> Add
                    </button>
                </div>
            </div>

            {/* Existing Links List */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {links.map((link) => {
                        const Icon = getIcon(link.platform);
                        const platformDef = PLATFORMS.find(p => p.id === link.platform);

                        return (
                            <motion.div
                                key={link.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className={`flex items-center gap-4 p-4 rounded-xl border ${link.isActive ? 'bg-card border-border' : 'bg-muted/30 border-border/50 opacity-60'}`}
                            >
                                <div className={`p-3 rounded-lg ${link.isActive ? 'bg-muted' : 'bg-transparent'}`}>
                                    <Icon className={`w-6 h-6 ${platformDef?.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-foreground capitalize">
                                            {link.label || (platformDef ? platformDef.label : link.platform)}
                                        </h4>
                                        {!link.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">Hidden</span>}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">{link.url}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleActive(link.id)}
                                        className={`p-2 rounded-lg transition-colors ${link.isActive ? 'text-green-500 hover:bg-green-500/10' : 'text-gray-400 hover:bg-gray-500/10'}`}
                                        title={link.isActive ? "Hide" : "Show"}
                                    >
                                        {link.isActive ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                    </button>
                                    <button
                                        onClick={() => removeLink(link.id)}
                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {links.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
                        <p>No social links added yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
