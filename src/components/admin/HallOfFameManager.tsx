/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Award, X, Linkedin, Mail, UploadCloud, Loader2 } from "lucide-react";
import { dataService, HallOfFameMember } from "@/services/dataService";
import MediaInput from "./MediaInput";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { uploadService } from "@/services/uploadService";

export default function HallOfFameManager() {
    const [members, setMembers] = useState<HallOfFameMember[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState<HallOfFameMember | null>(null);
    const [loading, setLoading] = useState(true);
    const [isUploadingExcel, setIsUploadingExcel] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");

    useEffect(() => {
        loadMembers();
    }, []);

    const loadMembers = async () => {
        setLoading(true);
        const data = await dataService.getHallOfFame();
        setMembers(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!formData) return;
        try {
            await dataService.saveHallOfFameMember(formData);
            await loadMembers();
            setIsEditing(null);
            setFormData(null);
        } catch (err) {
            console.error("Save error", err);
            alert("Failed to save member");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Remove this alumni from the Hall of Fame?")) {
            try {
                await dataService.deleteHallOfFameMember(id);
                await loadMembers();
            } catch (err) {
                console.error("Delete error", err);
                alert("Failed to delete member");
            }
        }
    };

    const startEdit = (member: HallOfFameMember) => {
        setFormData(member);
        setIsEditing(member.id);
    };

    const startNew = () => {
        const newMember: HallOfFameMember = {
            id: crypto.randomUUID(),
            name: "",
            role: "",
            batch: "PGP'25",
            imageUrl: "/avatar_placeholder.png",
            email: "",
            linkedin: "",
            displayOrder: 0
        };
        setFormData(newMember);
        setIsEditing("new");
    };

    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingExcel(true);
        setUploadStatus("Reading Excel file...");

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            let addedCount = 0;
            let skippedCount = 0;

            // Start from 1 to skip the header row
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];

                // If the row is empty or doesn't have at least a name, skip
                if (!row || row.length === 0) continue;

                const name = row[0]?.toString().trim();
                const batch = row[1]?.toString().trim();

                if (!name || !batch) {
                    continue;
                }

                // 1. Deduplication check
                const isDuplicate = members.some(
                    m => m.name.toLowerCase() === name.toLowerCase() && m.batch.toLowerCase() === batch.toLowerCase()
                );

                if (isDuplicate) {
                    skippedCount++;
                    continue;
                }

                setUploadStatus(`Processing ${name} (${i}/${rows.length - 1})...`);

                // 2. Read Permissions based on fixed indices
                // 0: Name, 1: Batch, 2: Email, 3: Email Perm, 4: LinkedIn, 5: LinkedIn Perm, 6: Profile Pic
                const emailRaw = row[2]?.toString().trim() || "";
                const emailPermStr = row[3]?.toString().trim().toLowerCase() || "";
                const emailPerm = emailPermStr === "yes";
                const email = emailPerm ? emailRaw : "";

                const linkedinRaw = row[4]?.toString().trim() || "";
                const linkedinPermStr = row[5]?.toString().trim().toLowerCase() || "";
                const linkedinPerm = linkedinPermStr === "yes";
                const linkedin = linkedinPerm ? linkedinRaw : "";

                // 3. Process Image
                const gdriveUrl = row[6]?.toString().trim() || "";
                let finalImageUrl = "/avatar_placeholder.png";

                if (gdriveUrl) {
                    // Extract ID
                    const idMatch = gdriveUrl.match(/(?:id=|v\/|d\/)([a-zA-Z0-9_-]{25,})/);
                    const fileId = idMatch ? idMatch[1] : null;

                    if (fileId) {
                        try {
                            const proxyRes = await fetch(`/api/fetch-image?id=${fileId}`);
                            if (proxyRes.ok) {
                                const blob = await proxyRes.blob();
                                const imgFile = new File([blob], `profile_${fileId}.jpg`, { type: blob.type || "image/jpeg" });
                                const filename = `hall_of_fame/${Date.now()}_${fileId}.jpg`;
                                finalImageUrl = await uploadService.uploadFile(imgFile, filename);
                            }
                        } catch (imgErr) {
                            console.error(`Failed to fetch/upload image for ${name}`, imgErr);
                        }
                    }
                }

                // 4. Save Member
                const newMember: HallOfFameMember = {
                    id: crypto.randomUUID(),
                    name,
                    batch,
                    role: "", // Default empty
                    email,
                    linkedin,
                    imageUrl: finalImageUrl,
                    displayOrder: 0
                };

                await dataService.saveHallOfFameMember(newMember);
                addedCount++;
            }

            setUploadStatus(`Done! Added ${addedCount}, Skipped ${skippedCount} duplicates.`);
            await loadMembers();
            setTimeout(() => setUploadStatus(""), 3000);
        } catch (err) {
            console.error("Excel processing error", err);
            setUploadStatus("Error processing Excel file.");
            setTimeout(() => setUploadStatus(""), 3000);
        } finally {
            setIsUploadingExcel(false);
            if (e.target) e.target.value = ''; // Reset file input
        }
    };

    // Group by batch
    const groupedByBatch = members.reduce((acc, m) => {
        const batch = m.batch || "Unknown";
        if (!acc[batch]) acc[batch] = [];
        acc[batch].push(m);
        return acc;
    }, {} as Record<string, HallOfFameMember[]>);

    // Sort batches descending (PGP'26 before PGP'25)
    const sortedBatches = Object.keys(groupedByBatch).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numB - numA;
    });

    return (
        <div className="p-8 space-y-8 bg-background min-h-full">
            <div className="flex justify-between items-center border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        Hall of Fame
                    </h2>
                    <p className="text-muted-foreground mt-1">Manage alumni profiles from previous batches.</p>
                </div>
                <div className="flex gap-3">
                    <label className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer transition-all">
                        {isUploadingExcel ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                        <span className="font-medium whitespace-nowrap">Import Excel</span>
                        <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelUpload} disabled={isUploadingExcel} />
                    </label>
                    <button onClick={startNew} className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-600/20 transition-all hover:-translate-y-0.5 whitespace-nowrap">
                        <Plus className="w-5 h-5" /> Add Alumni
                    </button>
                </div>
            </div>

            {/* Upload Status Toast */}
            {uploadStatus && (
                <div className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 p-4 rounded-lg font-medium border border-blue-200 dark:border-blue-800">
                    {uploadStatus}
                </div>
            )}

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
                            {/* Header */}
                            <div className="flex justify-between items-center p-6 border-b border-border">
                                <h3 className="font-bold text-2xl text-foreground">{isEditing === "new" ? "New Alumni" : "Edit Profile"}</h3>
                                <button onClick={() => setIsEditing(null)} className="p-2 hover:bg-muted rounded-full transition-colors"><X className="w-6 h-6 text-muted-foreground" /></button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="p-6 overflow-y-auto">
                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Full Name</label>
                                            <input className="w-full p-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-foreground placeholder:text-muted-foreground" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Role / Position</label>
                                            <input className="w-full p-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-foreground placeholder:text-muted-foreground" value={formData.role || ""} onChange={e => setFormData({ ...formData, role: e.target.value })} placeholder="Secretary" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Batch (PGP&apos;xx)</label>
                                            <input className="w-full p-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-foreground placeholder:text-muted-foreground" value={formData.batch} onChange={e => setFormData({ ...formData, batch: e.target.value })} placeholder="PGP'25" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Display Order</label>
                                            <input type="number" className="w-full p-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-foreground placeholder:text-muted-foreground" value={formData.displayOrder || 0} onChange={e => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Email</label>
                                            <input className="w-full p-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-foreground placeholder:text-muted-foreground" value={formData.email || ""} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-muted-foreground uppercase">LinkedIn URL</label>
                                            <input className="w-full p-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-foreground placeholder:text-muted-foreground" value={formData.linkedin || ""} onChange={e => setFormData({ ...formData, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <MediaInput
                                            label="Profile Picture"
                                            value={formData.imageUrl || ""}
                                            onChange={(val) => setFormData({ ...formData, imageUrl: val })}
                                            placeholder="/path/to/image.jpg"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-border bg-card rounded-b-2xl">
                                <button onClick={handleSave} className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors shadow-lg shadow-amber-600/20">Save Alumni</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading State */}
            {loading && (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
            )}

            {/* Grouped by Batch */}
            {!loading && sortedBatches.map(batch => (
                <div key={batch} className="space-y-4">
                    <h3 className="text-xl font-bold text-foreground border-b border-border pb-2">
                        Batch: <span className="text-amber-600">{batch}</span>
                        <span className="text-sm font-normal text-muted-foreground ml-2">({groupedByBatch[batch].length} members)</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {groupedByBatch[batch].map((member) => (
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
                                            <div className="absolute -bottom-1 -right-1 bg-amber-500 p-1 rounded-full text-white">
                                                <Award className="w-3 h-3" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => startEdit(member)} className="p-2 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(member.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-lg text-foreground">{member.name}</h3>
                                        <p className="text-amber-600 dark:text-amber-400 font-medium text-sm mb-1">{member.role || "Member"}</p>
                                        <p className="text-muted-foreground text-xs mb-2">{member.batch}</p>

                                        <div className="flex gap-3 text-sm text-muted-foreground pt-4 border-t border-border mt-2">
                                            {member.linkedin && <a href={member.linkedin} target="_blank" className="hover:text-blue-600 transition-colors"><Linkedin className="w-4 h-4" /></a>}
                                            {member.email && <a href={`mailto:${member.email}`} className="hover:text-amber-600 transition-colors"><Mail className="w-4 h-4" /></a>}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            ))}

            {!loading && members.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <Award className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No alumni in the Hall of Fame yet.</p>
                    <p className="text-sm">Click &quot;Add Alumni&quot; to get started.</p>
                </div>
            )}
        </div>
    );
}
