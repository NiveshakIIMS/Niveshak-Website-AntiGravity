"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, User, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import AdminDashboard from "@/components/admin/AdminDashboard";
import MFAVerification from "@/components/admin/MFAVerification";

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [needsMFA, setNeedsMFA] = useState(false);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Helper to check session level
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setIsAuthenticated(false);
            setNeedsMFA(false);
            setLoading(false);
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        // Check if user has enrolled factors
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const hasFactors = factors && factors.totp.length > 0;

        // Use Supabase 'aal' (Authenticator Assurance Level) claim from Refresh Token if available, 
        // or just rely on 'amr' (Authentication Methods References) array in session.user.
        // A simpler check: if has factors, enforce verification unless already verified in this session.
        // But the best way is 'mfa.getAuthenticatorAssuranceLevel()'.

        const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (hasFactors && level && level.currentLevel === 'aal1') {
            // Logged in with password (aal1), but needs MFA (aal2)
            setNeedsMFA(true);
            setIsAuthenticated(false);
        } else {
            // Either no factors needed, or already at aal2
            setNeedsMFA(false);
            setIsAuthenticated(true);
        }
        setLoading(false);
    };

    useEffect(() => {
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!session) {
                setIsAuthenticated(false);
                setNeedsMFA(false);
            } else {
                // Re-evaluate security level on any auth change
                // Simple delay to ensure session is propagated? No, await/async inside hook is tricky.
                // We call the helper.
                checkSession();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setError("");

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setIsLoggingIn(false);
        }
        // Success will filter to onAuthStateChange -> checkSession
    };

    const handleMFASuccess = () => {
        setNeedsMFA(false);
        setIsAuthenticated(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (isAuthenticated) {
        return <AdminDashboard setIsAuthenticated={setIsAuthenticated} />;
    }

    if (needsMFA) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-8"
                >
                    <MFAVerification onVerifySuccess={handleMFASuccess} />
                    <div className="mt-8 text-center">
                        <button
                            onClick={() => supabase.auth.signOut()}
                            className="text-sm text-red-500 hover:underline"
                        >
                            Log Out / Cancel
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-32 px-4 flex items-center justify-center bg-background bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-8"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex p-4 rounded-full bg-blue-500/10 mb-4">
                        <Lock className="w-8 h-8 text-blue-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Admin Login</h1>
                    <p className="text-muted-foreground text-sm mt-2">
                        Enter your credentials to access the dashboard
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-foreground placeholder-gray-400 transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-foreground placeholder-gray-400 transition-all"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-lg hover:shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoggingIn ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Signing In...
                            </>
                        ) : (
                            "Sign In"
                        )}
                    </button>

                    <div className="mt-6 text-center">
                        <Link href="/" className="text-sm text-muted-foreground hover:text-blue-500 transition-colors inline-flex items-center gap-2">
                            &larr; Back to Homepage
                        </Link>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

