"use client";

import { useState, useEffect } from "react";
import { dataService, NAVData, NIFInvestment, calculateTradingYears } from "@/services/dataService";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ArrowLeft, Calculator, TrendingUp, TrendingDown, ArrowUpRight, Activity, Calendar, Info, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CalculatorClientProps {
    initialNAVData?: NAVData[];
    initialInvestments?: NIFInvestment[];
}

const findNiftyValueForDate = (dateStr: string, navData: NAVData[]): number | null => {
    if (!dateStr || navData.length === 0) return null;
    const targetTime = new Date(dateStr).getTime();
    
    // Filter to entries that actually have nifty50 values
    const entriesWithNifty = navData.filter(d => d.nifty50 !== undefined && d.nifty50 !== null);
    if (entriesWithNifty.length === 0) return null;

    // Try exact match first
    const exact = entriesWithNifty.find(d => d.date === dateStr);
    if (exact && exact.nifty50) return exact.nifty50 ?? null;

    // Otherwise, find the closest entry in time
    let closestEntry: NAVData | null = null;
    let minDiff = Infinity;
    for (const entry of entriesWithNifty) {
        const diff = Math.abs(new Date(entry.date).getTime() - targetTime);
        if (diff < minDiff) {
            minDiff = diff;
            closestEntry = entry;
        }
    }
    return closestEntry ? (closestEntry.nifty50 ?? null) : null;
};

