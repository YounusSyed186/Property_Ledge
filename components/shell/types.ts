import type React from 'react';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** When true, only highlight on exact path match (not child routes). */
  exact?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export interface PageContext {
  title: string;
  subtitle: string;
}

export interface FooterLink {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface CommandMenuLink {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  navSections: NavSection[];
  variant: 'admin' | 'dashboard';
  homeHref: string;
  brandBadge?: string;
  footerLink?: FooterLink;
  headerExtras?: React.ReactNode;
  navbarContext?: React.ReactNode;
  mobileContextMenu?: React.ReactNode;
  sidebarExtras?: React.ReactNode;
  loadingMessage?: string;
  commandMenuLinks?: CommandMenuLink[];
  activeNavLayoutId?: string;
  hubLabel?: string;
  commandMenuFooter?: string;
  settingsHref?: string;
  persona?: string;
  useGlobalSearch?: boolean;
  showHelp?: boolean;
  showNotifications?: boolean;
  showWorkspaceSettings?: boolean;
  showBilling?: boolean;
  mobileBottomNav?: React.ReactNode;
}
