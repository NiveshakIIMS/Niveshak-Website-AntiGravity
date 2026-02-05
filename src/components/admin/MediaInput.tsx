"use client";

import { useState, useCallback } from "react";
import { Link as LinkIcon, Upload, Check, X, ZoomIn, Loader2 } from "lucide-react";
import Cropper from "react-easy-crop";
import { Area } from "react-easy-crop";
import { uploadService } from "@/services/uploadService";

interface MediaInputProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    folder?: string;
}

export default function MediaInput({ label, value, onChange, placeholder = "Image URL or Upload", folder = "uploads" }: MediaInputProps) {
    const [mode, setMode] = useState<"link" | "upload">("link");
    const [croppingSrc, setCroppingSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [aspect, setAspect] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            setCroppingSrc(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener("load", () => resolve(image));
            image.addEventListener("error", (error) => reject(error));
            image.setAttribute("crossOrigin", "anonymous");
            image.src = url;
        });

    const getCroppedImg = async (imageSrc: string, pixelCrop: Area) => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
            return null;
        }

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        // Resize if too large (Max 1200px)
        const MAX_SIZE = 1200;
        let finalCanvas = canvas;
        if (canvas.width > MAX_SIZE || canvas.height > MAX_SIZE) {
            const tempCanvas = document.createElement("canvas");
            let width = canvas.width;
            let height = canvas.height;

            if (width > height) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
            } else {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
            }

            tempCanvas.width = width;
            tempCanvas.height = height;
            tempCanvas.getContext("2d")?.drawImage(canvas, 0, 0, width, height);
            finalCanvas = tempCanvas;
        }

        return finalCanvas.toDataURL("image/jpeg", 0.9);
    };

    const handleSaveCrop = async () => {
        if (!croppingSrc || !croppedAreaPixels) return;
        try {
            setIsProcessing(true);
            const croppedImage = await getCroppedImg(croppingSrc, croppedAreaPixels);
            if (!croppedImage) throw new Error("Could not create image");

            const blob = uploadService.base64ToBlob(croppedImage);
            const file = new File([blob], "image.jpg", { type: "image/jpeg" });

            // Construct path with folder
            const filename = `${folder}/${Date.now()}.jpg`;
            const publicUrl = await uploadService.uploadFile(file, filename);

            onChange(publicUrl);
            setCroppingSrc(null);
            setMode("link"); // Switch back to view mode
        } catch (error) {
            console.error(error);
            alert("Failed to upload image. Please check your connection and secrets.");
        } finally {
            setIsProcessing(false);
        }
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
                <>
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors group relative overflow-hidden">
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        <div className="p-3 bg-muted rounded-full group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors mb-2">
                            <Upload className="w-6 h-6 text-muted-foreground group-hover:text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-foreground">Click to Upload Device Image</span>
                        <span className="text-xs text-muted-foreground mt-1">Images will be cropped to square/preference</span>
                    </label>
                </>
            )}

            {/* Preview */}
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

            {/* Crop Modal */}
            {croppingSrc && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-background w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-card">
                            <h3 className="font-bold text-lg">Crop Image</h3>
                            <button onClick={() => setCroppingSrc(null)} className="p-2 hover:bg-muted rounded-full"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="relative w-full h-[400px] bg-black/50">
                            <Cropper
                                image={croppingSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={aspect}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                objectFit="contain"
                            />
                        </div>

                        <div className="p-6 bg-card border-t border-border space-y-4">
                            {/* Aspect Ratio Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase">Aspect Ratio</label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: "16:9", value: 16 / 9 },
                                        { label: "5:4", value: 5 / 4 },
                                        { label: "1:1", value: 1 },
                                        { label: "4:5", value: 4 / 5 },
                                        { label: "9:16", value: 9 / 16 }
                                    ].map((ratio) => (
                                        <button
                                            key={ratio.label}
                                            onClick={() => setAspect(ratio.value)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${Math.abs(aspect - ratio.value) < 0.01
                                                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                                : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                                                }`}
                                        >
                                            {ratio.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <ZoomIn className="w-5 h-5 text-muted-foreground" />
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full accent-blue-600 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setCroppingSrc(null)}
                                    className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveCrop}
                                    disabled={isProcessing}
                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 flex items-center gap-2"
                                >
                                    {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Check className="w-4 h-4" /> Save & Upload</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
