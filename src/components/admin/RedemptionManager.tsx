/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, BookOpen, ArrowUp, ArrowDown, X, Link as LinkIcon } from "lucide-react";
import { dataService, RedemptionCard } from "@/services/dataService";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from 'next/dynamic';
import AdminButton from "./AdminButton";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

export default function RedemptionManager() {
    const [cards, setCards] = useState<RedemptionCard[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<RedemptionCard | null>(null);
    const [redeemLink, setRedeemLink] = useState("");
    const [linkSaving, setLinkSaving] = useState(false);

    // Quill Modules
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'indent': '-1' }, { 'indent': '+1' }],
            ['link'],
            ['clean']
        ],
    };

    const formats = [
        'header', 'size',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list', 'indent',
        'link'
    ];

    const loadCards = async () => {
        const data = await dataService.getRedemptionCards();
        setCards(data);
    };

    useEffect(() => {
        loadCards();
        dataService.getRedemptionLink().then(setRedeemLink);
    }, []);

    const handleSaveLink = async () => {
        setLinkSaving(true);
        try {
            await dataService.saveRedemptionLink(redeemLink);
            alert("Redeem link saved!");
        } catch (err) {
            console.error(err);
            alert("Failed to save link");
        }
        setLinkSaving(false);
    };

    const handleSave = async () => {
        if (!formData) return;
        try {
            await dataService.saveRedemptionCard(formData);
            await loadCards();
            setEditingId(null);
            setFormData(null);
            alert("Card saved successfully!");
        } catch (err) {
            console.error("Save error", err);
            alert("Failed to save card");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this card?")) return;
        try {
            await dataService.deleteRedemptionCard(id);
            await loadCards();
        } catch (err) {
            console.error("Delete error", err);
            alert("Failed to delete card");
        }
    };

    const startEdit = (card: RedemptionCard) => {
        setFormData({ ...card });
        setEditingId(card.id);
    };

    const startNew = () => {
        const newCard: RedemptionCard = {
            id: crypto.randomUUID(),
            title: "",
            content: "",
            displayOrder: cards.length
        };
        setFormData(newCard);
        setEditingId("new");
    };

    const moveCard = async (index: number, direction: -1 | 1) => {
        if (index + direction < 0 || index + direction >= cards.length) return;

        const newCards = [...cards];
        [newCards[index], newCards[index + direction]] = [newCards[index + direction], newCards[index]];

        // Update display orders
        for (let i = 0; i < newCards.length; i++) {
            newCards[i].displayOrder = i;
            await dataService.saveRedemptionCard(newCards[i]);
        }
        setCards(newCards);
    };

    return (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 bg-background min-h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-500/10 rounded-xl">
                        <BookOpen className="w-7 h-7 text-purple-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Redemption Content</h2>
                        <p className="text-muted-foreground text-sm">Manage redemption information flashcards</p>
                    </div>
                </div>
                <AdminButton
                    onClick={startNew}
                    icon={<Plus className="w-5 h-5" />}
                >
                    Add Card
                </AdminButton>
            </div>

            {/* Redeem Link Editor */}
            <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                    <LinkIcon className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-foreground">Redeem Now Button Link</h3>
                </div>
                <div className="flex gap-3">
                    <input
                        type="url"
                        value={redeemLink}
                        onChange={(e) => setRedeemLink(e.target.value)}
                        placeholder="https://forms.google.com/..."
                        className="flex-1 p-3 rounded-lg bg-muted border border-border focus:ring-2 focus:ring-accent outline-none text-foreground"
                    />
                    <AdminButton
                        onClick={handleSaveLink}
                        isLoading={linkSaving}
                        icon={<Save className="w-4 h-4" />}
                    >
                        Save Link
                    </AdminButton>
                </div>
                <p className="text-xs text-muted-foreground mt-2">This link will be used for the "Redeem Now" button on the redemption page.</p>
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingId && formData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={() => { setEditingId(null); setFormData(null); }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-card rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-border shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-foreground">
                                    {editingId === "new" ? "Add New Card" : "Edit Card"}
                                </h3>
                                <button onClick={() => { setEditingId(null); setFormData(null); }} className="p-2 hover:bg-muted rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Card Title</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full p-3 rounded-lg bg-muted border border-border focus:ring-2 focus:ring-purple-500 outline-none text-foreground"
                                        placeholder="Enter card title..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Content (Rich Text)</label>
                                    <div className="rounded-lg overflow-hidden border border-border bg-background text-foreground">
                                        <ReactQuill
                                            theme="snow"
                                            value={formData.content}
                                            onChange={(value) => setFormData({ ...formData, content: value })}
                                            modules={modules}
                                            formats={formats}
                                            className="min-h-[250px]"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Supports headers, bold, italic, colors, links, and lists.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Display Order</label>
                                    <input
                                        type="number"
                                        value={formData.displayOrder}
                                        onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                                        className="w-24 p-3 rounded-lg bg-muted border border-border focus:ring-2 focus:ring-purple-500 outline-none text-foreground"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                                <AdminButton
                                    onClick={() => { setEditingId(null); setFormData(null); }}
                                    variant="secondary"
                                >
                                    Cancel
                                </AdminButton>
                                <AdminButton
                                    onClick={handleSave}
                                    variant="success"
                                    icon={<Save className="w-4 h-4" />}
                                >
                                    Save Card
                                </AdminButton>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cards List */}
            <div className="space-y-4">
                {cards.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-xl">No redemption cards yet</p>
                        <p className="text-sm">Click "Add Card" to create your first card</p>
                    </div>
                ) : (
                    cards.map((card, idx) => (
                        <motion.div
                            key={card.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-500 text-sm font-bold shrink-0">
                                            {idx + 1}
                                        </span>
                                        <h3 className="font-bold text-lg text-foreground truncate">{card.title || "Untitled"}</h3>
                                    </div>
                                    <div
                                        className="text-sm text-muted-foreground line-clamp-2 prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: card.content.substring(0, 200) + (card.content.length > 200 ? '...' : '') }}
                                    />
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <AdminButton
                                        onClick={() => moveCard(idx, -1)}
                                        disabled={idx === 0}
                                        size="sm"
                                        variant="secondary"
                                        icon={<ArrowUp className="w-4 h-4" />}
                                        title="Move Up"
                                    />
                                    <AdminButton
                                        onClick={() => moveCard(idx, 1)}
                                        disabled={idx === cards.length - 1}
                                        size="sm"
                                        variant="secondary"
                                        icon={<ArrowDown className="w-4 h-4" />}
                                        title="Move Down"
                                    />
                                    <AdminButton
                                        onClick={() => startEdit(card)}
                                        size="sm"
                                        variant="secondary"
                                        icon={<BookOpen className="w-4 h-4" />}
                                        title="Edit"
                                    />
                                    <AdminButton
                                        onClick={() => handleDelete(card.id)}
                                        size="sm"
                                        variant="danger"
                                        icon={<Trash2 className="w-4 h-4" />}
                                        title="Delete"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
