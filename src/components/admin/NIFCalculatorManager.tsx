/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, Save, Calculator, AlertCircle, Edit3 } from "lucide-react";
import { dataService, NAVData, NIFInvestment } from "@/services/dataService";
import { motion } from "framer-motion";

export default function NIFCalculatorManager() {
    const [investments, setInvestments] = useState<NIFInvestment[]>([]);
    const [navData, setNavData] = useState<NAVData[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form state
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [investmentDate, setInvestmentDate] = useState<string>("");
    const [navValue, setNavValue] = useState<string>("");
    const [autofillNote, setAutofillNote] = useState<string>("");
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [successMessage, setSuccessMessage] = useState<string>("");

    // Load configurations and historical NAV
    useEffect(() => {
        const loadData = async () => {
            try {
                const [invs, navs] = await Promise.all([
                    dataService.getNIFInvestments(),
                    dataService.getNAVData()
                ]);
                setInvestments(invs);
                setNavData(navs);
            } catch (err: any) {
                console.error("Failed to load calculator configs:", err);
                setError("Failed to load historical data from Supabase.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Perform NAV lookup when date changes
    useEffect(() => {
        if (!investmentDate || navData.length === 0) {
            setAutofillNote("");
            return;
        }

        // Try exact match
        const exactMatch = navData.find(d => d.date === investmentDate);
        if (exactMatch) {
            setNavValue(exactMatch.value.toFixed(4));
            setAutofillNote("Exact matching NAV found for this date.");
            return;
        }

        // If no exact match, find closest date
        const targetTime = new Date(investmentDate).getTime();
        let closestEntry: NAVData | null = null;
        let minDiff = Infinity;

        for (const entry of navData) {
            const entryTime = new Date(entry.date).getTime();
            const diff = Math.abs(targetTime - entryTime);
            if (diff < minDiff) {
                minDiff = diff;
                closestEntry = entry;
            }
        }

        if (closestEntry) {
            setNavValue(closestEntry.value.toFixed(4));
            const formattedDate = new Date(closestEntry.date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            setAutofillNote(`Exact date not found. Autofilled with closest NAV (₹${closestEntry.value.toFixed(2)}) on ${formattedDate}`);
        } else {
            setAutofillNote("No historical NAV records found to auto-fill.");
        }
    }, [investmentDate, navData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        if (!selectedYear || !investmentDate || !navValue) {
            setError("All fields are required.");
            return;
        }

        const yearNum = parseInt(selectedYear);
        const navNum = Math.round(parseFloat(navValue) * 10000) / 10000;

        if (isNaN(yearNum) || yearNum < 2000) {
            setError("Please enter a valid investment year.");
            return;
        }

        if (isNaN(navNum) || navNum <= 0) {
            setError("NAV must be a positive number.");
            return;
        }

        const newInv: NIFInvestment = {
            year: yearNum,
            investmentDate,
            navValue: navNum
        };

        try {
            await dataService.saveNIFInvestment(newInv);
            
            // Refresh list
            const updated = await dataService.getNIFInvestments();
            setInvestments(updated);
            
            // Reset form
            if (!isEditing) {
                setSelectedYear("");
                setInvestmentDate("");
                setNavValue("");
                setAutofillNote("");
            }
            
            setSuccessMessage(isEditing ? "Investment configuration updated successfully!" : "Investment configuration added successfully!");
            setIsEditing(false);
        } catch (err: any) {
            console.error("Save Investment Error:", err);
            setError(`Failed to save configuration: ${err.message || "Unknown error"}`);
        }
    };

    const handleEdit = (inv: NIFInvestment) => {
        setSelectedYear(inv.year.toString());
        setInvestmentDate(inv.investmentDate);
        setNavValue(inv.navValue.toString());
        setIsEditing(true);
        setError("");
        setSuccessMessage("");
    };

    const handleDelete = async (year: number) => {
        if (!confirm(`Are you sure you want to delete the configuration for year ${year}?`)) return;

        setError("");
        setSuccessMessage("");

        try {
            await dataService.deleteNIFInvestment(year);
            setInvestments(prev => prev.filter(inv => inv.year !== year));
            setSuccessMessage(`Configuration for year ${year} deleted.`);
            
            if (isEditing && selectedYear === year.toString()) {
                setSelectedYear("");
                setInvestmentDate("");
                setNavValue("");
                setAutofillNote("");
                setIsEditing(false);
            }
        } catch (err: any) {
            console.error("Delete Investment Error:", err);
            setError(`Failed to delete configuration: ${err.message || "Unknown error"}`);
        }
    };

    // Generate years from 2022 to current year + 1
    const availableYears: number[] = [];
    const currentYear = new Date().getFullYear();
    for (let y = 2022; y <= currentYear + 1; y++) {
        availableYears.push(y);
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[300px]">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 bg-background min-h-full">
            <div className="flex justify-between items-center border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        NIF Calculator Configuration
                    </h2>
                    <p className="text-muted-foreground mt-1">Configure NIF annual investment dates and NAV values.</p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {successMessage && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-600 rounded-xl flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-600 text-xs font-bold">✓</div>
                    <span>{successMessage}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Form column */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="bg-card p-6 rounded-2xl border border-border shadow-xl space-y-6 lg:col-span-1"
                >
                    <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                        {isEditing ? <Edit3 className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-blue-500" />}
                        {isEditing ? "Edit Config" : "Add Investment Date"}
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Investment Year</label>
                            <select
                                disabled={isEditing}
                                value={selectedYear}
                                onChange={e => setSelectedYear(e.target.value)}
                                className="w-full p-3 border border-input rounded-xl bg-background text-foreground focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:bg-muted"
                                required
                            >
                                <option value="">Select Year</option>
                                {availableYears.map(y => (
                                    <option key={y} value={y} disabled={investments.some(inv => inv.year === y) && !isEditing}>
                                        {y} {investments.some(inv => inv.year === y) ? "(Configured)" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Date of Investment</label>
                            <input
                                type="date"
                                value={investmentDate}
                                onChange={e => setInvestmentDate(e.target.value)}
                                className="w-full p-3 border border-input rounded-xl bg-background text-foreground focus:ring-2 focus:ring-blue-500 outline-none transition-all font-sans"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase">NAV Value (₹) - Auto filled</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-muted-foreground font-semibold">₹</span>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={navValue}
                                    onChange={e => setNavValue(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-8 p-3 border border-input rounded-xl bg-background text-foreground focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                                    required
                                />
                            </div>
                            {autofillNote && (
                                <p className={`text-[10px] mt-1 ml-1 leading-relaxed ${autofillNote.includes("Exact") ? "text-green-500 font-semibold" : "text-amber-500"}`}>
                                    {autofillNote}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-2 pt-2">
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setSelectedYear("");
                                        setInvestmentDate("");
                                        setNavValue("");
                                        setAutofillNote("");
                                    }}
                                    className="flex-1 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/80 transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                            >
                                {isEditing ? "Update" : "Save Record"}
                            </button>
                        </div>
                    </form>
                </motion.div>

                {/* List column */}
                <motion.div 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.1 }}
                    className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col lg:col-span-2"
                >
                    <h3 className="font-bold text-lg text-foreground flex items-center gap-2 mb-6 pb-4 border-b border-border">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        Configured Years
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">{investments.length} configured</span>
                    </h3>

                    <div className="overflow-y-auto space-y-2 pr-1 max-h-[500px] custom-scrollbar">
                        {investments.length === 0 ? (
                            <p className="text-muted-foreground text-sm text-center py-20">No investment dates configured yet.</p>
                        ) : (
                            investments.map(inv => (
                                <div key={inv.year} className="flex items-center justify-between p-4 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border group">
                                    <div className="flex flex-col space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg text-foreground">Year {inv.year}</span>
                                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-xs font-semibold">
                                                Investment
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Date: {new Date(inv.investmentDate).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-blue-600 dark:text-blue-400 font-bold text-lg">
                                            ₹ {inv.navValue.toFixed(4)}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={() => handleEdit(inv)} 
                                                className="p-2 text-muted-foreground hover:text-blue-500 rounded-lg hover:bg-background transition-colors"
                                                title="Edit"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(inv.year)} 
                                                className="p-2 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-background transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
