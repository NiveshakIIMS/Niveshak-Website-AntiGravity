"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Target, Users, BookOpen, Info, ArrowRight } from "lucide-react";
import { AboutContent } from "@/services/dataService";

interface AboutSectionProps {
    initialData: AboutContent;
}

export default function AboutSection({ initialData }: AboutSectionProps) {
    const content = initialData;

    // Default Icons for the 3 cards
    const icons = [
        <Target key="target" className="w-8 h-8 text-blue-400" />,
        <Users key="users" className="w-8 h-8 text-blue-400" />,
        <BookOpen key="book" className="w-8 h-8 text-blue-400" />
    ];

    const features = content?.cards ? content.cards.map((card, idx) => ({
        icon: icons[idx] || <Info className="w-8 h-8 text-blue-400" />,
        title: card.title,
        description: card.description
    })) : [];

    // Helper to split title for styling (Last word accent)
    const renderTitle = (title: string) => {
        const parts = title.split(" ");
        if (parts.length < 2) return title;
        const last = parts.pop();
        return <>{parts.join(" ")} <span className="text-accent">{last}</span></>;
    };

    return (
        <section id="about" className="pt-32 pb-20 px-4 bg-background transition-colors space-y-32">
            {(content.sections && content.sections.length > 0 ? content.sections : [{
                id: 'default',
                title: content.title || "About Niveshak",
                description: content.description || "",
                cards: content.cards || [],
                displayOrder: 0
            }]).map((section, sIdx) => {
                const sectionFeatures = section.cards ? section.cards.map((card, idx) => ({
                    icon: icons[idx % icons.length] || <Info className="w-8 h-8 text-blue-400" />,
                    title: card.title,
                    description: card.description
                })) : [];

                return (
                    <div key={section.id || sIdx} className="max-w-6xl mx-auto text-center">
                        <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                            {renderTitle(section.title || "About Us")}
                        </h2>
                        <div className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12 space-y-4">
                            <p>{section.description}</p>
                        </div>

                        {sectionFeatures.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                                {sectionFeatures.map((feature, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: false }}
                                        transition={{ delay: idx * 0.2 }}
                                        className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-xl hover:shadow-2xl transition-all"
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
                        )}
                    </div>
                );
            })}

            <div className="max-w-6xl mx-auto text-center mt-12 pt-4">
                <Link href="/about" className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-accent text-white font-semibold hover:bg-blue-600 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    Know More <ArrowRight className="w-5 h-5" />
                </Link>
            </div>
        </section>
    );
}
