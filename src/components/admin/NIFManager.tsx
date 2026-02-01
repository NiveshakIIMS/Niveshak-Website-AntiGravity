/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, TrendingUp, Save, BarChart3 } from "lucide-react";
import { dataService, NAVData } from "@/services/dataService";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";

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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: false });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];

                // Map: DateString -> NAVData
                // Initialize with existing data to preserve manual entries not in Excel
                const dataMap = new Map<string, NAVData>();
                data.forEach(d => dataMap.set(d.date, d));

                let addedCount = 0;
                let updatedCount = 0;

                // Iterate Excel Rows (Skip Header Row 0)
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    // Expect Col A=Date, Col B=Value
                    const dateRaw = row[0];
                    const val = row[1];

                    if (dateRaw === undefined || dateRaw === null || val === undefined || val === null) continue;

                    let dateStr = "";

                    // Type 1: Excel Serial Number (e.g. 45000)
                    if (typeof dateRaw === 'number') {
                        const dateInfo = XLSX.SSF.parse_date_code(dateRaw);
                        if (!dateInfo) continue;
                        // Format: YYYY-MM-DD
                        dateStr = `${dateInfo.y}-${String(dateInfo.m).padStart(2, '0')}-${String(dateInfo.d).padStart(2, '0')}`;
                    }
                    // Type 2: String Date (e.g. "2026-01-19" or "1/19/2026")
                    else if (typeof dateRaw === 'string') {
                        const d = new Date(dateRaw);
                        if (isNaN(d.getTime())) continue;
                        // Use local parts to avoid UTC shift if input was plain date string
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        dateStr = `${y}-${m}-${day}`;
                    }
                    else if (dateRaw instanceof Date) {
                        const y = dateRaw.getFullYear();
                        const m = String(dateRaw.getMonth() + 1).padStart(2, '0');
                        const day = String(dateRaw.getDate()).padStart(2, '0');
                        dateStr = `${y}-${m}-${day}`;
                    }
                    else {
                        continue;
                    }

                    const numVal = parseFloat(val);
                    if (isNaN(numVal)) continue;

                    if (dataMap.has(dateStr)) {
                        updatedCount++;
                    } else {
                        addedCount++;
                    }

                    // Update or Add
                    dataMap.set(dateStr, {
                        id: dataMap.get(dateStr)?.id || (Date.now() + i).toString(),
                        date: dateStr,
                        value: numVal
                    });
                }

                // Convert back to array and sort
                const newData = Array.from(dataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                setData(newData);
                await dataService.saveNAVData(newData);
                alert(`Upload Complete!\nAdded: ${addedCount}\nUpdated: ${updatedCount}`);

                // Clear input
                e.target.value = "";

            } catch (error) {
                console.error("Excel Parse Error:", error);
                alert("Failed to parse Excel file. Ensure Date is Col A and Value is Col B.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const addEntry = async () => {
        if (!newEntry.date || !newEntry.value) return;
        const entry: NAVData = {
            id: Date.now().toString(),
            date: newEntry.date,
            value: parseFloat(newEntry.value)
        };
        // Check duplication
        const existsRef = data.find(d => d.date === newEntry.date);
        let newData;
        if (existsRef) {
            newData = data.map(d => d.date === newEntry.date ? { ...d, value: parseFloat(newEntry.value) } : d);
        } else {
            newData = [...data, entry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }

        setData(newData);
        await dataService.saveNAVData(newData);
        setNewEntry({ date: "", value: "" });
    };

    const deleteEntry = async (id: string) => {
        const newData = data.filter(d => d.id !== id);
        setData(newData);
        await dataService.saveNAVData(newData);
    };

    const [isMaximized, setIsMaximized] = useState(false);

    // Sort Descending automatically when data updates? 
    // Actually better to just sort for display.
    const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const deleteAll = async () => {
        if (!confirm("Are you sure you want to DELETE ALL historical data? This cannot be undone.")) return;
        if (!confirm("Please confirm again. DELETE ALL?")) return;
        setData([]);
        await dataService.saveNAVData([]);
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

                <div className="flex gap-3">
                    <div className="relative overflow-hidden">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            title="Upload Excel File"
                        />
                        <button className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium transition-all shadow-sm">
                            <Save className="w-5 h-5" /> Bulk Upload Excel
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                {/* Left Column: Editors */}
                <div className="space-y-6">
                    {/* Manual Entry */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-card p-6 rounded-2xl border border-border shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                        <h3 className="font-bold text-lg text-foreground mb-6 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-blue-500" /> Manual Data Point
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
                                    <label className="text-xs font-bold text-muted-foreground uppercase">Number of Fund Units</label>
                                    <input
                                        type="number"
                                        value={metrics.fundUnits || ""}
                                        onChange={async e => {
                                            const units = e.target.value;

                                            // Calculate new AUM immediately
                                            let newAUM = metrics.totalAUM;
                                            if (units && sortedData.length > 0) {
                                                const latestNAV = sortedData[0].value;
                                                const u = parseFloat(units);
                                                if (!isNaN(u) && !isNaN(latestNAV)) {
                                                    // Format Indian currency style roughly or just string
                                                    newAUM = Math.round(u * latestNAV).toString();
                                                }
                                            }

                                            const newMetrics = { ...metrics, fundUnits: units, totalAUM: newAUM };
                                            setMetrics(newMetrics);
                                            await dataService.saveNIFMetrics(newMetrics);
                                        }}
                                        className="w-full p-3 border border-input rounded-xl bg-background focus:ring-2 focus:ring-purple-500 outline-none transition-all font-mono text-foreground"
                                        placeholder="Enter total units..."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">Total AUM (₹) - Auto Calculated</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-muted-foreground font-bold">₹</span>
                                        <input
                                            type="text"
                                            readOnly
                                            value={Number(metrics.totalAUM).toLocaleString('en-IN')}
                                            className="w-full pl-8 p-3 border border-input rounded-xl bg-muted text-muted-foreground font-mono cursor-not-allowed"
                                        />
                                        <div className="text-[10px] text-muted-foreground mt-1 ml-1">
                                            = Latest NAV (₹{sortedData.length > 0 ? sortedData[0].value : 0}) × Units
                                        </div>
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
                </div>

                {/* Right Column: Historical Data (Long Portrait) */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col h-[700px] sticky top-8">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
                        <h3 className="font-bold text-foreground flex items-center gap-2">
                            Historical Data
                            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">{data.length} entries</span>
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={() => setIsMaximized(true)} className="p-2 hover:bg-muted rounded-lg text-blue-500 text-xs font-bold transition-colors">Maximize</button>
                            {data.length > 0 && (
                                <button onClick={deleteAll} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 text-xs font-bold transition-colors flex items-center gap-1">
                                    <Trash2 className="w-3.5 h-3.5" /> Clear All
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 pr-2 space-y-2 custom-scrollbar">
                        {sortedData.length === 0 ? <p className="text-gray-400 text-sm text-center py-20">No data points added.</p> : null}
                        {sortedData.map(d => (
                            <div key={d.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border group">
                                <div className="flex flex-col">
                                    <p className="font-bold text-foreground text-sm">
                                        {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                    <span className="text-xs text-muted-foreground">{d.date}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold text-lg">₹ {d.value}</span>
                                    <button onClick={() => deleteEntry(d.id)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-2"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Maximized View Modal */}
                {isMaximized && (
                    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card w-full max-w-3xl max-h-[90vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold text-foreground">Historical NAV Data</h2>
                                    <p className="text-muted-foreground">Manage full history • Sorted latest first</p>
                                </div>
                                <button onClick={() => setIsMaximized(false)} className="px-5 py-2 bg-foreground text-background font-bold rounded-xl hover:opacity-90 transition-opacity">Close</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur-md">
                                        <tr>
                                            <th className="p-4 pl-6 text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                                            <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">NAV Value</th>
                                            <th className="p-4 pr-6 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {sortedData.map(d => (
                                            <tr key={d.id} className="group hover:bg-muted/30 transition-colors">
                                                <td className="p-4 pl-6">
                                                    <p className="font-bold text-foreground">
                                                        {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                    <span className="text-xs text-muted-foreground">{d.date}</span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/10 px-2 py-1 rounded-md">
                                                        ₹ {d.value}
                                                    </span>
                                                </td>
                                                <td className="p-4 pr-6 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setNewEntry({ date: d.date, value: d.value.toString() });
                                                                setIsMaximized(false);
                                                            }}
                                                            className="px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => deleteEntry(d.id)}
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
}
