'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Building2,
  Home,
  Users,
  FileText,
  Receipt,
  Wrench,
  CheckSquare,
  Loader2,
} from 'lucide-react';
import { searchDashboardEntities, type SearchResult, type SearchResultType } from '@/app/actions/search';
import { cn } from '@/lib/utils';

const TYPE_ICONS: Record<SearchResultType, React.ComponentType<{ className?: string }>> = {
  property: Building2,
  unit: Home,
  tenant: Users,
  lease: FileText,
  invoice: Receipt,
  maintenance: Wrench,
  task: CheckSquare,
};

const TYPE_LABELS: Record<SearchResultType, string> = {
  property: 'Properties',
  unit: 'Units',
  tenant: 'Tenants',
  lease: 'Leases',
  invoice: 'Invoices',
  maintenance: 'Maintenance',
  task: 'Tasks',
};

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  quickLinks?: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
  footerLabel?: string;
}

export function GlobalSearch({
  isOpen,
  onClose,
  quickLinks = [],
  footerLabel = 'PropertyLedge Search',
}: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const runSearch = useCallback(async (value: string) => {
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const data = await searchDashboardEntities(value);
      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const groupedResults = results.reduce<Record<SearchResultType, SearchResult[]>>(
    (acc, result) => {
      if (!acc[result.type]) acc[result.type] = [];
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<SearchResultType, SearchResult[]>
  );

  const filteredQuickLinks = query
    ? quickLinks.filter((link) => link.label.toLowerCase().includes(query.toLowerCase()))
    : quickLinks;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16 sm:pt-24">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-admin-border bg-admin-surface shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 border-b border-admin-border bg-admin-sidebar-surface/60 px-4 py-3.5">
          <Search className="h-4 w-4 shrink-0 text-admin-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search properties, tenants, leases, invoices..."
            className="w-full bg-transparent font-sans text-sm text-admin-foreground placeholder:text-admin-muted focus:outline-none"
          />
          {isSearching && <Loader2 className="h-4 w-4 animate-spin text-admin-muted" />}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-admin-muted transition-colors hover:bg-admin-border/50 hover:text-admin-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[420px] space-y-3 overflow-y-auto p-3 font-sans">
          {query.length >= 2 && Object.keys(groupedResults).length > 0 && (
            <>
              {(Object.keys(groupedResults) as SearchResultType[]).map((type) => (
                <div key={type}>
                  <p className="mb-1.5 px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-admin-muted">
                    {TYPE_LABELS[type]}
                  </p>
                  <div className="space-y-0.5">
                    {groupedResults[type].map((result) => {
                      const Icon = TYPE_ICONS[result.type];
                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          type="button"
                          onClick={() => {
                            router.push(result.href);
                            onClose();
                          }}
                          className="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-admin-foreground transition-colors hover:bg-admin-primary-soft hover:text-admin-primary"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Icon className="h-4 w-4 shrink-0 text-admin-muted group-hover:text-admin-primary" />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{result.title}</p>
                              <p className="truncate text-[10px] text-admin-muted">{result.subtitle}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {query.length >= 2 && !isSearching && results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-admin-muted">No results found for &ldquo;{query}&rdquo;</p>
          )}

          {query.length < 2 && filteredQuickLinks.length > 0 && (
            <div>
              <p className="mb-1.5 px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-admin-muted">
                Quick Navigation
              </p>
              <div className="space-y-0.5">
                {filteredQuickLinks.map((link) => (
                  <button
                    key={link.href}
                    type="button"
                    onClick={() => {
                      router.push(link.href);
                      onClose();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-admin-foreground transition-colors hover:bg-admin-primary-soft hover:text-admin-primary"
                  >
                    <link.icon className="h-4 w-4 text-admin-muted" />
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-admin-border bg-admin-sidebar/40 px-4 py-2.5 text-[11px] text-admin-muted">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-admin-border bg-admin-surface px-1.5 py-0.5 font-mono text-[9px]">
              ESC
            </kbd>
            to close
          </span>
          <span className="font-mono text-[10px] text-admin-primary">{footerLabel}</span>
        </div>
      </div>
    </div>
  );
}
