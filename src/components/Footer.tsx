"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Youtube, Check, Copy, Globe } from "lucide-react";
import { dataService, SocialLink } from "@/services/dataService";

export default function Footer() {
    const [links, setLinks] = useState<SocialLink[]>([]);

    useEffect(() => {
        dataService.getSiteSettings().then(settings => {
            if (settings.socialLinks) {
                setLinks(settings.socialLinks.filter(l => l.isActive));
            }
        });
    }, []);

    const getIcon = (platform: string) => {
        switch (platform) {
            case "linkedin": return Linkedin;
            case "instagram": return Instagram;
            case "facebook": return Facebook;
            case "twitter": return Twitter;
            case "youtube": return Youtube;
            case "email": return Mail;
            default: return Globe;
        }
    };

    const getHref = (link: SocialLink) => {
        if (link.platform === "email" && !link.url.startsWith("mailto:")) {
            return `mailto:${link.url}`;
        }
        return link.url;
    };

    return (
        <footer className="bg-navy-900 text-gray-300 py-12 border-t border-white/10 relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-white uppercase tracking-wider">Niveshak</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            The Investment & Finance Club of IIM Shillong. Democratizing financial knowledge since 2008.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-4 uppercase tracking-wide">Quick Links</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/about" className="hover:text-blue-400 transition-colors">About Us</Link></li>
                            <li><Link href="/team" className="hover:text-blue-400 transition-colors">Team</Link></li>
                            <li><Link href="/magazines" className="hover:text-blue-400 transition-colors">Niveshak Magazine</Link></li>
                            <li><Link href="/dashboard" className="hover:text-blue-400 transition-colors">Niveshak Investment Fund (NIF)</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-4 uppercase tracking-wide">Contact</h4>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-blue-400" />
                                <a href="mailto:niveshak@iimshillong.ac.in" className="hover:text-blue-400 transition-colors">niveshak@iimshillong.ac.in</a>
                            </li>
                            <li className="text-gray-400">IIM Shillong, Umsawli</li>
                            <li className="text-gray-400">Shillong, Meghalaya 793018</li>
                        </ul>
                    </div>

                    {/* Social */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-4 uppercase tracking-wide">Follow Us</h4>
                        <div className="flex flex-wrap gap-3">
                            {links.length > 0 ? (
                                links.map(link => {
                                    const Icon = getIcon(link.platform);
                                    return (
                                        <a
                                            key={link.id}
                                            href={getHref(link)}
                                            target={link.platform === "email" ? undefined : "_blank"}
                                            rel="noopener noreferrer"
                                            className="p-2.5 bg-white/5 rounded-full hover:bg-blue-600 hover:text-white text-gray-400 transition-all transform hover:-translate-y-1"
                                            title={link.label || link.platform}
                                        >
                                            <Icon className="w-5 h-5" />
                                        </a>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-gray-500 italic">Connect with us soon.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/10 text-center text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} Niveshak, IIM Shillong. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
