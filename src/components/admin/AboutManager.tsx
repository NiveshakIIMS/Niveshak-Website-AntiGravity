"use client";

import { useState, useEffect } from "react";
import { Save, FileText, Layout, Info, Plus, Trash2, Type, Image as ImageIcon, AlignLeft, ArrowUp, ArrowDown, Maximize2, X, Check, List } from "lucide-react";
import { dataService, AboutContent, ContentBlock, AboutSection } from "@/services/dataService";
import MediaInput from "./MediaInput";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

export default function AboutManager() {
    const [data, setData] = useState<AboutContent | null>(null);
    const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

    // Quill Modules
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image'],
            ['clean']
        ],
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'indent',
        'link', 'image'
    ];

    useEffect(() => {
        dataService.getAbout().then((loadedData) => {
            if (!loadedData.richContent) {
                loadedData.richContent = [];
            }
            if (!loadedData.cards) {
                loadedData.cards = [];
            }
            // Initialize sections from legacy data if sections are missing (Migration support)
            if (!loadedData.sections || loadedData.sections.length === 0) {
                loadedData.sections = [{
                    id: 'default', // Will be replaced by UUID on save if we implement that, or kept as placeholder
                    title: loadedData.title || "About Niveshak",
                    description: loadedData.description || "",
                    cards: loadedData.cards || [],
                    displayOrder: 0
                }];
            }
            setData(loadedData);
        });
    }, []);

    const handleSave = () => {
        if (data) {
            // Ensure display orders are correct before saving
            const sectionsWithOrder = data.sections?.map((s, i) => ({ ...s, displayOrder: i })) || [];
            dataService.saveAbout({ ...data, sections: sectionsWithOrder });
            alert("About Us content updated!");
        }
    };

    const addBlock = (type: ContentBlock["type"]) => {
        if (!data) return;
        const newBlock: ContentBlock = {
            id: Date.now().toString(),
            type,
            content: ""
        };
        setData({ ...data, richContent: [...(data.richContent || []), newBlock] });
    };

    // --- Section Management ---

    const addSection = () => {
        if (!data) return;
        const newSection = {
            id: crypto.randomUUID(), // Local temporary ID or use uuid gen
            title: "New Section",
            description: "Section description...",
            cards: [],
            displayOrder: (data.sections?.length || 0)
        };
        setData({ ...data, sections: [...(data.sections || []), newSection] });
    };

    const updateSection = (index: number, field: keyof AboutSection, value: any) => {
        if (!data || !data.sections) return;
        const newSections = [...data.sections];
        newSections[index] = { ...newSections[index], [field]: value };
        setData({ ...data, sections: newSections });
    };

    const deleteSection = (index: number) => {
        if (!data || !data.sections || !confirm("Delete this entire section?")) return;
        const newSections = [...data.sections];
        newSections.splice(index, 1);
        setData({ ...data, sections: newSections });
    };

    const moveSection = (index: number, direction: -1 | 1) => {
        if (!data || !data.sections) return;
        const newSections = [...data.sections];
        if (index + direction < 0 || index + direction >= newSections.length) return;
        [newSections[index], newSections[index + direction]] = [newSections[index + direction], newSections[index]];
        setData({ ...data, sections: newSections });
    };

    // --- Card Management (Nested) ---

    const addCardToSection = (sectionIndex: number) => {
        if (!data || !data.sections) return;
        const newSections = [...data.sections];
        const newCard = { title: "New Feature", description: "Feature description..." };
        newSections[sectionIndex].cards = [...(newSections[sectionIndex].cards || []), newCard];
        setData({ ...data, sections: newSections });
    };

    const updateCardInSection = (sectionIndex: number, cardIndex: number, field: 'title' | 'description', value: string) => {
        if (!data || !data.sections) return;
        const newSections = [...data.sections];
        const newCards = [...newSections[sectionIndex].cards];
        newCards[cardIndex] = { ...newCards[cardIndex], [field]: value };
        newSections[sectionIndex].cards = newCards;
        setData({ ...data, sections: newSections });
    };

    const deleteCardFromSection = (sectionIndex: number, cardIndex: number) => {
        if (!data || !data.sections) return;
        const newSections = [...data.sections];
        newSections[sectionIndex].cards.splice(cardIndex, 1);
        setData({ ...data, sections: newSections });
    };

    const updateBlock = (id: string, content: string) => {
        if (!data) return;
        setData({
            ...data,
            richContent: data.richContent?.map(b => b.id === id ? { ...b, content } : b)
        });
    };

    const deleteBlock = (id: string) => {
        if (!data || !confirm("Delete this block?")) return;
        setData({
            ...data,
            richContent: data.richContent?.filter(b => b.id !== id)
        });
    };

    const moveBlock = (index: number, direction: -1 | 1) => {
        if (!data || !data.richContent) return;
        const newBlocks = [...data.richContent];
        if (index + direction < 0 || index + direction >= newBlocks.length) return;

        [newBlocks[index], newBlocks[index + direction]] = [newBlocks[index + direction], newBlocks[index]];
        setData({ ...data, richContent: newBlocks });
    };

    // Find the currently expanded block object
    const expandedBlock = data?.richContent?.find(b => b.id === expandedBlockId);

    if (!data) return <div className="p-8 text-muted-foreground">Loading editor...</div>;

    return (
        <div className="p-8 space-y-8 bg-background min-h-full">
            <div className="flex justify-between items-center border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <Info className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        About Content
                    </h2>
                    <p className="text-muted-foreground mt-1">Update company mission, vision, and history.</p>
                </div>
                <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/20 transition-transform hover:-translate-y-0.5 font-bold">
                    <Save className="w-5 h-5" /> Save Changes
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 bg-card p-8 rounded-2xl border border-border shadow-sm sticky top-8"
                >
                    <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
                        <Layout className="w-5 h-5 text-muted-foreground" />
                        <h3 className="font-bold text-lg text-card-foreground">Global Settings</h3>
                    </div>

                    <div className="space-y-2 mb-8">
                        <label className="block text-xs font-bold text-muted-foreground uppercase">Slideshow Images (URLs)</label>
                        <input
                            type="text"
                            value={data.slides.join(", ")}
                            onChange={(e) => setData({ ...data, slides: e.target.value.split(",").map(s => s.trim()) })}
                            className="w-full p-3 rounded-lg bg-background border border-input text-foreground focus:ring-2 focus:ring-green-500 outline-none text-sm font-mono"
                            placeholder="url1, url2, url3"
                        />
                        <p className="text-xs text-muted-foreground">Comma separated URLs for the rotating image slider.</p>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <List className="w-5 h-5 text-muted-foreground" />
                            <h3 className="font-bold text-lg text-card-foreground">Content Sections</h3>
                        </div>
                        <button onClick={addSection} className="text-xs flex items-center gap-1 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 px-3 py-1.5 rounded-lg hover:bg-green-200 transition-colors font-bold">
                            <Plus className="w-3 h-3" /> Add Section
                        </button>
                    </div>

                    <div className="space-y-6">
                        {data.sections?.map((section, sIdx) => (
                            <div key={section.id || sIdx} className="p-5 border border-border rounded-xl bg-card/50 space-y-4 shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center justify-between border-b border-border pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-muted px-2 py-0.5 rounded text-xs font-mono text-muted-foreground">#{sIdx + 1}</span>
                                        <h4 className="font-bold text-sm text-foreground truncate max-w-[150px]">{section.title}</h4>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => moveSection(sIdx, -1)} disabled={sIdx === 0} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-blue-500 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                                        <button onClick={() => moveSection(sIdx, 1)} disabled={sIdx === (data.sections?.length || 0) - 1} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-blue-500 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                                        <button onClick={() => deleteSection(sIdx)} className="p-1.5 hover:bg-red-100 text-muted-foreground hover:text-red-600 rounded disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Title</label>
                                        <input
                                            type="text"
                                            value={section.title}
                                            onChange={(e) => updateSection(sIdx, 'title', e.target.value)}
                                            className="w-full p-2.5 rounded-lg bg-background border border-input text-foreground focus:ring-2 focus:ring-green-500 outline-none text-sm font-bold"
                                            placeholder="Section Title (e.g. About Niveshak)"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Description</label>
                                        <textarea
                                            value={section.description}
                                            onChange={(e) => updateSection(sIdx, 'description', e.target.value)}
                                            rows={4}
                                            className="w-full p-2.5 rounded-lg bg-background border border-input text-foreground focus:ring-2 focus:ring-green-500 outline-none text-sm resize-none"
                                            placeholder="Section description..."
                                        />
                                    </div>
                                </div>

                                {/* Cards Sub-section */}
                                <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1"><Info className="w-3 h-3" /> Info Cards</span>
                                        <button onClick={() => addCardToSection(sIdx)} className="text-[10px] flex items-center gap-1 bg-blue-100 text-blue-600 dark:bg-blue-900/30 px-2 py-1 rounded hover:bg-blue-200 transition-colors font-bold">
                                            <Plus className="w-3 h-3" /> Add Card
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {section.cards?.map((card, cIdx) => (
                                            <div key={cIdx} className="flex gap-2 items-start group">
                                                <div className="flex-1 space-y-2">
                                                    <input
                                                        type="text"
                                                        value={card.title}
                                                        onChange={(e) => updateCardInSection(sIdx, cIdx, 'title', e.target.value)}
                                                        className="w-full p-2 rounded bg-background border border-input text-xs font-bold focus:ring-1 focus:ring-blue-500"
                                                        placeholder="Card Title"
                                                    />
                                                    <textarea
                                                        value={card.description}
                                                        onChange={(e) => updateCardInSection(sIdx, cIdx, 'description', e.target.value)}
                                                        rows={2}
                                                        className="w-full p-2 rounded bg-background border border-input text-xs resize-none focus:ring-1 focus:ring-blue-500"
                                                        placeholder="Card details..."
                                                    />
                                                </div>
                                                <button onClick={() => deleteCardFromSection(sIdx, cIdx)} className="p-1 hover:bg-red-100 text-red-400 hover:text-red-500 rounded opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {(!section.cards || section.cards.length === 0) && (
                                            <div className="text-center py-2 text-xs text-muted-foreground italic">No cards added.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col bg-card rounded-2xl border border-border shadow-sm overflow-hidden min-h-[600px]"
                >
                    <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <h3 className="font-bold text-lg text-card-foreground">Full About Page Content</h3>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => addBlock("heading")} className="p-2 bg-background border border-border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Add Heading"><Type className="w-4 h-4" /></button>
                            <button onClick={() => addBlock("paragraph")} className="p-2 bg-background border border-border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Add Paragraph"><AlignLeft className="w-4 h-4" /></button>
                            <button onClick={() => addBlock("image")} className="p-2 bg-background border border-border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Add Image"><ImageIcon className="w-4 h-4" /></button>
                            <button onClick={() => addBlock("double_image")} className="p-2 bg-background border border-border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Add Double Image"><Layout className="w-4 h-4" /></button>
                        </div>
                    </div>

                    <div className="p-6 space-y-4 flex-1">
                        <AnimatePresence>
                            {data.richContent && data.richContent.length > 0 ? (
                                data.richContent.map((block, index) => (
                                    <motion.div
                                        key={block.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="group relative bg-background border border-border rounded-xl p-4 hover:border-blue-500 transition-colors"
                                    >
                                        <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            {block.type === "paragraph" && (
                                                <button onClick={() => setExpandedBlockId(block.id)} className="p-1 hover:bg-muted rounded shadow-sm text-muted-foreground hover:text-blue-500" title="Maximize Editor"><Maximize2 className="w-3 h-3" /></button>
                                            )}
                                            <button onClick={() => moveBlock(index, -1)} disabled={index === 0} className="p-1 hover:bg-muted rounded shadow-sm text-muted-foreground hover:text-blue-500 disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                                            <button onClick={() => deleteBlock(block.id)} className="p-1 hover:bg-muted rounded shadow-sm text-muted-foreground hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                            <button onClick={() => moveBlock(index, 1)} disabled={index === (data.richContent?.length || 0) - 1} className="p-1 hover:bg-muted rounded shadow-sm text-muted-foreground hover:text-blue-500 disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                                        </div>

                                        <div className="pr-8">
                                            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                {block.type === "heading" && <><Type className="w-3 h-3" /> Heading</>}
                                                {block.type === "paragraph" && <><AlignLeft className="w-3 h-3" /> Paragraph</>}
                                                {block.type === "image" && <><ImageIcon className="w-3 h-3" /> Image URL</>}
                                                {block.type === "double_image" && <><Layout className="w-3 h-3" /> Side-by-Side Images</>}
                                            </div>

                                            {block.type === "paragraph" && (
                                                <div className="relative text-foreground">
                                                    <ReactQuill
                                                        theme="snow"
                                                        value={block.content}
                                                        onChange={(content) => updateBlock(block.id, content)}
                                                        modules={modules}
                                                        formats={formats}
                                                        className="bg-background text-foreground"
                                                    />
                                                </div>
                                            )}

                                            {block.type === "heading" && (
                                                <input
                                                    type="text"
                                                    value={block.content}
                                                    onChange={(e) => updateBlock(block.id, e.target.value)}
                                                    className="w-full bg-transparent border-none outline-none text-xl font-bold text-foreground"
                                                    placeholder="Heading Title"
                                                />
                                            )}

                                            {block.type === "image" && (
                                                <>
                                                    <div className="mb-2">
                                                        <MediaInput
                                                            value={block.content}
                                                            onChange={(val) => updateBlock(block.id, val)}
                                                            placeholder="Image URL or Upload"
                                                        />
                                                    </div>
                                                    {block.content && (
                                                        <div className="mt-3 space-y-3">
                                                            <div className={`flex w-full ${block.style?.align === 'left' ? 'justify-start' : block.style?.align === 'right' ? 'justify-end' : 'justify-center'}`}>
                                                                <div
                                                                    className="rounded-lg overflow-hidden border border-border bg-muted transition-all duration-300"
                                                                    style={{ width: `${block.style?.width || 100}%` }}
                                                                >
                                                                    <img src={block.content} alt="Preview" className="w-full h-auto object-cover" onError={(e) => (e.currentTarget.src = "/placeholder.png")} />
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/30 rounded-lg border border-border">
                                                                <div className="flex items-center gap-1 bg-background rounded-lg border border-border p-1">
                                                                    {(["left", "center", "right"] as const).map(align => (
                                                                        <button
                                                                            key={align}
                                                                            onClick={() => {
                                                                                const newBlocks = [...(data.richContent || [])];
                                                                                const target = newBlocks.find(b => b.id === block.id);
                                                                                if (target) {
                                                                                    target.style = { ...target.style, align };
                                                                                    setData({ ...data, richContent: newBlocks });
                                                                                }
                                                                            }}
                                                                            title={`Align ${align}`}
                                                                            className={`p-1.5 rounded-md transition-colors ${block.style?.align === align || (!block.style?.align && align === "center") ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold shadow-sm" : "hover:bg-muted text-muted-foreground"}`}
                                                                        >
                                                                            <div className={`w-4 h-4 rounded-sm border-2 border-current ${align === "left" ? "border-r-0 border-b-0 border-t-0" : align === "right" ? "border-l-0 border-b-0 border-t-0" : "border-x-2 border-y-0"}`} style={{
                                                                                backgroundImage: "linear-gradient(currentColor, currentColor)",
                                                                                backgroundSize: "100% 2px",
                                                                                backgroundRepeat: "no-repeat",
                                                                                backgroundPosition: "center"
                                                                            }}></div>
                                                                        </button>
                                                                    ))}
                                                                </div>

                                                                {/* Layout Toggle */}
                                                                <div className="flex items-center gap-1 bg-background rounded-lg border border-border p-1">
                                                                    <button
                                                                        onClick={() => {
                                                                            const newBlocks = [...(data.richContent || [])];
                                                                            const target = newBlocks.find(b => b.id === block.id);
                                                                            if (target) {
                                                                                target.style = { ...target.style, layout: "normal" };
                                                                                setData({ ...data, richContent: newBlocks });
                                                                            }
                                                                        }}
                                                                        className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${!block.style?.layout || block.style?.layout === "normal" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-muted-foreground hover:bg-muted"}`}
                                                                    >
                                                                        Standard
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            const newBlocks = [...(data.richContent || [])];
                                                                            const target = newBlocks.find(b => b.id === block.id);
                                                                            if (target) {
                                                                                target.style = { ...target.style, layout: "wide" };
                                                                                setData({ ...data, richContent: newBlocks });
                                                                            }
                                                                        }}
                                                                        className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${block.style?.layout === "wide" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-muted-foreground hover:bg-muted"}`}
                                                                    >
                                                                        Wide
                                                                    </button>
                                                                </div>

                                                                {/* Aspect Ratio Toggle */}
                                                                <div className="flex items-center gap-1 bg-background rounded-lg border border-border p-1">
                                                                    <button
                                                                        onClick={() => {
                                                                            const newBlocks = [...(data.richContent || [])];
                                                                            const target = newBlocks.find(b => b.id === block.id);
                                                                            if (target) {
                                                                                target.style = { ...target.style, aspectRatio: "cover" };
                                                                                setData({ ...data, richContent: newBlocks });
                                                                            }
                                                                        }}
                                                                        className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${!block.style?.aspectRatio || block.style?.aspectRatio === "cover" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-muted-foreground hover:bg-muted"}`}
                                                                    >
                                                                        Crop
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            const newBlocks = [...(data.richContent || [])];
                                                                            const target = newBlocks.find(b => b.id === block.id);
                                                                            if (target) {
                                                                                target.style = { ...target.style, aspectRatio: "auto" };
                                                                                setData({ ...data, richContent: newBlocks });
                                                                            }
                                                                        }}
                                                                        className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${block.style?.aspectRatio === "auto" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-muted-foreground hover:bg-muted"}`}
                                                                    >
                                                                        Auto
                                                                    </button>
                                                                </div>

                                                                <div className="flex-1 flex flex-col gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-bold text-muted-foreground whitespace-nowrap w-12">Width</span>
                                                                        <div className="flex items-center gap-1">
                                                                            {[25, 50, 75, 100].map(w => (
                                                                                <button
                                                                                    key={w}
                                                                                    onClick={() => {
                                                                                        const newBlocks = [...(data.richContent || [])];
                                                                                        const target = newBlocks.find(b => b.id === block.id);
                                                                                        if (target) {
                                                                                            target.style = { ...target.style, width: w };
                                                                                            setData({ ...data, richContent: newBlocks });
                                                                                        }
                                                                                    }}
                                                                                    className={`px-2 py-1 text-xs rounded border ${block.style?.width === w || (!block.style?.width && w === 100) ? "bg-blue-600 text-white border-blue-600" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}
                                                                                >
                                                                                    {w === 25 ? "S" : w === 50 ? "M" : w === 75 ? "L" : "Full"}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <input
                                                                        type="range"
                                                                        min="10" max="100" step="10"
                                                                        value={block.style?.width || 100}
                                                                        onChange={(e) => {
                                                                            const val = parseInt(e.target.value);
                                                                            const newBlocks = [...(data.richContent || [])];
                                                                            const target = newBlocks.find(b => b.id === block.id);
                                                                            if (target) {
                                                                                target.style = { ...target.style, width: val };
                                                                                setData({ ...data, richContent: newBlocks });
                                                                            }
                                                                        }}
                                                                        className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-blue-600"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {block.type === "double_image" && (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <div className="text-xs font-bold text-muted-foreground mb-1 uppercase">Left Image</div>
                                                            <MediaInput
                                                                value={block.content.split("|||")[0] || ""}
                                                                onChange={(val) => {
                                                                    const parts = block.content.split("|||");
                                                                    const right = parts[1] || "";
                                                                    updateBlock(block.id, `${val}|||${right}`);
                                                                }}
                                                                placeholder="Left Image"
                                                            />
                                                            <div className="mt-2 h-24 rounded-lg bg-muted border border-border overflow-hidden">
                                                                {block.content.split("|||")[0] ? (
                                                                    <img
                                                                        src={block.content.split("|||")[0]}
                                                                        alt="Left Preview"
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Image</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold text-muted-foreground mb-1 uppercase">Right Image</div>
                                                            <MediaInput
                                                                value={block.content.split("|||")[1] || ""}
                                                                onChange={(val) => {
                                                                    const parts = block.content.split("|||");
                                                                    const left = parts[0] || "";
                                                                    updateBlock(block.id, `${left}|||${val}`);
                                                                }}
                                                                placeholder="Right Image"
                                                            />
                                                            <div className="mt-2 h-24 rounded-lg bg-muted border border-border overflow-hidden">
                                                                {block.content.split("|||")[1] ? (
                                                                    <img
                                                                        src={block.content.split("|||")[1]}
                                                                        alt="Right Preview"
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Image</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground text-center">These two images will be displayed side-by-side.</p>

                                                    {/* Double Image Controls */}
                                                    <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/30 rounded-lg border border-border mt-2">
                                                        {/* Layout Toggle */}
                                                        <div className="flex items-center gap-1 bg-background rounded-lg border border-border p-1">
                                                            <button
                                                                onClick={() => {
                                                                    const newBlocks = [...(data.richContent || [])];
                                                                    const target = newBlocks.find(b => b.id === block.id);
                                                                    if (target) {
                                                                        target.style = { ...target.style, layout: "normal" };
                                                                        setData({ ...data, richContent: newBlocks });
                                                                    }
                                                                }}
                                                                className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${!block.style?.layout || block.style?.layout === "normal" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-muted-foreground hover:bg-muted"}`}
                                                            >
                                                                Standard
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const newBlocks = [...(data.richContent || [])];
                                                                    const target = newBlocks.find(b => b.id === block.id);
                                                                    if (target) {
                                                                        target.style = { ...target.style, layout: "wide" };
                                                                        setData({ ...data, richContent: newBlocks });
                                                                    }
                                                                }}
                                                                className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${block.style?.layout === "wide" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-muted-foreground hover:bg-muted"}`}
                                                            >
                                                                Wide
                                                            </button>
                                                        </div>

                                                        {/* Aspect Ratio Toggle */}
                                                        <div className="flex items-center gap-1 bg-background rounded-lg border border-border p-1">
                                                            <button
                                                                onClick={() => {
                                                                    const newBlocks = [...(data.richContent || [])];
                                                                    const target = newBlocks.find(b => b.id === block.id);
                                                                    if (target) {
                                                                        target.style = { ...target.style, aspectRatio: "cover" };
                                                                        setData({ ...data, richContent: newBlocks });
                                                                    }
                                                                }}
                                                                className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${!block.style?.aspectRatio || block.style?.aspectRatio === "cover" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-muted-foreground hover:bg-muted"}`}
                                                            >
                                                                Crop
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const newBlocks = [...(data.richContent || [])];
                                                                    const target = newBlocks.find(b => b.id === block.id);
                                                                    if (target) {
                                                                        target.style = { ...target.style, aspectRatio: "auto" };
                                                                        setData({ ...data, richContent: newBlocks });
                                                                    }
                                                                }}
                                                                className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${block.style?.aspectRatio === "auto" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-muted-foreground hover:bg-muted"}`}
                                                            >
                                                                Auto
                                                            </button>
                                                        </div>

                                                        {/* Width Controls */}
                                                        <div className="flex-1 flex flex-col gap-2 min-w-[200px]">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-muted-foreground whitespace-nowrap w-12">Width</span>
                                                                <div className="flex items-center gap-1">
                                                                    {[25, 50, 75, 100].map(w => (
                                                                        <button
                                                                            key={w}
                                                                            onClick={() => {
                                                                                const newBlocks = [...(data.richContent || [])];
                                                                                const target = newBlocks.find(b => b.id === block.id);
                                                                                if (target) {
                                                                                    target.style = { ...target.style, width: w };
                                                                                    setData({ ...data, richContent: newBlocks });
                                                                                }
                                                                            }}
                                                                            className={`px-2 py-1 text-xs rounded border ${block.style?.width === w || (!block.style?.width && w === 100) ? "bg-blue-600 text-white border-blue-600" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}
                                                                        >
                                                                            {w === 25 ? "S" : w === 50 ? "M" : w === 75 ? "L" : "Full"}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="10" max="100" step="10"
                                                                value={block.style?.width || 100}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value);
                                                                    const newBlocks = [...(data.richContent || [])];
                                                                    const target = newBlocks.find(b => b.id === block.id);
                                                                    if (target) {
                                                                        target.style = { ...target.style, width: val };
                                                                        setData({ ...data, richContent: newBlocks });
                                                                    }
                                                                }}
                                                                className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-blue-600"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                                    <p>No content blocks yet.</p>
                                    <p className="text-sm">Click the buttons above to start adding content to the full About page.</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="p-4 bg-muted/20 border-t border-border text-center">
                        <button onClick={() => addBlock("paragraph")} className="text-sm text-blue-500 font-medium hover:text-blue-600 flex items-center justify-center gap-1 mx-auto">
                            <Plus className="w-4 h-4" /> Add Paragraph Block
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Maximized Editor Portal/Modal */}
            <AnimatePresence>
                {expandedBlockId && expandedBlock && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-4xl h-[80vh] bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-blue-500" />
                                    <span className="font-bold text-foreground">Editing Paragraph</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setExpandedBlockId(null)}
                                        className="p-2 hover:bg-muted rounded-full border border-transparent hover:border-border transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 p-6 overflow-hidden bg-background">
                                <ReactQuill
                                    theme="snow"
                                    value={expandedBlock.content}
                                    onChange={(content) => updateBlock(expandedBlock.id, content)}
                                    modules={modules}
                                    formats={formats}
                                    className="h-full"
                                    style={{ height: '90%' }}
                                />
                            </div>

                            <div className="p-4 border-t border-border bg-card flex justify-end">
                                <button
                                    onClick={() => setExpandedBlockId(null)}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center gap-2"
                                >
                                    <Check className="w-4 h-4" /> Done
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
