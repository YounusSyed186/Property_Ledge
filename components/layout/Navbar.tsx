"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Menu, X, ChevronDown, Sparkles, Building2, DollarSign, FileText, ClipboardCheck, BarChart3, User, LogOut, Grid, ShieldCheck } from "lucide-react";
import { ServicesDropdown } from "@/components/marketing/owners/ServicesDropdown";
import { services } from "@/lib/owners/owner-data";
import { createClient } from "@/lib/supabase/client";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileAccordionOpen, setMobileAccordionOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Fetch Supabase user and subscribe to auth state changes
  useEffect(() => {
    const supabase = createClient();

    async function fetchUserData(sessionUser: any) {
      if (!sessionUser) {
        setUser(null);
        return;
      }
      try {
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", sessionUser.id)
          .maybeSingle();

        setUser({
          id: sessionUser.id,
          email: sessionUser.email,
          full_name: profile?.full_name || sessionUser.user_metadata?.full_name || sessionUser.email?.split("@")[0],
          avatar_url: profile?.avatar_url || sessionUser.user_metadata?.avatar_url,
        });
      } catch {
        setUser({
          id: sessionUser.id,
          email: sessionUser.email,
          full_name: sessionUser.user_metadata?.full_name || sessionUser.email?.split("@")[0],
          avatar_url: sessionUser.user_metadata?.avatar_url,
        });
      }
    }

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (currentUser) {
        fetchUserData(currentUser);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchUserData(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Keyboard navigation & click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDropdownOpen(false);
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 180);
  };

  const navLinks = [
    { name: "Product", href: "/#platform", hasDropdown: false },
    { name: "Services", href: "#", hasDropdown: true },
    { name: "Pricing", href: "/#pricing", hasDropdown: false },
    { name: "Resources", href: "/#platform", hasDropdown: false },
    { name: "About", href: "/#platform", hasDropdown: false },
  ];

  const getIcon = (title: string) => {
    switch (title) {
      case "For Property Owners":
        return Sparkles;
      case "Property Portfolio":
        return Building2;
      case "Rent & Payments":
        return DollarSign;
      case "Leases":
        return FileText;
      case "Inspections":
        return ClipboardCheck;
      case "Financial Reporting":
        return BarChart3;
      default:
        return Building2;
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 flex justify-center ${
        isScrolled ? "top-3 px-4 sm:px-6" : "top-0 px-0"
      }`}
    >
      <div
        className={`w-full flex items-center justify-between transition-all duration-300 relative ${
          isScrolled
            ? "max-w-[1020px] px-5 sm:px-6 py-2.5 rounded-full bg-white/90 dark:bg-[#0E1112]/90 backdrop-blur-xl border border-black/10 dark:border-[#2A3032]/80 shadow-lg shadow-black/5 dark:shadow-black/30"
            : "max-w-[1440px] px-5 sm:px-8 py-5 sm:py-6 bg-transparent dark:bg-transparent border-b border-transparent"
        }`}
      >
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div
            className={`flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${
              isScrolled ? "w-7 h-7" : "w-8 sm:w-9 h-8 sm:h-9"
            }`}
          >
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
          <span
            className={`font-heading font-bold tracking-tight text-foreground transition-all duration-300 ${
              isScrolled ? "text-base" : "text-lg sm:text-xl"
            }`}
          >
            PropertyLedge<span className="text-accent text-xs sm:text-sm font-normal">.com.au</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          className={`hidden lg:flex items-center text-sm font-semibold text-[#3F4E55] dark:text-[#A9B1B3] transition-all duration-300 ${
            isScrolled ? "gap-6" : "gap-8"
          }`}
        >
          {navLinks.map((link) => {
            if (link.hasDropdown) {
              return (
                <div
                  key={link.name}
                  ref={dropdownRef}
                  className="relative"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-expanded={dropdownOpen}
                    aria-haspopup="true"
                    className="flex items-center gap-1 hover:text-[#22333B] dark:hover:text-[#F4F1EC] transition-colors duration-200 py-1 focus:outline-none"
                  >
                    <span>{link.name}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        dropdownOpen ? "rotate-180 text-[#22333B] dark:text-[#F4F1EC]" : ""
                      }`}
                    />
                  </button>

                  <ServicesDropdown isOpen={dropdownOpen} onClose={() => setDropdownOpen(false)} />
                </div>
              );
            }

            return (
              <Link
                key={link.name}
                href={link.href}
                className="hover:text-[#22333B] dark:hover:text-[#F4F1EC] transition-colors duration-200 py-1"
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Items */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all border border-black/10 dark:border-white/15 focus:outline-none bg-surface-subtle/50 dark:bg-[#1A2226]"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name || "Profile"}
                    className="w-7 h-7 rounded-full object-cover border border-accent shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-foreground text-background font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <span className="text-xs font-bold text-foreground max-w-[140px] truncate">
                  {user.full_name || "Account"}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${profileMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-surface dark:bg-[#121719] border border-border dark:border-[#2A3032] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3 border-b border-border/70 dark:border-[#2A3032]/70 flex items-center gap-3">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="w-9 h-9 rounded-full object-cover border border-accent"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-foreground text-background font-bold text-xs flex items-center justify-center">
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{user.full_name || "User"}</p>
                      <p className="text-[10px] text-muted truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="py-1.5 space-y-0.5 text-xs font-medium">
                    <Link
                      href="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-accent/10 hover:text-accent transition-colors"
                    >
                      <User className="w-4 h-4 text-accent" />
                      <span>Account Management</span>
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-accent/10 hover:text-accent transition-colors"
                    >
                      <Grid className="w-4 h-4 text-accent" />
                      <span>Workspace</span>
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        setProfileMenuOpen(false);
                        const { logoutAction } = await import("@/lib/auth/actions");
                        await logoutAction();
                        window.location.href = "/login";
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold text-[#22333B] dark:text-[#F4F1EC]/80 hover:text-[#A9927D] dark:hover:text-white transition-colors px-3 py-1.5 cursor-pointer"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className={`inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-lg group select-none active:scale-[0.98] bg-[#22333B] text-white dark:bg-[#F4F1EC] dark:text-[#071014] hover:bg-[#22333B]/90 dark:hover:bg-white shadow-sm hover:shadow-md cursor-pointer ${
                  isScrolled ? "text-xs px-3.5 py-1.5 h-8 gap-1" : "text-xs px-4 py-2 h-9 gap-1.5"
                }`}
              >
                <span>Start Free Trial</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>

        {/* Mobile Hamburger & Theme Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg border border-border dark:border-[#2A3032] text-foreground hover:bg-surface dark:hover:bg-[#151A1C]"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden bg-background/95 dark:bg-[#0E1112]/95 backdrop-blur-xl px-6 py-6 transition-all duration-300 ${
            isScrolled
              ? "w-full max-w-[1020px] mt-2 rounded-2xl border border-black/10 dark:border-[#2A3032] shadow-xl"
              : "w-full border-b border-t border-border dark:border-[#2A3032] mt-0"
          }`}
        >
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => {
              if (link.hasDropdown) {
                return (
                  <div key={link.name} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setMobileAccordionOpen(!mobileAccordionOpen)}
                      className="flex items-center justify-between text-base font-medium text-foreground py-2 border-b border-border-subtle dark:border-[#2A3032]/40"
                    >
                      <span>{link.name}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${mobileAccordionOpen ? "rotate-180" : ""}`} />
                    </button>
                    
                    {/* Mobile Services Accordion */}
                    {mobileAccordionOpen && (
                      <div className="pl-4 py-2 space-y-3.5 border-l border-border/60 dark:border-[#2A3032]/60 mt-2 bg-surface-subtle/25 dark:bg-[#151A1C]/25 rounded-r-lg">
                        {services.map((subLink) => {
                          const Icon = getIcon(subLink.title);
                          return (
                            <Link
                              key={subLink.title}
                              href={subLink.href}
                              onClick={() => {
                                setMobileMenuOpen(false);
                                setMobileAccordionOpen(false);
                              }}
                              className="flex items-start gap-2.5 text-sm font-medium text-muted hover:text-accent py-1"
                            >
                              <Icon className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                              <div>
                                <div className="text-xs font-semibold text-foreground">{subLink.title}</div>
                                <div className="text-[10px] text-muted leading-tight mt-0.5">{subLink.description}</div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-foreground hover:text-accent py-2 border-b border-border-subtle dark:border-[#2A3032]/40"
                >
                  {link.name}
                </Link>
              );
            })}
            
            <div className="flex flex-col gap-3 pt-4">
              {user ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-semibold border border-border dark:border-[#2A3032] rounded-lg text-foreground bg-surface hover:bg-surface-subtle"
                  >
                    Account Management
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      const { logoutAction } = await import("@/lib/auth/actions");
                      await logoutAction();
                      window.location.href = "/login";
                    }}
                    className="w-full text-center py-2.5 text-sm font-semibold bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-medium border border-border dark:border-[#2A3032] rounded-lg text-foreground hover:bg-surface"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-medium bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors"
                  >
                    Start Free Trial &rarr;
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
