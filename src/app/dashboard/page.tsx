"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { dataService, NAVData, NIFMetrics } from "@/services/dataService";
import NAVChart from "@/components/dashboard/NAVChart";
import { TrendingUp, Activity, PieChart as PieChartIcon, ArrowUpRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export default function Dashboard() {
    const [navData, setNavData] = useState<NAVData[]>([]);
    const [metrics, setMetrics] = useState<NIFMetrics | null>(null);

    useEffect(() => {
        const load = async () => {
            const nav = await dataService.getNAVData();
            setNavData(nav);
            const met = await dataService.getNIFMetrics();
            setMetrics(met);
        };
        load();
    }, []);

    const latestNAV = navData.length > 0 ? navData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;

    return (
        <main className="min-h-screen bg-background text-foreground transition-colors">

            {/* Header Section */}
            <section className="pt-32 pb-12 px-4 bg-background border-b border-border">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                        NIF <span className="text-accent">Dashboard</span>
                    </h1>
                    <p className="text-xl text-muted-foreground">Live performance of Niveshak Investment Fund</p>
                </div>
            </section>

            <section className="py-20 px-4 max-w-7xl mx-auto">
                <div className="space-y-8">
                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                        <span>For {new Date(latestNAV.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
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
                                <h3 className="text-3xl font-bold text-foreground">₹ {latestNAV?.value.toFixed(2) || "0.00"}</h3>
                                <p className="text-muted-foreground font-medium uppercase tracking-wider text-xs mt-1">Current NAV</p>
                                {latestNAV && (
                                    <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent text-xs font-semibold">
                                        <span>For {new Date(latestNAV.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
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
                                <h3 className="text-3xl font-bold text-foreground">{metrics?.annualizedReturn || "0.0"}%</h3>
                                <p className="text-muted-foreground font-medium uppercase tracking-wider text-xs mt-1">Annualized Return</p>
                            </div>
                        </div>

                    </div>

                    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8">
                        {/* Chart Section */}
                        <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-sm p-6">
                            <h3 className="text-xl font-bold text-foreground mb-6">NAV Performance</h3>
                            <div className="h-[300px] md:h-[400px]">
                                <NAVChart data={navData} />
                            </div>
                        </div>

                        {/* Asset Allocation */}
                        <div className="bg-card border border-border rounded-2xl shadow-sm p-6 flex flex-col">
                            <h3 className="text-xl font-bold text-foreground mb-6">Asset Allocation</h3>
                            <div className="h-[300px] md:h-[400px] w-full flex-1">
                                {metrics?.assetAllocation && metrics.assetAllocation.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={metrics.assetAllocation}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
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
                                                formatter={(value, entry: any) => <span className="text-foreground font-medium ml-1">{value}</span>}
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
                </div>
            </section>

            <Footer />
        </main>
    );
}
