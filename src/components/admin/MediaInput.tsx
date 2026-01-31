"use client";

import { useState } from "react";
import { Link as LinkIcon, Upload, Image as ImageIcon, Check } from "lucide-react";

interface MediaInputProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function MediaInput({ label, value, onChange, placeholder = "Image URL or Upload" }: MediaInputProps) {
    const [mode, setMode] = useState<"link" | "upload">("link");
    const [isCompressing, setIsCompressing] = useState(false);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsCompressing(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 2500; // Increased to 2.5K resolution
                const MAX_HEIGHT = 2500;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Compress to JPEG 0.9 (High Quality)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                onChange(dataUrl);
                setIsCompressing(false);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-2">
            {label && <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</label>}

            <div className="bg-muted/30 p-1.5 rounded-lg border border-border flex gap-1 mb-2 w-fit">
                <button
                    onClick={() => setMode("link")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === "link" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                    <LinkIcon className="w-4 h-4" /> Link
                </button>
                <button
                    onClick={() => setMode("upload")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === "upload" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                    <Upload className="w-4 h-4" /> Upload
                </button>
            </div>

            {mode === "link" ? (
                <div className="relative">
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full p-3 pl-10 rounded-lg bg-background border border-input text-foreground focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder={placeholder}
                    />
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors group relative overflow-hidden">
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    {isCompressing ? (
                        <div className="flex flex-col items-center animate-pulse">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                            <span className="text-sm text-blue-500 font-medium">Compressing...</span>
                        </div>
                    ) : (
                        <>
                            <div className="p-3 bg-muted rounded-full group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors mb-2">
                                <Upload className="w-6 h-6 text-muted-foreground group-hover:text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-foreground">Click to Upload Device Image</span>
                            <span className="text-xs text-muted-foreground mt-1">Auto-optimized for web (Max 1200px)</span>
                        </>
                    )}

                    {/* Tiny success indicator if value is a data URL */}
                    {value.startsWith("data:image") && !isCompressing && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-lg">
                            <Check className="w-3 h-3" />
                        </div>
                    )}
                </label>
            )}

            {/* Preview if Value Exists */}
            {value && (
                <div className="mt-2 h-20 w-20 rounded-lg border border-border overflow-hidden bg-muted relative group">
                    <img src={value} alt="Preview" className="w-full h-full object-cover" />
                    <button
                        onClick={() => onChange("")}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white text-xs font-medium"
                    >
                        Remove
                    </button>
                </div>
            )}
        </div>
    );
}
