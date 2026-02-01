"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Linkedin, Mail, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { dataService, TeamMember } from "@/services/dataService";

export default function TeamSection() {
    const [members, setMembers] = useState<TeamMember[]>([]);

    useEffect(() => {
        dataService.getTeam().then(setMembers);
    }, []);

    const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <section id="team" className="py-20 px-4 bg-background transition-colors">
            <div className="max-w-[1400px] mx-auto space-y-12">
                <div className="text-center">
                    <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                        Meet the <span className="text-accent">Team</span>
                    </h2>
                    <p className="text-lg text-muted-foreground">The minds behind Niveshak</p>
                </div>

                {sortedMembers.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 justify-center">
                        {sortedMembers.map((member, idx) => (
                            <TeamCard key={member.id} member={member} idx={idx} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

function TeamCard({ member, idx }: { member: TeamMember; idx: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05 }}
            className="group relative bg-card rounded-xl overflow-visible shadow-sm border border-border/50 hover:shadow-md hover:border-accent/40 hover:-translate-y-1 transition-all duration-300 p-4 flex flex-col items-center aspect-[4/5]"
        >
            <div className="flex-1 flex flex-col items-center justify-center w-full">
                <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden mb-6 border-2 border-muted group-hover:border-accent transition-colors shrink-0 shadow-sm">
                    <img
                        src={member.imageUrl || "/avatar_placeholder.png"}
                        alt={member.name}
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="h-11 w-full flex items-center justify-center mb-1">
                    <h3 className="text-base font-bold text-card-foreground text-center break-words leading-tight line-clamp-2">
                        {member.name}
                    </h3>
                </div>
                <p className="text-xs text-accent font-medium text-center uppercase tracking-wide mb-1">
                    {member.role}
                </p>
            </div>

            <div className="flex items-center gap-3 mt-auto relative z-10 pt-2">
                {member.linkedin && <SocialIcon type="linkedin" value={member.linkedin} />}
                {member.email && <SocialIcon type="email" value={member.email} />}
            </div>

            {/* Subtle Gradient Glow on Hover */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </motion.div>
    );
}

function SocialIcon({ type, value }: { type: "linkedin" | "email"; value: string }) {
    const [isHovered, setIsHovered] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const icon = type === "linkedin" ? <Linkedin className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />;

    // For display in tooltip
    const displayValue = type === "email" ? value : "LinkedIn Profile";
    const linkHref = type === "email" ? `mailto:${value}` : value;

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <a
                href={linkHref}
                target={type === "linkedin" ? "_blank" : undefined}
                className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-white transition-all shadow-sm transform hover:scale-110 active:scale-95 border border-transparent hover:border-white/10"
            >
                {icon}
            </a>

            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        className="absolute top-full mt-3 left-1/2 -translate-x-1/2 z-50 w-auto"
                    >
                        <div className="bg-zinc-900 text-white text-xs font-medium rounded-lg shadow-xl px-3 py-2 flex items-center gap-3 whitespace-nowrap min-w-[max-content] border border-zinc-800">
                            <span className="max-w-[180px] truncate">{displayValue}</span>
                            <button
                                onClick={handleCopy}
                                className="p-1 hover:bg-white/20 rounded-md transition-colors flex-shrink-0"
                                title="Copy"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        {/* Upward Pointing Arrow */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-[1px] border-4 border-transparent border-b-zinc-900" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
