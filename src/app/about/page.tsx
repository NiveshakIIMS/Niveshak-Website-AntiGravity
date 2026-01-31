"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Target, Users, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { dataService, AboutContent } from "@/services/dataService";

export default function About() {
    const [data, setData] = useState<AboutContent | null>(null);

    useEffect(() => {
        dataService.getAbout().then(setData);
    }, []);

    const features = [
        {
            icon: <Target className="w-8 h-8 text-blue-400" />,
            title: "Our Mission",
            description: "To bridge the gap between theoretical financial concepts and real-world application through workshops, competitions, and live projects."
        },
        {
            icon: <Users className="w-8 h-8 text-blue-400" />,
            title: "Who We Are",
            description: "A student-run body at IIM Shillong dedicated to fostering a culture of financial awareness and investment acumen among students."
        },
        {
            icon: <BookOpen className="w-8 h-8 text-blue-400" />,
            title: "What We Do",
            description: "We publish the monthly 'Niveshak' magazine, manage the student investment fund (NIF), and organize the flagship 'Finathlon' event."
        }
    ];

    // Helper to split title for styling (Last word accent)
    const renderTitle = (title: string) => {
        if (!title) return "";
        const parts = title.split(" ");
        if (parts.length < 2) return title;
        const last = parts.pop();
        return <>{parts.join(" ")} <span className="text-accent">{last}</span></>;
    };

    if (!data) return null;

    return (
        <main className="min-h-screen bg-background">
            <Navbar />

            {/* Header */}
            <section className="pt-32 pb-20 px-4 bg-background border-b border-border relative overflow-hidden transition-colors">
                <div className="absolute inset-0 bg-accent/5" />
                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-bold text-foreground mb-6"
                    >
                        {renderTitle(data.title)}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-muted-foreground max-w-2xl mx-auto"
                    >
                        {data.description}
                    </motion.p>
                </div>
            </section>

            {/* Content Grid */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-12">
                        Shaping <span className="text-accent">Future Leaders</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {features.map((feature, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.2 }}
                                className="p-8 rounded-2xl bg-card border border-border shadow-xl hover:shadow-2xl transition-all"
                            >
                                <div className="mb-6 p-4 rounded-full bg-muted w-fit mx-auto">
                                    {feature.icon}
                                </div>
                                <h3 className="text-2xl font-bold text-card-foreground mb-4">{feature.title}</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {feature.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Dynamic Rich Content Section */}
            {data.richContent && data.richContent.length > 0 && (
                <section className="py-20 bg-muted/30">
                    <div className="max-w-4xl mx-auto px-4">
                        <div className="space-y-12">
                            {data.richContent.map((block) => (
                                <motion.div
                                    key={block.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                >
                                    {block.type === "heading" && (
                                        <h2 className="text-3xl font-bold text-foreground mb-6 text-center">{block.content}</h2>
                                    )}
                                    {block.type === "paragraph" && (
                                        <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">{block.content}</p>
                                    )}
                                    {block.type === "image" && (
                                        <div className={`my-8 flex ${block.style?.align === "left" ? "justify-start" : block.style?.align === "right" ? "justify-end" : "justify-center"}`}>
                                            <div
                                                className="rounded-2xl overflow-hidden shadow-2xl"
                                                style={{ width: `${block.style?.width || 100}%` }}
                                            >
                                                <img src={block.content} alt="Content Image" className="w-full h-auto" />
                                            </div>
                                        </div>
                                    )}
                                    {block.type === "double_image" && (
                                        <div className="my-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {(() => {
                                                const [url1, url2] = block.content.split("|||");
                                                return (
                                                    <>
                                                        <div className="rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow">
                                                            <img
                                                                src={url1}
                                                                alt="Content Image"
                                                                className="w-full h-64 md:h-80 object-cover hover:scale-105 transition-transform duration-500"
                                                            />
                                                        </div>
                                                        <div className="rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow">
                                                            <img
                                                                src={url2}
                                                                alt="Content Image"
                                                                className="w-full h-64 md:h-80 object-cover hover:scale-105 transition-transform duration-500"
                                                            />
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <Footer />
        </main>
    );
}
