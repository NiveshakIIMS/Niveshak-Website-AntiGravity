/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Users, Save, X, Linkedin, Mail } from "lucide-react";
import { dataService, TeamMember } from "@/services/dataService";
import MediaInput from "./MediaInput";
import { motion, AnimatePresence } from "framer-motion";

export default function TeamManager() {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState<TeamMember | null>(null);

    useEffect(() => {
        dataService.getTeam().then(setMembers);
    }, []);

    const handleSave = () => {
        if (!formData) return;
        let newMembers;
        if (isEditing === "new") {
            newMembers = [...members, formData];
        } else {
            newMembers = members.map(m => m.id === formData.id ? formData : m);
        }
        setMembers(newMembers);
        dataService.saveTeam(newMembers);
        setIsEditing(null);
        setFormData(null);
    };

    const handleDelete = (id: string) => {
        if (confirm("Remove this member?")) {
            const newMembers = members.filter(m => m.id !== id);
            setMembers(newMembers);
            dataService.saveTeam(newMembers);
        }
    };

    const startEdit = (member: TeamMember) => {
        setFormData(member);
        setIsEditing(member.id);
    };

    const startNew = () => {
        const newMember: TeamMember = {
            id: Date.now().toString(),
            name: "",
            role: "",
            imageUrl: "/avatar_placeholder.png",
            email: "",
            linkedin: "",
            details: "",
            category: "Senior Team"
        };
        setFormData(newMember);
        setIsEditing("new");
    };

    return (
        <div className="p-8 space-y-8 bg-background min-h-full">
            <div className="flex justify-between items-center border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        Team Manager
                    </h2>
                    <p className="text-muted-foreground mt-1">Manage member profiles and leadership.</p>
                </div>
                <button onClick={startNew} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-600/20 transition-all hover:-translate-y-0.5">
                    <Plus className="w-5 h-5" /> Add Member
                </button>
            </div>

            {/* Modal Form */}
            <AnimatePresence>
                {isEditing && formData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-card w-full max-w-xl rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            {/* Header - Fixed */}
                            <div className="flex justify-between items-center p-6 border-b border-border">
                                <h3 className="font-bold text-2xl text-foreground">{isEditing === "new" ? "New Team Member" : "Edit Profile"}</h3>
                                <button onClick={() => setIsEditing(null)} className="p-2 hover:bg-muted rounded-full transition-colors"><X className="w-6 h-6 text-muted-foreground" /></button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="p-6 overflow-y-auto">
                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Full Name</label>
                                            <input className="w-full p-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-foreground placeholder:text-muted-foreground" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Role / Position</label>
                                            <input className="w-full p-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-foreground placeholder:text-muted-foreground" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} placeholder="Secretary" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Team Category</label>
                                            <select
                                                className="w-full p-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-foreground"
                                                value={formData.category || "Senior Team"}
                                                onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                                            >
                                                <option value="Senior Team">Senior Team</option>
                                                <option value="Junior Team">Junior Team</option>
                                                <option value="Faculty Mentor">Faculty Mentor</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Email</label>
                                            <input className="w-full p-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-foreground placeholder:text-muted-foreground" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="email@iimshillong.ac.in" />
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase">LinkedIn URL</label>
                                            <input className="w-full p-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-foreground placeholder:text-muted-foreground" value={formData.linkedin} onChange={e => setFormData({ ...formData, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <MediaInput
                                            label="Profile Picture"
                                            value={formData.imageUrl}
                                            onChange={(val) => setFormData({ ...formData, imageUrl: val })}
                                            placeholder="/path/to/image.jpg"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Bio / Description</label>
                                        <textarea className="w-full p-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] text-foreground placeholder:text-muted-foreground" value={formData.details} onChange={e => setFormData({ ...formData, details: e.target.value })} placeholder="Short biography..." />
                                    </div>
                                </div>
                            </div>

                            {/* Footer - Fixed */}
                            <div className="p-6 border-t border-border bg-card rounded-b-2xl">
                                <button onClick={handleSave} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">Save Member Details</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {members.map((member) => (
                        <motion.div
                            key={member.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="relative">
                                    <img
                                        src={member.imageUrl || "/avatar_placeholder.png"}
                                        alt={member.name}
                                        className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-navy-700 shadow-md"
                                    />
                                    <div className="absolute -bottom-1 -right-1 bg-blue-500 p-1 rounded-full text-white">
                                        <Edit2 className="w-3 h-3" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => startEdit(member)} className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(member.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg text-foreground">{member.name}</h3>
                                <p className="text-purple-600 dark:text-purple-400 font-medium text-sm mb-2">{member.role}</p>
                                <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{member.details}</p>

                                <div className="flex gap-3 text-sm text-muted-foreground pt-4 border-t border-border mt-2">
                                    {member.linkedin && <a href={member.linkedin} target="_blank" className="hover:text-blue-600 transition-colors"><Linkedin className="w-4 h-4" /></a>}
                                    {member.email && <a href={`mailto:${member.email}`} className="hover:text-purple-600 transition-colors"><Mail className="w-4 h-4" /></a>}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
