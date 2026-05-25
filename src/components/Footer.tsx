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
                {/* Brand */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-5 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start text-left ml-0 lg:-ml-12">
                        <div className="flex gap-6 shrink-0">
                            <a href="https://www.iimshillong.ac.in/" target="_blank" rel="noopener noreferrer" className="shrink-0 hover:opacity-90 transition-opacity">
                                <img src="/iim-shillong-logo.png" alt="IIM Shillong" className="w-24 h-24 lg:w-28 lg:h-28 bg-white rounded-full p-0.5 object-contain shadow-lg" />
                            </a>
                            <a href="/" className="shrink-0 hover:opacity-90 transition-opacity">
                                <img src="/logo.png" alt="Niveshak" className="w-24 h-24 lg:w-28 lg:h-28 bg-white rounded-full p-0.5 object-contain shadow-lg" />
                            </a>
                        </div>
                        <div className="flex flex-col gap-4 pt-0 lg:pt-1.5 pl-0 lg:pl-2">
                            <h3 className="text-lg font-semibold text-white uppercase tracking-wide leading-none">Niveshak</h3>
                            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                                The Finance and Investment Club of IIM Shillong. Democratizing financial knowledge since 2008.
                            </p>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="lg:col-span-2 lg:col-start-6 pt-1.5">
                        <h4 className="text-lg font-semibold text-white mb-4 uppercase tracking-wide leading-none">Quick Links</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/about" className="hover:text-blue-400 transition-colors">About Us</Link></li>
                            <li><Link href="/team" className="hover:text-blue-400 transition-colors">Team</Link></li>
                            <li><Link href="/magazines" className="hover:text-blue-400 transition-colors">Niveshak Magazine</Link></li>
                            <li><Link href="/dashboard" className="hover:text-blue-400 transition-colors">NIF Dashboard</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="lg:col-span-3 pt-1.5">
                        <h4 className="text-lg font-semibold text-white mb-4 uppercase tracking-wide leading-none">Contact</h4>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                                <a href="mailto:niveshak@iimshillong.ac.in" className="hover:text-blue-400 transition-colors break-all">niveshak@iimshillong.ac.in</a>
                            </li>
                            <li className="text-gray-400">IIM Shillong, Umsawli</li>
                            <li className="text-gray-400">Shillong, Meghalaya 793018</li>
                        </ul>
                    </div>

                    {/* Social */}
                    <div className="lg:col-span-2 pt-1.5">
                        <h4 className="text-lg font-semibold text-white mb-4 uppercase tracking-wide leading-none">Follow Us</h4>
                        <div className="grid grid-cols-4 gap-3 w-max">
                            {links.length > 0 ? (
                                links.map(link => {
                                    const Icon = getIcon(link.platform);
                                    return (
                                        <a
                                            key={link.id}
                                            href={getHref(link)}
                                            target={link.platform === "email" ? undefined : "_blank"}
                                            rel="noopener noreferrer"
                                            className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full hover:bg-blue-600 hover:text-white text-gray-400 transition-all transform hover:-translate-y-1"
                                            title={link.label || link.platform}
                                        >
                                            <Icon className="w-5 h-5" />
                                        </a>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-gray-500 italic col-span-4">Connect soon.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/10 text-center text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} Niveshak, IIM Shillong. All rights reserved.
                </div>
            </div>
        </footer >
    );
}
