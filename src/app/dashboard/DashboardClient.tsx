"use client";

import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { dataService, NAVData, NIFMetrics, calculateTradingYears } from "@/services/dataService";
import { getUTCDateInfo } from "@/lib/dateUtils";
import NAVChart from "@/components/dashboard/NAVChart";
import { TrendingUp, TrendingDown, Activity, PieChart as PieChartIcon, ArrowUpRight, BookOpen, Calculator } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { supabase } from "@/lib/supabaseClient";

interface DashboardClientProps {
    initialNAVData?: NAVData[];
    initialMetrics?: NIFMetrics | null;
}

const calculateNiftyCAGR = (navData: NAVData[], tradingDaysConfig: { [year: number]: number }) => {
    const sorted = [...navData]
        .filter(d => d.nifty50 !== undefined && d.nifty50 !== null)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sorted.length < 2) return null;
    const start = sorted[0];
    const end = sorted[sorted.length - 1];
    if (!start.nifty50 || !end.nifty50) return null;

    const years = calculateTradingYears(start.date, end.date, sorted, tradingDaysConfig);
    if (years <= 0) return null;

    const cagr = (Math.pow(end.nifty50 / start.nifty50, 1 / years) - 1) * 100;
    return cagr.toFixed(2);
};

const formatPercent = (val: number | null, showPlus = false): string => {
    if (val === null) return "—";
    const sign = val < 0 ? "- " : (showPlus && val > 0 ? "+ " : "");
    const absVal = Math.abs(val).toFixed(2);
    return `${sign}${absVal} %`;
};

