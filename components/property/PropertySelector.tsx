'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronsUpDown, Building2, Plus, Search, Loader2 } from 'lucide-react';
import { usePropertyContext } from '@/components/property/PropertyContext';
import type { UserPropertyAccess } from '@/lib/properties/queries';
import { DiceBearIcon } from '@/components/ui/avatar/DiceBearIcon';
import { cn } from '@/lib/utils';

interface PropertySelectorProps {
  className?: string;
  showCreateLink?: boolean;
  onCreateClick?: () => void;
  variant?: 'sidebar' | 'navbar';
  isCollapsed?: boolean;
}

export function PropertySelector({ className, showCreateLink = true, onCreateClick, variant = 'sidebar', isCollapsed = false }: PropertySelectorProps) {
  const router = useRouter();
  const { availableProperties, selectedProperty, setSelectedProperty, isLoading, isRefreshing, error, refreshProperties, hasPropertyAccess } = usePropertyContext();

  const handleCreate = () => {
    if (onCreateClick) {
      onCreateClick();
    } else {
      router.push('/dashboard/properties?new=true');
    }
  };
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const filteredProperties = availableProperties.filter(p =>
    p.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.organizationName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isNavbar = variant === 'navbar';
  const triggerClass = isNavbar
    ? 'flex h-9 items-center gap-2 rounded-xl border border-slate-200/90 dark:border-[#17283A] bg-white dark:bg-[#07111F] px-2.5 text-[13px] font-medium text-slate-800 dark:text-white transition-all hover:bg-slate-50 dark:hover:bg-[#0E1E33] hover:border-[#008F83]/50 focus:outline-none focus:ring-2 focus:ring-[#008F83]/30 cursor-pointer shadow-xs'
    : isCollapsed
    ? 'w-9 h-9 mx-auto rounded-xl border border-slate-200 dark:border-[#17283A] bg-white dark:bg-[#07111F] flex items-center justify-center text-[#008F83] hover:bg-slate-50 dark:hover:bg-[#0E1E33] transition-all cursor-pointer shadow-xs'
    : 'flex w-full items-center justify-between gap-2.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-[#17283A] bg-white dark:bg-[#07111F] text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-[#0E1E33] transition-all cursor-pointer shadow-xs';

  const handleSelectAll = () => {
    setSelectedProperty(null);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSelect = (property: UserPropertyAccess) => {
    if (hasPropertyAccess(property.propertyId)) {
      setSelectedProperty(property);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const currentDisplayName = selectedProperty ? selectedProperty.propertyName : 'All Properties';

  return (
    <div
      className={cn('relative', isCollapsed ? 'w-full flex justify-center' : 'w-full', className)}
      ref={dropdownRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) {
            refreshProperties();
          }
        }}
        data-testid="property-selector"
        className={cn(triggerClass)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title={isCollapsed ? `Property: ${currentDisplayName}` : undefined}
      >
        {isCollapsed ? (
          <Building2 className="w-4 h-4 text-[#008F83] dark:text-[#32D5C4]" />
        ) : (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#008F83] dark:text-[#32D5C4] bg-[#008F83]/10 dark:bg-[#008F83]/20 px-1.5 py-0.5 rounded border border-[#008F83]/25 shrink-0">
                Property
              </span>
              <span className="max-w-[140px] sm:max-w-[170px] truncate text-left font-semibold text-slate-900 dark:text-white text-[13px]" data-testid="current-property">
                {currentDisplayName}
              </span>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-[#94A3B8] ml-0.5" />
          </>
        )}
      </button>

      {/* Tooltip in collapsed mode */}
      {isCollapsed && isHovered && !isOpen && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 px-3 py-1.5 rounded-lg bg-[#0E1E33] text-white border border-[#1E293B] font-medium text-[12px] shadow-elevation-2 whitespace-nowrap pointer-events-none flex items-center gap-1.5">
          <span className="text-[#32D5C4] font-bold">Property:</span> {currentDisplayName}
        </div>
      )}

      {isOpen && (
        <div className={cn(
          'absolute z-50 mt-2 w-84 overflow-hidden rounded-2xl border border-slate-200 dark:border-[#17283A] bg-white dark:bg-[#07111F] shadow-xl animate-in fade-in zoom-in-95 duration-120',
          isCollapsed ? 'left-full top-0 ml-3 mt-0' : isNavbar ? 'left-0' : 'left-0 right-0'
        )}>
          <div className="border-b border-slate-100 dark:border-[#17283A] px-4 py-3 flex items-center justify-between bg-slate-50/60 dark:bg-[#0B1726]/40">
            <div>
              <p className="text-[13px] font-bold text-slate-900 dark:text-white">Property Context</p>
              <p className="text-[11px] text-slate-400 dark:text-[#7F8B99]">Filter workspace by property</p>
            </div>
            <div className="flex items-center gap-1.5">
              {isRefreshing && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-admin-primary shrink-0" />
              )}
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-admin-primary-soft text-admin-primary border border-admin-primary/25">
                {availableProperties.length} managed
              </span>
            </div>
          </div>
          <div className="border-b border-admin-border p-3 bg-admin-surface">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search properties by name..."
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-admin-border bg-admin-surface-subtle text-[13px] text-admin-foreground placeholder:text-admin-muted focus:outline-none focus:ring-2 focus:ring-admin-primary/25 focus:border-admin-primary transition-all"
              />
            </div>
          </div>

          {isLoading && availableProperties.length === 0 ? (
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2 px-2 py-1.5 animate-pulse">
                <div className="h-4 w-4 rounded-md bg-admin-border" />
                <div className="h-3.5 w-24 rounded bg-admin-border" />
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 animate-pulse">
                <div className="h-4 w-4 rounded-md bg-admin-border" />
                <div className="h-3.5 w-32 rounded bg-admin-border" />
              </div>
            </div>
          ) : error ? (
            <div className="p-3 text-center">
              <p className="text-xs text-red-500 mb-1">Couldn&apos;t load properties</p>
              <button
                type="button"
                onClick={() => refreshProperties()}
                className="text-xs text-admin-primary hover:underline font-semibold"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="max-h-76 overflow-y-auto p-2 space-y-1">
              <button
                type="button"
                onClick={handleSelectAll}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-all text-left group cursor-pointer',
                  !selectedProperty
                    ? 'bg-admin-primary-soft font-semibold text-admin-primary border border-admin-primary/25 shadow-xs'
                    : 'text-admin-foreground hover:bg-admin-surface-subtle border border-transparent'
                )}
              >
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold',
                  !selectedProperty
                    ? 'bg-admin-primary text-white border-admin-primary'
                    : 'bg-admin-surface-subtle text-admin-muted border-admin-border group-hover:border-admin-primary/30'
                )}>
                  ALL
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate leading-tight">All Properties</p>
                  <p className="text-[11px] text-admin-muted truncate mt-0.5">Whole portfolio summary</p>
                </div>
                {!selectedProperty && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-admin-primary/15 text-admin-primary border border-admin-primary/30">Active</span>
                )}
              </button>

              <div className="my-1.5 border-t border-admin-border" />

              {filteredProperties.map((property) => {
                const isSelected = selectedProperty?.propertyId === property.propertyId;
                return (
                  <button
                    key={property.propertyId}
                    onClick={() => handleSelect(property)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] transition-all text-left group cursor-pointer',
                      isSelected
                        ? 'bg-admin-primary-soft text-admin-primary font-semibold border border-admin-primary/25 shadow-xs'
                        : 'text-admin-foreground hover:bg-admin-surface-subtle border border-transparent'
                    )}
                  >
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold transition-colors',
                      isSelected
                        ? 'bg-admin-primary text-white border-admin-primary'
                        : 'bg-admin-surface-subtle text-admin-muted border-admin-border group-hover:border-admin-primary/30'
                    )}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate leading-tight">{property.propertyName}</p>
                      {property.organizationName && (
                        <p className="text-[11px] text-admin-muted truncate mt-0.5">{property.organizationName}</p>
                      )}
                    </div>
                    {isSelected ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-admin-primary/15 text-admin-primary border border-admin-primary/30">Active</span>
                    ) : (
                      property.role && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-admin-surface-subtle text-admin-muted capitalize shrink-0 border border-admin-border">
                          {property.role}
                        </span>
                      )
                    )}
                  </button>
                );
              })}

              {filteredProperties.length === 0 && searchQuery && (
                <div className="p-5 text-center text-[13px] text-admin-muted">
                  No properties matching &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          )}

          {showCreateLink && (
            <div className="border-t border-admin-border p-2.5 bg-admin-surface-subtle/40">
              <button
                type="button"
                onClick={handleCreate}
                className="flex w-full items-center justify-center gap-2 rounded-xl h-10 px-4 text-[13px] font-semibold text-admin-primary transition-all hover:bg-admin-primary-soft hover:shadow-xs border border-admin-primary/25 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add New Property
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}