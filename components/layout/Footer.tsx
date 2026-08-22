"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Heart, Send } from "lucide-react";

export function Footer() {
  const [email, setEmail] = useState("");

  const footerLinks = {
    PRODUCT: [
      { name: "Overview", href: "/#platform" },
      { name: "Features", href: "/#platform" },
      { name: "Integrations", href: "/#platform" },
      { name: "Security", href: "/#platform" },
    ],
    SOLUTIONS: [
      { name: "For Owners", href: "/solutions/owners" },
      { name: "For Property Managers", href: "#" },
      { name: "For Agencies", href: "#" },
      { name: "For Tenants", href: "#" },
    ],
    RESOURCES: [
      { name: "Help Center", href: "#" },
      { name: "Guides", href: "#" },
      { name: "Blog", href: "#" },
      { name: "Updates", href: "#" },
    ],
    COMPANY: [
      { name: "About", href: "#" },
      { name: "Careers", href: "#" },
      { name: "Contact", href: "#" },
    ],
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      alert(`Subscribed: ${email}`);
      setEmail("");
    }
  };

  return (
    <footer className="bg-surface dark:bg-[#0E1112] border-t border-border dark:border-[#2A3032] pt-16 pb-12 text-xs text-muted dark:text-[#AEB6B8]">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          
          {/* Brand Col */}
          <div className="md:col-span-4 space-y-5">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105">
                <img
                  src="/logo_Light.png"
                  alt="PropertyLedge Logo"
                  className="w-full h-full object-contain dark:hidden"
                />
                <img
                  src="/logo_Dark.png"
                  alt="PropertyLedge Logo"
                  className="w-full h-full object-contain hidden dark:block"
                />
              </div>
              <span className="font-heading font-bold text-lg tracking-tight text-foreground">
                PropertyLedge<span className="text-accent text-sm font-normal">.com.au</span>
              </span>
            </Link>
            <p className="text-muted dark:text-[#AEB6B8] leading-relaxed max-w-sm font-sans">
              The operating platform for modern Australian property management.
              Built for landlords, property managers, and agencies across Australia.
            </p>
          </div>

          {/* Nav Link Columns */}
          <div className="md:col-span-5 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title} className="space-y-3">
                <div className="font-heading font-bold text-[10px] uppercase tracking-wider text-foreground">
                  {title}
                </div>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="hover:text-accent dark:hover:text-accent-hover transition-colors duration-150 font-medium"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Stay Updated Column */}
          <div className="md:col-span-3 space-y-4">
            <div className="font-heading font-bold text-[10px] uppercase tracking-wider text-foreground">
              STAY UPDATED
            </div>
            <p className="text-[11px] text-muted leading-relaxed font-sans">
              Get the latest property management insights and product updates.
            </p>
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm">
              <input
                type="email"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-surface dark:bg-[#151A1C] border border-border dark:border-[#2A3032] hover:border-accent/40 dark:hover:border-accent/30 rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted focus:outline-none focus:border-accent transition-colors"
              />
              <button
                type="submit"
                className="px-3.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center border border-border dark:border-[#2A3032] active:scale-95 transition-all"
                aria-label="Subscribe"
              >
                <Send className="w-3.5 h-3.5 text-accent" />
              </button>
            </form>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/60 dark:border-[#2A3032]/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px]">
          <div>
            © 2026 PropertyLedge Pty Ltd • ABN 45 670 901 234. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <Link href="#" className="hover:underline">Privacy Policy</Link>
            <Link href="#" className="hover:underline">Terms of Service</Link>
            <div className="flex items-center gap-1">
              <span>Made with</span>
              <Heart className="w-3 h-3 text-accent fill-accent" />
              <span>in Australia</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
