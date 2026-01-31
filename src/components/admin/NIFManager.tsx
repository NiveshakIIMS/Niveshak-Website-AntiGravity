/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, TrendingUp, Save, BarChart3 } from "lucide-react";
import { dataService, NAVData } from "@/services/dataService";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";
import { motion } from "framer-motion";

export default function NIFManager() {
    const [data, setData] = useState<NAVData[]>([]);
    const [metrics, setMetrics] = useState<any>({ annualizedReturn: "", totalAUM: "", ytdReturn: "" });
    const [newEntry, setNewEntry] = useState({ date: "", value: "" });

    useEffect(() => {
        Promise.all([
            dataService.getNAVData(),
            dataService.getNIFMetrics()
        ]).then(([navData, metricsData]) => {
            setData(navData);
            setMetrics(metricsData);
        });
    }, []);

    const addEntry = async () => {
        if (!newEntry.date || !newEntry.value) return;
        const entry: NAVData = {
            id: Date.now().toString(),
            date: newEntry.date,
            value: parseFloat(newEntry.value)
        };
        const newData = [...data, entry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setData(newData);
        await dataService.saveNAVData(newData);
        setNewEntry({ date: "", value: "" });
    };

    const deleteEntry = async (id: string) => {
        const newData = data.filter(d => d.id !== id);
        setData(newData);
        await dataService.saveNAVData(newData);
    };

    return (
        <div className="p-8 space-y-8 bg-background min-h-full">
            <div className="flex justify-between items-center border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        NIF Dashboard
                    </h2>
                    <p className="text-muted-foreground mt-1">Update Net Asset Value (NAV) of the student fund.</p>
                </div>

                <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-navy-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-navy-600 rounded-xl hover:bg-gray-50 dark:hover:bg-navy-700 font-medium transition-all shadow-sm">
                    <BarChart3 className="w-5 h-5" /> View Analytics
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Data Entry */}
                <div className="space-y-6">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-card p-6 rounded-2xl border border-border shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                        <h3 className="font-bold text-lg text-foreground mb-6 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-blue-500" /> New Data Point
                        </h3>

                        <div className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-muted-foreground uppercase">Date (DD/MM/YYYY)</label>
                                <input
                                    type="date"
                                    value={newEntry.date}
                                    onChange={e => setNewEntry({ ...newEntry, date: e.target.value })}
                                    className="w-full p-3 border border-input rounded-xl bg-background focus:ring-2 focus:ring-blue-500 outline-none transition-all text-foreground"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-muted-foreground uppercase">NAV Value (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-muted-foreground">₹</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newEntry.value}
                                        onChange={e => setNewEntry({ ...newEntry, value: e.target.value })}
                                        className="w-full pl-8 p-3 border border-input rounded-xl bg-background focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-foreground"
                                        placeholder="102.50"
                                    />
                                </div>
                            </div>
                            <button onClick={addEntry} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95">Add Data Point</button>
                        </div>
                    </motion.div>

                    {/* Metrics Editor */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-card p-6 rounded-2xl border border-border shadow-xl space-y-8">
                        <div>
                            <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-purple-500" /> Key Metrics
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">Total AUM (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-muted-foreground font-bold">₹</span>
                                        <input
                                            type="text"
                                            value={metrics.totalAUM || ""}
                                            onChange={async e => {
                                                const newMetrics = { ...metrics, totalAUM: e.target.value };
                                                setMetrics(newMetrics);
                                                await dataService.saveNIFMetrics(newMetrics);
                                            }}
                                            className="w-full pl-8 p-3 border border-input rounded-xl bg-background focus:ring-2 focus:ring-purple-500 outline-none transition-all font-mono text-foreground"
                                            placeholder="25,40,000"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">Ann. Return (%)</label>
                                    <input
                                        type="text"
                                        value={metrics.annualizedReturn}
                                        onChange={async e => {
                                            const newMetrics = { ...metrics, annualizedReturn: e.target.value };
                                            setMetrics(newMetrics);
                                            await dataService.saveNIFMetrics(newMetrics);
                                        }}
                                        className="w-full p-3 border border-input rounded-xl bg-background focus:ring-2 focus:ring-purple-500 outline-none transition-all font-mono text-foreground"
                                        placeholder="12.5"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Asset Allocation Editor */}
                        <div>
                            <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full border-4 border-blue-500" /> Asset Allocation
                            </h3>
                            <div className="space-y-3">
                                {metrics.assetAllocation?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <input
                                            type="color"
                                            value={item.color}
                                            onChange={async e => {
                                                const newAlloc = [...metrics.assetAllocation];
                                                newAlloc[idx].color = e.target.value;
                                                const newMetrics = { ...metrics, assetAllocation: newAlloc };
                                                setMetrics(newMetrics);
                                                await dataService.saveNIFMetrics(newMetrics);
                                            }}
                                            className="w-10 h-10 p-1 rounded cursor-pointer bg-transparent"
                                        />
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={async e => {
                                                const newAlloc = [...metrics.assetAllocation];
                                                newAlloc[idx].name = e.target.value;
                                                const newMetrics = { ...metrics, assetAllocation: newAlloc };
                                                setMetrics(newMetrics);
                                                await dataService.saveNIFMetrics(newMetrics);
                                            }}
                                            className="flex-1 p-2 border border-input rounded-lg bg-background text-sm"
                                            placeholder="Category"
                                        />
                                        <input
                                            type="number"
                                            value={item.value}
                                            onChange={async e => {
                                                const newAlloc = [...metrics.assetAllocation];
                                                newAlloc[idx].value = parseFloat(e.target.value);
                                                const newMetrics = { ...metrics, assetAllocation: newAlloc };
                                                setMetrics(newMetrics);
                                                await dataService.saveNIFMetrics(newMetrics);
                                            }}
                                            className="w-20 p-2 border border-input rounded-lg bg-background text-sm"
                                            placeholder="%"
                                        />
                                        <button
                                            onClick={async () => {
                                                const newAlloc = metrics.assetAllocation.filter((_: any, i: number) => i !== idx);
                                                const newMetrics = { ...metrics, assetAllocation: newAlloc };
                                                setMetrics(newMetrics);
                                                await dataService.saveNIFMetrics(newMetrics);
                                            }}
                                            className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={async () => {
                                        const newAlloc = [...(metrics.assetAllocation || []), { name: "New Asset", value: 0, color: "#000000" }];
                                        const newMetrics = { ...metrics, assetAllocation: newAlloc };
                                        setMetrics(newMetrics);
                                        await dataService.saveNIFMetrics(newMetrics);
                                    }}
                                    className="w-full py-2 border-2 border-dashed border-gray-200 dark:border-navy-700 rounded-xl text-gray-400 font-bold hover:border-purple-500 hover:text-purple-500 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Add Asset Class
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card p-6 rounded-2xl border border-border shadow-sm h-[400px] flex flex-col">
                        <h3 className="font-bold text-muted-foreground uppercase text-xs tracking-wider mb-4">Historical Data</h3>
                        <div className="overflow-y-auto flex-1 pr-2 space-y-2 custom-scrollbar">
                            {data.length === 0 ? <p className="text-gray-400 text-sm text-center py-10">No data points added.</p> : null}
                            {data.map(d => (
                                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-gray-100 dark:hover:border-navy-700 group">
                                    <div>
                                        <p className="font-bold text-foreground text-sm">
                                            {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-blue-600 dark:text-blue-400 font-medium">₹ {d.value}</span>
                                        <button onClick={() => deleteEntry(d.id)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Preview */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2 bg-card p-8 rounded-2xl border border-border shadow-lg flex flex-col">
                    <div className="mb-6 flex justify-between items-end">
                        <div>
                            <h3 className="font-bold text-xl text-foreground">Performance Graph</h3>
                            <p className="text-muted-foreground text-sm">Real-time preview of the NIF Dashboard chart.</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase">Current NAV</p>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                ₹ {data.length > 0 ? data[data.length - 1].value : "0.00"}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-[300px] bg-muted/50 rounded-xl p-4 border border-border relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹ ${value}`} domain={['auto', 'auto']} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "12px", color: "#fff", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                                    itemStyle={{ color: "#fff" }}
                                    formatter={(value: any) => [`₹ ${value}`, "NAV"]}
                                    labelStyle={{ color: "#94a3b8", marginBottom: "0.5rem" }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                        {data.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                No data to display
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