export default function DashboardClient({ initialNAVData = [], initialMetrics = null }: DashboardClientProps) {
    const [navData, setNavData] = useState<NAVData[]>(initialNAVData);
    const [metrics, setMetrics] = useState<NIFMetrics | null>(initialMetrics);
    const [tradingDays, setTradingDays] = useState<{ [year: number]: number }>({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    useEffect(() => {
        const loadDays = async () => {
            try {
                const days = await dataService.getTradingDays();
                const daysObj: { [year: number]: number } = {};
                days.forEach(d => {
                    daysObj[d.year] = d.days;
                });
                setTradingDays(daysObj);
            } catch (err) {
                console.error("Error loading trading days:", err);
            }
        };

        const loadNAV = async () => {
            try {
                const nav = await dataService.getNAVData();
                if (nav && nav.length > 0) setNavData(nav);
            } catch (err) {
                console.error("Error loading NAV:", err);
            }
        };

        const loadMetrics = async () => {
            try {
                const met = await dataService.getNIFMetrics();
                if (met) setMetrics(met);
            } catch (err) {
                console.error("Error loading metrics:", err);
            }
        };

        const loadAll = () => {
            loadNAV();
            loadMetrics();
            loadDays();
        };

        loadAll();

        const channel = supabase
            .channel("realtime-dashboard")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "nav_data" },
                () => {
                    loadNAV();
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "nif_metrics" },
                () => {
                    loadMetrics();
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "trading_days" },
                () => {
                    loadDays();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const latestNAV = navData.length > 0 ? [...navData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;

    const niftyReturnStr = calculateNiftyCAGR(navData, tradingDays);
    const niftyReturnVal = niftyReturnStr ? parseFloat(niftyReturnStr) : null;
    const nifReturnVal = metrics?.annualizedReturn ? parseFloat(metrics.annualizedReturn) : 0;
    const outperformance = niftyReturnVal !== null ? (nifReturnVal - niftyReturnVal) : null;

    return (
        <main className="min-h-screen bg-background text-foreground transition-colors">

            {/* Header Section */}
            <section className="pt-32 pb-12 px-4 bg-background border-b border-border">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                        NIF <span className="text-accent">Dashboard</span>
                    </h1>
                    <p className="text-xl text-muted-foreground font-semibold">Live performance of Niveshak Investment Fund</p>
                </div>
            </section>

            <section className="py-20 px-4 max-w-7xl mx-auto">
                <div className="space-y-8">
                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        {/* AUM Card */}
                        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 transform translate-x-2 -translate-y-2">
                                <PieChart className="w-24 h-24 text-accent opacity-70 group-hover:scale-105 transition-transform" />
                            </div>
                            <div className="relative z-10">
                                <div className="p-3 bg-accent/10 w-fit rounded-xl mb-4">
                                    <span className="text-2xl font-bold text-accent">₹</span>
                                </div>
                                <h3 className="text-3xl font-bold text-foreground">₹ {Number(metrics?.totalAUM || 0).toLocaleString('en-IN')}</h3>
                                <p className="text-muted-foreground font-medium uppercase tracking-wider text-xs mt-1">Total AUM</p>
                                {latestNAV && (
                                    <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent text-xs font-semibold">
                                        <span>For {(() => {
                                            const info = getUTCDateInfo(latestNAV.date);
                                            return `${info.day} ${info.monthShort} ${info.year}`;
                                        })()}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* NAV Card */}
                        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 transform translate-x-2 -translate-y-2">
                                <Activity className="w-24 h-24 text-accent opacity-70 group-hover:scale-105 transition-transform" />
                            </div>
                            <div className="relative z-10">
                                <div className="p-3 bg-accent/10 w-fit rounded-xl mb-4">
                                    <Activity className="w-6 h-6 text-accent" />
                                </div>
                                <h3 className="text-3xl font-bold text-foreground">₹ {latestNAV?.value.toFixed(1) || "0.0"}</h3>
                                <p className="text-muted-foreground font-medium uppercase tracking-wider text-xs mt-1">Current NAV</p>
                                {latestNAV && (
                                    <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent text-xs font-semibold">
                                        <span>For {(() => {
                                            const info = getUTCDateInfo(latestNAV.date);
                                            return `${info.day} ${info.monthShort} ${info.year}`;
                                        })()}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Returns Card */}
                        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 transform translate-x-2 -translate-y-2">
                                <TrendingUp className="w-24 h-24 text-green-500 opacity-70 group-hover:scale-105 transition-transform" />
                            </div>
                            <div className="relative z-10">
                                <div className="p-3 bg-green-500/10 w-fit rounded-xl mb-4">
                                    <ArrowUpRight className="w-6 h-6 text-green-500" />
                                </div>
                                <h3 className="text-3xl font-bold text-foreground">{formatPercent(nifReturnVal)}</h3>
                                <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs mt-1">NIF Annualized Return (CAGR)</p>
                            </div>
                        </div>

                        {/* Nifty 50 Card */}
                        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 transform translate-x-2 -translate-y-2">
                                <TrendingUp className="w-24 h-24 text-blue-500 opacity-70 group-hover:scale-105 transition-transform" />
                            </div>
                            <div className="relative z-10">
                                <div className="p-3 bg-blue-500/10 w-fit rounded-xl mb-4">
                                    <ArrowUpRight className="w-6 h-6 text-blue-500" />
                                </div>
                                <h3 className="text-3xl font-bold text-foreground">{formatPercent(niftyReturnVal)}</h3>
                                <p className="text-muted-foreground font-semibold uppercase tracking-wider text-xs mt-1">Nifty 50 Return (Same Period)</p>
                            </div>
                        </div>

                        {/* Outperformance Card */}
                        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 transform translate-x-2 -translate-y-2">
                                {outperformance !== null && outperformance >= 0 ? (
                                    <TrendingUp className="w-24 h-24 text-green-500 opacity-70 group-hover:scale-105 transition-transform" />
                                ) : (
                                    <TrendingDown className="w-24 h-24 text-red-500 opacity-70 group-hover:scale-105 transition-transform" />
                                )}
                            </div>
                            <div className="relative z-10">
                                <div className={`p-3 w-fit rounded-xl mb-4 ${outperformance !== null && outperformance >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                                    {outperformance !== null && outperformance >= 0 ? (
                                        <ArrowUpRight className="w-6 h-6 text-green-500" />
                                    ) : (
                                        <TrendingDown className="w-6 h-6 text-red-500" />
                                    )}
                                </div>
                                <h3 className={`text-3xl font-bold ${outperformance !== null ? (outperformance >= 0 ? "text-green-500" : "text-red-500") : "text-foreground"}`}>
                                    {formatPercent(outperformance, true)}
                                </h3>
                                <p className="text-muted-foreground font-medium uppercase tracking-wider text-xs mt-1">Outperformance vs Nifty 50</p>
                            </div>
                        </div>

                    </div>

                    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8">
                        {/* Chart Section */}
                        <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-sm p-4 md:p-6 overflow-hidden">
                            <h3 className="text-xl font-bold text-foreground mb-4">NAV & Index Performance</h3>
                            <div className="h-auto w-full min-w-0">
                                <NAVChart data={navData} />
                            </div>
                        </div>

                        {/* Asset Allocation */}
                        <div className="bg-card border border-border rounded-2xl shadow-sm p-6 flex flex-col overflow-hidden">
                            <h3 className="text-xl font-bold text-foreground mb-6">Asset Allocation</h3>
                            <div className="h-[300px] md:h-[400px] w-full min-w-0">
                                {!mounted ? (
                                    <div className="h-full flex items-center justify-center bg-muted/10 animate-pulse rounded-xl text-muted-foreground text-sm">
                                        Loading allocation chart...
                                    </div>
                                ) : metrics?.assetAllocation && metrics.assetAllocation.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={metrics.assetAllocation}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius="40%"
                                                outerRadius="70%"
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {metrics.assetAllocation.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                                    color: '#1f2937'
                                                }}
                                                itemStyle={{ color: '#1f2937', fontWeight: 600 }}
                                                formatter={(value) => `${value}%`}
                                            />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                iconType="circle"
                                                formatter={(value) => <span className="text-foreground font-medium ml-1">{value}</span>}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center bg-muted/30 rounded-xl border border-dashed border-border text-muted-foreground">
                                        <div className="text-center">
                                            <PieChartIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>No Data Added</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Calculator and Learn More Buttons */}
                    <div className="flex flex-col items-center gap-4 pt-4">
                        <a
                            href="/dashboard/calculator"
                            className="inline-flex items-center gap-3 px-6 py-3 bg-card border border-accent/45 text-foreground hover:bg-accent hover:text-white font-semibold rounded-xl shadow-md hover:shadow-accent/20 hover:-translate-y-0.5 transition-all duration-300 group"
                        >
                            <Calculator className="w-5 h-5 text-accent group-hover:text-white transition-colors" />
                            NIF Returns Calculator
                        </a>
                        <a
                            href="/dashboard/redemption"
                            className="inline-flex items-center gap-3 px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-sky-400 shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:-translate-y-0.5 transition-all duration-300"
                        >
                            <BookOpen className="w-5 h-5" />
                            Learn more about redemptions
                        </a>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
