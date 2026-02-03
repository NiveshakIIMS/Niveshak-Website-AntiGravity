"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import QRCode from "qrcode";
import { Copy, Check, ShieldCheck, Loader2, AlertTriangle, X } from "lucide-react";

interface MFAEnrollmentProps {
    onEnrollmentComplete: () => void;
    onCancel: () => void;
}

export default function MFAEnrollment({ onEnrollmentComplete, onCancel }: MFAEnrollmentProps) {
    const [factorId, setFactorId] = useState<string>("");
    const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
    const [secret, setSecret] = useState<string>("");
    const [verifyCode, setVerifyCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);

    // Prevent double-execution in Strict Mode
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const setupMFA = async () => {
            try {

                // 1. Cleanup ALL existing TOTP factors to ensure fresh setup
                const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
                if (listError) throw listError;

                if (factors.totp.length > 0) {
                    for (const factor of factors.totp) {
                        try {
                            await supabase.auth.mfa.unenroll({ factorId: factor.id });
                        } catch (e) {
                            console.warn("Retrying cleanup for factor:", factor.id);
                        }
                    }
                }

                // 2. Enroll new factor with unique name (ms precision)
                const uniqueName = `Niveshak Admin (${Date.now()})`;
                const { data, error } = await supabase.auth.mfa.enroll({
                    factorType: 'totp',
                    friendlyName: uniqueName,
                });

                if (error) throw error;

                setFactorId(data.id);
                setSecret(data.totp.secret);

                // Generate QR Code from the URI (not the SVG string)
                const qrUrl = await QRCode.toDataURL(data.totp.uri, { errorCorrectionLevel: 'L' });
                setQrCodeUrl(qrUrl);
            } catch (err) {
                console.error("MFA Setup Error:", err);
                const message = err instanceof Error ? err.message : "Failed to start MFA setup.";
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        setupMFA();
    }, []);

    const handleVerify = async () => {
        if (verifyCode.length < 6) return;
        setVerifying(true);
        setError("");

        try {
            const { error } = await supabase.auth.mfa.challengeAndVerify({
                factorId,
                code: verifyCode,
            });

            if (error) {
                setError(error.message);
                return;
            }

            onEnrollmentComplete();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Verification failed";
            setError(message);
        } finally {
            setVerifying(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p>Generating secret key...</p>
            </div>
        );
    }

    if (error && !qrCodeUrl) {
        return (
            <div className="p-6 text-center">
                <div className="bg-red-100 text-red-600 p-3 rounded-full w-fit mx-auto mb-4">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-red-600 mb-2">Setup Failed</h3>
                <p className="text-sm text-foreground mb-4">{error}</p>
                <button onClick={onCancel} className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-foreground font-medium">
                    Close
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-blue-500" />
                    Setup 2FA
                </h2>
                <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-6">
                <div className="bg-muted/30 p-4 rounded-xl text-sm border border-border">
                    <p className="mb-2 font-medium">1. Scan this QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, etc.)</p>
                    <div className="flex justify-center bg-white p-4 rounded-lg border border-border">
                        {qrCodeUrl && <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />}
                    </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-xl text-sm border border-border">
                    <p className="mb-2 font-medium">Or enter this code manually:</p>
                    <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-input font-mono text-xs">
                        <span className="break-all">{secret}</span>
                        <button
                            onClick={() => navigator.clipboard.writeText(secret)}
                            className="ml-2 p-1.5 hover:bg-muted rounded text-blue-500"
                            title="Copy Secret"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-muted-foreground mb-2">2. Enter the 6-digit code</label>
                    <input
                        type="text"
                        maxLength={6}
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full text-center text-2xl tracking-widest p-3 rounded-xl bg-background border border-input focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="000 000"
                    />
                    {error && <p className="text-red-500 text-xs mt-2 text-center font-medium bg-red-50 dark:bg-red-900/10 p-2 rounded">{error}</p>}
                </div>

                <button
                    onClick={handleVerify}
                    disabled={verifyCode.length !== 6 || verifying}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                    {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Enable 2FA"}
                </button>
            </div>
        </div>
    );
}
