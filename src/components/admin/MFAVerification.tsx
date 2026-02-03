"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ShieldCheck, Loader2, ArrowRight } from "lucide-react";

interface MFAVerificationProps {
    onVerifySuccess: () => void;
}

export default function MFAVerification({ onVerifySuccess }: MFAVerificationProps) {
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [verifying, setVerifying] = useState(false);

    const handleVerify = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (code.length < 6) return;

        setVerifying(true);
        setError("");

        try {
            // List factors to get the TOTP factor ID
            const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
            if (factorsError) throw factorsError;

            const totpFactor = factors.totp[0]; // Assuming one TOTP factor for now
            if (!totpFactor) {
                throw new Error("No MFA factor found.");
            }

            const { data, error } = await supabase.auth.mfa.challengeAndVerify({
                factorId: totpFactor.id,
                code: code,
            });

            if (error) throw error;

            onVerifySuccess();
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : "Verification failed. Invalid code.";
            setError(message);
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto space-y-6">
            <div className="text-center">
                <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Two-Factor Auth</h2>
                <p className="text-muted-foreground mt-2 text-sm">Enter the code from your authenticator app.</p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
                <div>
                    <input
                        type="text"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full text-center text-3xl tracking-[0.5em] font-mono p-4 rounded-xl bg-background border border-input focus:ring-2 focus:ring-blue-500 outline-none transition-shadow placeholder:tracking-normal"
                        placeholder="000 000"
                        autoFocus
                    />
                    {error && <p className="text-red-500 text-xs mt-3 text-center font-bold bg-red-50 dark:bg-red-900/10 p-2 rounded">{error}</p>}
                </div>

                <button
                    type="submit"
                    disabled={code.length !== 6 || verifying}
                    className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                    {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify <ArrowRight className="w-4 h-4 block" /></>}
                </button>
            </form>
        </div>
    );
}
