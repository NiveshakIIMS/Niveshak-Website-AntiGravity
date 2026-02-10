"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Link as LinkIcon, FileText, Image as ImageIcon, Save, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { dataService, Resource } from "@/services/dataService";
import { uploadService } from "@/services/uploadService";
import MediaInput from "./MediaInput";
import { formatDateIndian } from "@/lib/dateUtils";

export default function ResourcesManager() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Folder State
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string, title: string }[]>([]);

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [currentResource, setCurrentResource] = useState<Resource>({
        id: "",
        title: "",
        description: "",
        type: "link",
        url: "",
        coverImage: "",
        date: new Date().toISOString().split('T')[0],
        parentId: null
    });

    useEffect(() => {
        loadResources(currentFolderId);
    }, [currentFolderId]);

    const loadResources = async (folderId: string | null) => {
        setLoading(true);
        const data = await dataService.getResources(folderId);
        setResources(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!currentResource.title) {
            alert("Title is required.");
            return;
        }
        if (currentResource.type !== 'folder' && !currentResource.url && currentResource.type !== 'file') { // File URL populated after upload, but check anyway
            // For file/link url is needed, for folder not really (but maybe we keep it consistency)
            // Check: if type is link, url mandatory. If type is file, url mandatory.
        }
        if (currentResource.type === 'link' && !currentResource.url) {
            alert("URL is required for external links.");
            return;
        }

        setSaving(true);
        try {
            if (currentResource.id) {
                await dataService.updateResource(currentResource);
            } else {
                await dataService.createResource({
                    ...currentResource,
                    parentId: currentFolderId
                });
            }
            await loadResources(currentFolderId);
            setIsEditing(false);
            resetForm();
        } catch (e) {
            console.error(e);
            alert("Failed to save resource.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this resource?")) return;
        try {
            await dataService.deleteResource(id);
            // Optimistic update or reload
            setResources(resources.filter(r => r.id !== id));
        } catch (e) {
            console.error(e);
            alert("Failed to delete.");
        }
    };

    const handleEnterFolder = (folder: Resource) => {
        setBreadcrumbs([...breadcrumbs, { id: folder.id, title: folder.title }]);
        setCurrentFolderId(folder.id);
    };

    const handleNavigateBreadcrumb = (index: number) => {
        if (index === -1) {
            setCurrentFolderId(null);
            setBreadcrumbs([]);
        } else {
            const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
            setBreadcrumbs(newBreadcrumbs);
            setCurrentFolderId(newBreadcrumbs[newBreadcrumbs.length - 1].id);
        }
    };

    const resetForm = () => {
        setCurrentResource({
            id: "",
            title: "",
            description: "",
            type: "link",
            url: "",
            coverImage: "",
            date: new Date().toISOString().split('T')[0],
            parentId: currentFolderId
        });
    };

    const handleFileUpload = async (file: File) => {
        try {
            const url = await uploadService.uploadFile(file, "resources");
            setCurrentResource(prev => ({ ...prev, url: url, type: "file" }));
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-foreground">Resources</h2>
                        <p className="text-muted-foreground">Manage documents, links, and folders.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { resetForm(); setCurrentResource(prev => ({ ...prev, type: 'folder' })); setIsEditing(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-md hover:shadow-lg shadow-blue-600/20"
                        >
                            <Plus className="w-5 h-5" /> New Folder
                        </button>
                        <button
                            onClick={() => { resetForm(); setIsEditing(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-md hover:shadow-lg shadow-blue-600/20"
                        >
                            <Plus className="w-5 h-5" /> Add Resource
                        </button>
                    </div>
                </div>

                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card p-3 rounded-lg border border-border overflow-x-auto">
                    <button
                        onClick={() => handleNavigateBreadcrumb(-1)}
                        className={`hover:text-blue-500 font-medium ${currentFolderId === null ? "text-foreground font-bold" : ""}`}
                    >
                        Home
                    </button>
                    {breadcrumbs.map((crumb, index) => (
                        <div key={crumb.id} className="flex items-center gap-2">
                            <span>/</span>
                            <button
                                onClick={() => handleNavigateBreadcrumb(index)}
                                className={`hover:text-blue-500 font-medium ${index === breadcrumbs.length - 1 ? "text-foreground font-bold" : ""}`}
                            >
                                {crumb.title}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {resources.map((resource) => (
                            <motion.div
                                key={resource.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`bg-card border rounded-xl overflow-hidden shadow-sm group hover:shadow-md transition-all ${resource.type === 'folder'
                                    ? 'border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10'
                                    : 'border-border'
                                    }`}
                            >
                                <div
                                    className="p-5 flex gap-4 cursor-pointer"
                                    onClick={() => resource.type === 'folder' ? handleEnterFolder(resource) : null}
                                >
                                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${resource.type === 'folder' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : 'bg-muted text-muted-foreground'
                                        }`}>
                                        {resource.coverImage ? (
                                            <img src={resource.coverImage} className="w-full h-full object-cover rounded-lg" alt="" />
                                        ) : (
                                            resource.type === 'folder' ? <div className="w-8 h-8">📁</div> : (resource.type === 'file' ? <FileText className="w-8 h-8" /> : <LinkIcon className="w-8 h-8" />)
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-foreground truncate">{resource.title}</h3>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setCurrentResource(resource); setIsEditing(true); }}
                                                    className="p-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                                >
                                                    <FileText className="w-4 h-4" /> {/* Edit Icon reused */}
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(resource.id); }}
                                                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                >
                                                    <X className="w-4 h-4" /> {/* Delete Icon reused X or Trash */}
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{resource.description || (resource.type === 'folder' ? "Folder" : "No description")}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 border border-border px-1.5 py-0.5 rounded-md">
                                                {resource.type}
                                            </span>
                                            {resource.type !== 'folder' && <span className="text-xs text-muted-foreground">{formatDateIndian(resource.date)}</span>}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {resources.length === 0 && (
                        <div className="col-span-full py-20 text-center text-muted-foreground">
                            No items in this folder.
                        </div>
                    )}
                </div>
            )}

            {/* Edit Modal */}
            <AnimatePresence>
                {isEditing && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setIsEditing(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-card w-full max-w-xl rounded-2xl shadow-xl overflow-hidden border border-border"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-border flex justify-between items-center">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    {currentResource.id ? 'Edit' : 'Add'} {currentResource.type === 'folder' ? 'Folder' : 'Resource'}
                                </h3>
                                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-muted rounded-full">
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                {/* Type Selector (Only if Creating New) */}
                                {!currentResource.id && (
                                    <div className="flex gap-2 p-1 bg-muted rounded-lg mb-4">
                                        {['link', 'file', 'folder'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setCurrentResource(prev => ({ ...prev, type: t as any }))}
                                                className={`flex-1 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${currentResource.type === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Title</label>
                                    <input
                                        type="text"
                                        value={currentResource.title}
                                        onChange={e => setCurrentResource({ ...currentResource, title: e.target.value })}
                                        className="w-full p-2 border border-input rounded-lg bg-background"
                                        placeholder="Name..."
                                        autoFocus
                                    />
                                </div>

                                {currentResource.type !== 'folder' && (
                                    <>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Date</label>
                                            <input
                                                type="date"
                                                value={formatDateIndian(currentResource.date)}
                                                onChange={e => setCurrentResource({ ...currentResource, date: e.target.value })}
                                                className="w-full p-2 border border-input rounded-lg bg-background"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Cover Image</label>
                                            <MediaInput
                                                value={currentResource.coverImage}
                                                onChange={(url) => setCurrentResource(prev => ({ ...prev, coverImage: url }))}
                                                folder="resources/covers"
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Description</label>
                                    <textarea
                                        value={currentResource.description}
                                        onChange={e => setCurrentResource({ ...currentResource, description: e.target.value })}
                                        className="w-full p-2 border border-input rounded-lg bg-background h-20"
                                        placeholder="Optional..."
                                    />
                                </div>

                                {currentResource.type === 'file' && (
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">File</label>
                                        <div className="flex gap-2 items-center">
                                            <label className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer text-sm font-medium border border-dashed flex items-center gap-2">
                                                <ImageIcon className="w-4 h-4" /> Upload
                                                <input type="file" className="hidden" onChange={async (e) => {
                                                    if (e.target.files?.[0]) await handleFileUpload(e.target.files[0]);
                                                }} />
                                            </label>
                                            {currentResource.url && <span className="text-xs text-blue-500 truncate max-w-[200px]">{currentResource.url}</span>}
                                        </div>
                                    </div>
                                )}

                                {currentResource.type === 'link' && (
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">URL</label>
                                        <input
                                            type="url"
                                            value={currentResource.url}
                                            onChange={e => setCurrentResource({ ...currentResource, url: e.target.value })}
                                            className="w-full p-2 border border-input rounded-lg bg-background"
                                            placeholder="https://..."
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/10">
                                <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted">Cancel</button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                                >
                                    {saving && <Loader2 className="w-3 h-3 animate-spin" />} Save
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