export default function CalculatorClient({ initialNAVData = [], initialInvestments = [] }: CalculatorClientProps) {
    const [navData, setNavData] = useState<NAVData[]>(initialNAVData);
    const [investments, setInvestments] = useState<NIFInvestment[]>(initialInvestments);

    // Inputs
    const [calcMode, setCalcMode] = useState<"units" | "amount">("amount");
    const [unitsHeld, setUnitsHeld] = useState<string>("");
    const [investedInput, setInvestedInput] = useState<string>("");
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [useCustomDate, setUseCustomDate] = useState<boolean>(false);
    const [customTargetDate, setCustomTargetDate] = useState<string>("");

    // Outputs
    const [tradingDays, setTradingDays] = useState<{ [year: number]: number }>({});
    const [calcResults, setCalcResults] = useState<{
        investedAmount: number;
        currentAmount: number;
        gainsAmount: number;
        cagr: number;
        investmentDate: string;
        investmentNav: number;
        targetDate: string;
        targetNav: number;
        isValid: boolean;
        warning?: string;
        niftyStart: number | null;
        niftyEnd: number | null;
        niftyStartIndexed: number | null;
        niftyEndIndexed: number | null;
        niftyReturn: number | null;
    } | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [navs, invs, days] = await Promise.all([
                    dataService.getNAVData(),
                    dataService.getNIFInvestments(),
                    dataService.getTradingDays()
                ]);
                if (navs && navs.length > 0) setNavData(navs);
                if (invs && invs.length > 0) setInvestments(invs);
                
                const daysObj: { [year: number]: number } = {};
                days.forEach(d => {
                    daysObj[d.year] = d.days;
                });
                setTradingDays(daysObj);
            } catch (err) {
                console.error("Failed to load fresh calculator data:", err);
            }
        };
        load();
    }, []);

    // Get latest available NAV
    const latestNAV = navData.length > 0 
        ? [...navData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] 
        : null;

    // Trigger calculation when inputs change
    useEffect(() => {
        const hasValidUnitsInput = calcMode === "units" && unitsHeld && parseFloat(unitsHeld) > 0;
        const hasValidAmountInput = calcMode === "amount" && investedInput && parseFloat(investedInput) > 0;

        if (!selectedYear || (!hasValidUnitsInput && !hasValidAmountInput)) {
            setCalcResults(null);
            return;
        }

        const yearConfig = investments.find(inv => inv.year.toString() === selectedYear);

        if (!yearConfig) {
            setCalcResults(null);
            return;
        }

        // 1. Determine Target Date & Target NAV
        let finalTargetDate = "";
        let finalTargetNav = 0;
        let warning = "";

        if (useCustomDate && customTargetDate) {
            finalTargetDate = customTargetDate;
            
            // Look up NAV on or before custom date
            const targetTime = new Date(customTargetDate).getTime();
            
            // Check if target date is before investment date
            const investmentTime = new Date(yearConfig.investmentDate).getTime();
            if (targetTime < investmentTime) {
                setCalcResults({
                    investedAmount: 0,
                    currentAmount: 0,
                    gainsAmount: 0,
                    cagr: 0,
                    investmentDate: yearConfig.investmentDate,
                    investmentNav: yearConfig.navValue,
                    targetDate: customTargetDate,
                    targetNav: 0,
                    isValid: false,
                    warning: `Evaluation date cannot be earlier than the investment date (${new Date(yearConfig.investmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}).`,
                    niftyStart: null,
                    niftyEnd: null,
                    niftyStartIndexed: null,
                    niftyEndIndexed: null,
                    niftyReturn: null
                });
                return;
            }

            // Find matching exact NAV or closest on or before
            const exactMatch = navData.find(d => d.date === customTargetDate);
            if (exactMatch) {
                finalTargetNav = exactMatch.value;
            } else {
                let closestEntry: NAVData | null = null;
                let minDiff = Infinity;

                for (const entry of navData) {
                    const entryTime = new Date(entry.date).getTime();
                    const diff = targetTime - entryTime;
                    // Only choose dates on or before targetTime
                    if (diff >= 0 && diff < minDiff) {
                        minDiff = diff;
                        closestEntry = entry;
                    }
                }

                if (closestEntry) {
                    finalTargetNav = closestEntry.value;
                    const formattedClosest = new Date(closestEntry.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    });
                    warning = `NAV was not recorded on ${new Date(customTargetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Used closest available NAV (₹${closestEntry.value.toFixed(1)}) from ${formattedClosest}.`;
                } else {
                    // Fallback to closest overall if none on or before
                    const sortedNavs = [...navData].sort((a, b) => Math.abs(new Date(a.date).getTime() - targetTime) - Math.abs(new Date(b.date).getTime() - targetTime));
                    if (sortedNavs.length > 0) {
                        finalTargetNav = sortedNavs[0].value;
                        finalTargetDate = sortedNavs[0].date;
                        warning = `No NAV records found on or before evaluation date. Used closest available NAV on ${new Date(sortedNavs[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`;
                    }
                }
            }
        } else {
            // Default to latest available NAV
            if (latestNAV) {
                finalTargetDate = latestNAV.date;
                finalTargetNav = latestNAV.value;
            }
        }

        // 2. Calculations
        let investedAmount = 0;
        let currentAmount = 0;

        if (calcMode === "units") {
            const units = parseFloat(unitsHeld);
            investedAmount = units * yearConfig.navValue;
            currentAmount = units * finalTargetNav;
        } else {
            investedAmount = parseFloat(investedInput);
            const units = investedAmount / yearConfig.navValue;
            currentAmount = units * finalTargetNav;
        }

        const gainsAmount = currentAmount - investedAmount;

        // CAGR calculation using trading days count
        const years = calculateTradingYears(yearConfig.investmentDate, finalTargetDate, navData, tradingDays);
        
        let cagr = 0;
        if (years > 0 && yearConfig.navValue > 0) {
            cagr = (Math.pow(finalTargetNav / yearConfig.navValue, 1 / years) - 1) * 100;
        }

        const startNifty = findNiftyValueForDate(yearConfig.investmentDate, navData);
        const endNifty = findNiftyValueForDate(finalTargetDate, navData);
        
        let niftyReturn: number | null = null;
        if (years > 0 && startNifty && endNifty) {
            niftyReturn = (Math.pow(endNifty / startNifty, 1 / years) - 1) * 100;
        }

        // Compute fixed indexation baseline factor from oldest overall DB entry
        const sortedNavData = [...navData]
            .filter(d => d.value !== undefined && d.value !== null && d.nifty50 !== undefined && d.nifty50 !== null)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const baseNAV = sortedNavData.length > 0 ? sortedNavData[0].value : 1;
        const baseNifty = sortedNavData.length > 0 ? sortedNavData[0].nifty50! : 1;
        const indexationFactor = baseNifty !== 0 ? baseNAV / baseNifty : 1;

        const niftyStartIndexed = startNifty ? parseFloat((startNifty * indexationFactor).toFixed(4)) : null;
        const niftyEndIndexed = endNifty ? parseFloat((endNifty * indexationFactor).toFixed(4)) : null;

        setCalcResults({
            investedAmount,
            currentAmount,
            gainsAmount,
            cagr,
            investmentDate: yearConfig.investmentDate,
            investmentNav: yearConfig.navValue,
            targetDate: finalTargetDate,
            targetNav: finalTargetNav,
            isValid: true,
            warning: warning || undefined,
            niftyStart: startNifty,
            niftyEnd: endNifty,
            niftyStartIndexed,
            niftyEndIndexed,
            niftyReturn
        });

    }, [unitsHeld, investedInput, calcMode, selectedYear, useCustomDate, customTargetDate, investments, navData, latestNAV, tradingDays]);

    const formatCurrency = (val: number) => {
        return "₹ " + Number(val.toFixed(2)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <main className="min-h-screen bg-background text-foreground transition-colors">
            
            {/* Header Section */}
            <section className="pt-32 pb-12 px-4 bg-background border-b border-border">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                        NIF Returns <span className="text-accent">Calculator</span>
                    </h1>
                    <p className="text-xl text-muted-foreground mb-6">Estimate returns and performance on your investments</p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-accent hover:underline font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" /> Go back to NIF Dashboard
                    </Link>
                </div>
            </section>

            {/* Main Content Area */}
            <section className="py-16 px-4 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
                    {/* Inputs Card (1 Column) */}
                    <div className="bg-card border border-border p-6 rounded-2xl shadow-lg space-y-6">
                        <div className="flex items-center gap-3 border-b border-border pb-4">
                            <div className="p-2 bg-accent/10 rounded-lg">
                                <Calculator className="w-6 h-6 text-accent" />
                            </div>
                            <h2 className="text-xl font-bold text-foreground">Calculator Inputs</h2>
                        </div>

                        <div className="space-y-4">
                            {/* Calculation Mode Toggle */}
                            <div className="grid grid-cols-2 gap-2 p-1.5 bg-muted/50 rounded-xl text-xs font-semibold">
                                <button
                                    type="button"
                                    onClick={() => setCalcMode("amount")}
                                    className={`py-2 px-3 rounded-lg transition-all cursor-pointer font-bold ${
                                        calcMode === "amount"
                                            ? "bg-accent text-white shadow-md shadow-accent/25"
                                            : "text-muted-foreground hover:text-foreground bg-transparent"
                                    }`}
                                >
                                    By Invested INR
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCalcMode("units")}
                                    className={`py-2 px-3 rounded-lg transition-all cursor-pointer font-bold ${
                                        calcMode === "units"
                                            ? "bg-accent text-white shadow-md shadow-accent/25"
                                            : "text-muted-foreground hover:text-foreground bg-transparent"
                                    }`}
                                >
                                    By Units
                                </button>
                            </div>

                            {calcMode === "units" ? (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">Units Held</label>
                                    <input
                                        type="number"
                                        min="0.0001"
                                        step="any"
                                        value={unitsHeld}
                                        onChange={e => setUnitsHeld(e.target.value)}
                                        placeholder="Enter units held, e.g. 1500"
                                        className="w-full p-3 border border-input rounded-xl bg-background text-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all font-mono"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">Invested Amount (INR)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="any"
                                        value={investedInput}
                                        onChange={e => setInvestedInput(e.target.value)}
                                        placeholder="Enter invested amount, e.g. 10000"
                                        className="w-full p-3 border border-input rounded-xl bg-background text-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all font-mono"
                                    />
                                </div>
                            )}

                            {/* Year of Investment */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-muted-foreground uppercase">Year of Investment</label>
                                <select
                                    value={selectedYear}
                                    onChange={e => setSelectedYear(e.target.value)}
                                    className="w-full p-3 border border-input rounded-xl bg-background text-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                                >
                                    <option value="">Select Year</option>
                                    {investments.map(inv => (
                                        <option key={inv.year} value={inv.year}>
                                            Year {inv.year} ({new Date(inv.investmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-muted-foreground ml-1">
                                    NIF started in 2022. Select the year you purchased your units.
                                </p>
                            </div>

                            {/* Evaluation Date Toggle */}
                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-foreground font-medium">
                                    <input
                                        type="checkbox"
                                        checked={useCustomDate}
                                        onChange={e => {
                                            setUseCustomDate(e.target.checked);
                                            if (e.target.checked && latestNAV && !customTargetDate) {
                                                setCustomTargetDate(latestNAV.date);
                                            }
                                        }}
                                        className="accent-accent w-4 h-4 rounded"
                                    />
                                    Check returns for a specific date
                                </label>
                            </div>

                            {/* Custom Target Date Picker */}
                            <AnimatePresence>
                                {useCustomDate && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-1 overflow-hidden"
                                    >
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Evaluation NAV Date</label>
                                        <input
                                            type="date"
                                            value={customTargetDate}
                                            onChange={e => setCustomTargetDate(e.target.value)}
                                            className="w-full p-3 border border-input rounded-xl bg-background text-foreground focus:ring-2 focus:ring-accent outline-none transition-all font-sans"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Outputs Panel (2 Columns) */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* If not calculated yet */}
                        {!calcResults && (
                            <div className="bg-card border border-border p-12 rounded-2xl text-center space-y-4 shadow-sm flex flex-col items-center justify-center min-h-[350px]">
                                <Calculator className="w-16 h-16 text-muted-foreground opacity-30 animate-pulse" />
                                <h3 className="text-xl font-bold text-foreground">Calculate Your Returns</h3>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    Enter your {calcMode === "units" ? "units held" : "invested amount (INR)"} and select the year of investment on the left panel to estimate your total gains, invested principal, and annualized returns (CAGR).
                                </p>
                            </div>
                        )}

                        {/* Results computed */}
                        {calcResults && (
                            <div className="space-y-6">
                                
                                {/* Warnings/Infos if any */}
                                {calcResults.warning && (
                                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 rounded-xl flex items-start gap-3">
                                        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                        <span className="text-sm font-medium leading-relaxed">{calcResults.warning}</span>
                                    </div>
                                )}

                                {/* Validation Errors */}
                                {!calcResults.isValid ? (
                                    <div className="bg-card border border-red-500/20 p-12 rounded-2xl text-center space-y-4 shadow-sm flex flex-col items-center justify-center min-h-[350px]">
                                        <AlertTriangle className="w-16 h-16 text-red-500 opacity-60" />
                                        <h3 className="text-xl font-bold text-foreground">Invalid Investment Period</h3>
                                        <p className="text-red-500 max-w-md mx-auto font-medium">
                                            {calcResults.warning}
                                        </p>
                                    </div>
                                ) : (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="space-y-6"
                                    >
                                        {/* Floating Cards Grid */}
                                        <div className="space-y-6">
                                            {/* Top Row: Monetary Values (3 Columns) */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                                
                                                {/* Invested Amount Card */}
                                                <div className="bg-card border border-border p-6 rounded-2xl shadow-xl shadow-accent/5 hover:shadow-2xl hover:shadow-accent/15 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-4 transform translate-x-2 -translate-y-2">
                                                        <Activity className="w-20 h-20 text-accent opacity-20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
                                                    </div>
                                                    <div className="relative z-10">
                                                        <div className="p-2.5 bg-accent/15 border border-accent/30 w-fit rounded-xl mb-4 shadow-sm shadow-accent/10">
                                                            <span className="text-lg font-bold text-accent">₹</span>
                                                        </div>
                                                        <h3 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight font-mono">
                                                            {formatCurrency(calcResults.investedAmount)}
                                                        </h3>
                                                        <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs mt-1.5">Invested Amount</p>
                                                    </div>
                                                </div>

                                                {/* Total Current Amount Card */}
                                                <div className="bg-card border border-border p-6 rounded-2xl shadow-xl shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/15 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-4 transform translate-x-2 -translate-y-2">
                                                        <ArrowUpRight className="w-20 h-20 text-blue-600 opacity-20 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300" />
                                                    </div>
                                                    <div className="relative z-10">
                                                        <div className="p-2.5 bg-blue-500/15 border border-blue-500/30 w-fit rounded-xl mb-4 shadow-sm shadow-blue-500/10">
                                                            <ArrowUpRight className="w-5 h-5 text-blue-500 stroke-[3]" />
                                                        </div>
                                                        <h3 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight font-mono">
                                                            {formatCurrency(calcResults.currentAmount)}
                                                        </h3>
                                                        <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs mt-1.5">Total Amount (Value)</p>
                                                    </div>
                                                </div>

                                                {/* Gains Card */}
                                                <div className={`bg-card border border-border p-6 rounded-2xl shadow-xl ${calcResults.gainsAmount >= 0 ? "shadow-green-500/5 hover:shadow-green-500/15" : "shadow-red-500/5 hover:shadow-red-500/15"} hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group`}>
                                                    <div className="absolute top-0 right-0 p-4 transform translate-x-2 -translate-y-2">
                                                        {calcResults.gainsAmount >= 0 ? (
                                                            <TrendingUp className="w-20 h-20 text-green-500 opacity-20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
                                                        ) : (
                                                            <TrendingDown className="w-20 h-20 text-red-500 opacity-20 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300" />
                                                        )}
                                                    </div>
                                                    <div className="relative z-10">
                                                        <div className={`p-2.5 w-fit rounded-xl mb-4 border shadow-sm ${calcResults.gainsAmount >= 0 ? "bg-green-500/15 border-green-500/30 text-green-500 shadow-green-500/10" : "bg-red-500/15 border-red-500/30 text-red-500 shadow-red-500/10"}`}>
                                                            {calcResults.gainsAmount >= 0 ? (
                                                                <TrendingUp className="w-5 h-5 text-green-500 stroke-[3]" />
                                                            ) : (
                                                                <TrendingDown className="w-5 h-5 text-red-500 stroke-[3]" />
                                                            )}
                                                        </div>
                                                        <h3 className={`text-xl md:text-2xl font-extrabold tracking-tight font-mono ${calcResults.gainsAmount >= 0 ? "text-green-500" : "text-red-500"}`}>
                                                            {formatCurrency(calcResults.gainsAmount)}
                                                        </h3>
                                                        <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs mt-1.5">Gains Amount</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bottom Row: Percentage Returns (3 Columns) */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                                
                                                {/* CAGR Card (NIF Return) */}
                                                <div className={`bg-card border border-border p-6 rounded-2xl shadow-xl ${calcResults.cagr >= 0 ? "shadow-green-500/5 hover:shadow-green-500/15" : "shadow-red-500/5 hover:shadow-red-500/15"} hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group`}>
                                                    <div className="absolute top-0 right-0 p-4 transform translate-x-2 -translate-y-2">
                                                        {calcResults.cagr >= 0 ? (
                                                            <TrendingUp className="w-20 h-20 text-green-500 opacity-20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
                                                        ) : (
                                                            <TrendingDown className="w-20 h-20 text-red-500 opacity-20 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300" />
                                                        )}
                                                    </div>
                                                    <div className="relative z-10">
                                                        <div className={`p-2.5 w-fit rounded-xl mb-4 border shadow-sm ${calcResults.cagr >= 0 ? "bg-green-500/15 border-green-500/30 text-green-500 shadow-green-500/10" : "bg-red-500/15 border-red-500/30 text-red-500 shadow-red-500/10"}`}>
                                                            {calcResults.cagr >= 0 ? (
                                                                <TrendingUp className="w-5 h-5 text-green-500 stroke-[3]" />
                                                            ) : (
                                                                <TrendingDown className="w-5 h-5 text-red-500 stroke-[3]" />
                                                            )}
                                                        </div>
                                                        <h3 className={`text-2xl md:text-3xl font-extrabold tracking-tight font-mono ${calcResults.cagr >= 0 ? "text-green-500" : "text-red-500"}`}>
                                                            {calcResults.cagr.toFixed(2)} %
                                                        </h3>
                                                        <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs mt-1.5">NIF Annualized Return (CAGR)</p>
                                                    </div>
                                                </div>

                                                {/* Nifty 50 Return Card */}
                                                <div className={`bg-card border border-border p-6 rounded-2xl shadow-xl ${calcResults.niftyReturn !== null && calcResults.niftyReturn >= 0 ? "shadow-blue-500/5 hover:shadow-blue-500/15" : "shadow-red-500/5 hover:shadow-red-500/15"} hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group`}>
                                                    <div className="absolute top-0 right-0 p-4 transform translate-x-2 -translate-y-2">
                                                        {calcResults.niftyReturn !== null && calcResults.niftyReturn >= 0 ? (
                                                            <TrendingUp className="w-20 h-20 text-blue-500 opacity-20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
                                                        ) : (
                                                            <TrendingDown className="w-20 h-20 text-red-500 opacity-20 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300" />
                                                        )}
                                                    </div>
                                                    <div className="relative z-10">
                                                        <div className={`p-2.5 w-fit rounded-xl mb-4 border shadow-sm ${calcResults.niftyReturn !== null && calcResults.niftyReturn >= 0 ? "bg-blue-500/15 border-blue-500/30 text-blue-500 shadow-blue-500/10" : "bg-red-500/15 border-red-500/30 text-red-500 shadow-red-500/10"}`}>
                                                            {calcResults.niftyReturn !== null && calcResults.niftyReturn >= 0 ? (
                                                                <TrendingUp className="w-5 h-5 text-blue-500 stroke-[3]" />
                                                            ) : (
                                                                <TrendingDown className="w-5 h-5 text-red-500 stroke-[3]" />
                                                            )}
                                                        </div>
                                                        <h3 className={`text-2xl md:text-3xl font-extrabold tracking-tight font-mono ${calcResults.niftyReturn !== null && calcResults.niftyReturn >= 0 ? "text-blue-500" : "text-red-500"}`}>
                                                            {calcResults.niftyReturn !== null ? `${calcResults.niftyReturn.toFixed(2)} %` : "—"}
                                                        </h3>
                                                        <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs mt-1.5">Nifty 50 Return (Same Period)</p>
                                                    </div>
                                                </div>

                                                {/* Outperformance Card */}
                                                {(() => {
                                                    const outperformance = calcResults.niftyReturn !== null 
                                                        ? calcResults.cagr - calcResults.niftyReturn 
                                                        : null;
                                                    const isPositive = outperformance !== null && outperformance >= 0;
                                                    return (
                                                        <div className={`bg-card border border-border p-6 rounded-2xl shadow-xl ${outperformance !== null && isPositive ? "shadow-green-500/5 hover:shadow-green-500/15" : "shadow-red-500/5 hover:shadow-red-500/15"} hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group`}>
                                                            <div className="absolute top-0 right-0 p-4 transform translate-x-2 -translate-y-2">
                                                                {outperformance !== null && isPositive ? (
                                                                    <TrendingUp className="w-20 h-20 text-green-500 opacity-20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300" />
                                                                ) : (
                                                                    <TrendingDown className="w-20 h-20 text-red-500 opacity-20 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300" />
                                                                )}
                                                            </div>
                                                            <div className="relative z-10">
                                                                <div className={`p-2.5 w-fit rounded-xl mb-4 border shadow-sm ${outperformance !== null && isPositive ? "bg-green-500/15 border-green-500/30 text-green-500 shadow-green-500/10" : "bg-red-500/15 border-red-500/30 text-red-500 shadow-red-500/10"}`}>
                                                                    {outperformance !== null && isPositive ? (
                                                                        <TrendingUp className="w-5 h-5 text-green-500 stroke-[3]" />
                                                                    ) : (
                                                                        <TrendingDown className="w-5 h-5 text-red-500 stroke-[3]" />
                                                                    )}
                                                                </div>
                                                                <h3 className={`text-2xl md:text-3xl font-extrabold tracking-tight font-mono ${outperformance !== null && isPositive ? "text-green-500" : "text-red-500"}`}>
                                                                    {outperformance !== null ? `${isPositive ? "+" : ""}${outperformance.toFixed(2)} %` : "—"}
                                                                </h3>
                                                                <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs mt-1.5">Outperformance vs Nifty 50</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* Computation Details Card */}
                                        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
                                            <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                                                <Info className="w-4 h-4 text-accent" />
                                                Calculation Parameters
                                            </h4>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                                <div className="p-3 bg-muted/40 rounded-xl space-y-1">
                                                    <p className="text-xs font-bold text-muted-foreground uppercase">Investment Purchase Details</p>
                                                    <div className="flex justify-between font-medium">
                                                        <span>Date:</span>
                                                        <span className="text-foreground font-semibold">
                                                            {new Date(calcResults.investmentDate).toLocaleDateString('en-IN', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between font-medium">
                                                        <span>NIF NAV:</span>
                                                        <span className="text-foreground font-semibold font-mono">₹ {calcResults.investmentNav.toFixed(4)}</span>
                                                    </div>
                                                    {calcResults.niftyStartIndexed !== undefined && calcResults.niftyStartIndexed !== null && (
                                                        <div className="flex justify-between font-medium">
                                                            <span>Nifty 50 (Indexed):</span>
                                                            <span className="text-foreground font-semibold font-mono">₹ {calcResults.niftyStartIndexed.toFixed(4)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="p-3 bg-muted/40 rounded-xl space-y-1">
                                                    <p className="text-xs font-bold text-muted-foreground uppercase">Evaluation / Target Details</p>
                                                    <div className="flex justify-between font-medium">
                                                        <span>Date:</span>
                                                        <span className="text-foreground font-semibold">
                                                            {new Date(calcResults.targetDate).toLocaleDateString('en-IN', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between font-medium">
                                                        <span>NIF NAV:</span>
                                                        <span className="text-foreground font-semibold font-mono">₹ {calcResults.targetNav.toFixed(4)}</span>
                                                    </div>
                                                    {calcResults.niftyEndIndexed !== undefined && calcResults.niftyEndIndexed !== null && (
                                                        <div className="flex justify-between font-medium">
                                                            <span>Nifty 50 (Indexed):</span>
                                                            <span className="text-foreground font-semibold font-mono">
                                                                ₹ {calcResults.niftyEndIndexed.toFixed(4)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-[11px] text-muted-foreground leading-relaxed space-y-2">
                                                <ul className="list-disc pl-4 space-y-1">
                                                    <li>
                                                        {calcMode === "units" 
                                                            ? <><strong>Invested Amount</strong> = <code>Units × Investment NAV</code></>
                                                            : <><strong>Units Purchased</strong> = <code>Invested Amount / Investment NAV</code></>
                                                        }
                                                    </li>
                                                    <li><strong>Total Amount (Value)</strong> = <code>Units × Target NAV</code></li>
                                                    <li>
                                                        <strong>NIF CAGR</strong> = <code>((Target NAV / Investment NAV) ^ (1 / Y)) - 1</code> (where <code>Y</code> is the fractional years computed by dividing actual trading days in each calendar year by that year's configured trading days).
                                                    </li>
                                                    <li>
                                                        <strong>Nifty 50 Return (CAGR)</strong> = <code>((Target Nifty 50 / Investment Nifty 50) ^ (1 / Y)) - 1</code>
                                                    </li>
                                                </ul>
                                                <div className="pt-2 border-t border-border/40 text-[10px] italic">
                                                    Note: These calculations are approximated. Actual values may vary slightly.
                                                </div>
                                            </div>
                                        </div>

                                    </motion.div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
