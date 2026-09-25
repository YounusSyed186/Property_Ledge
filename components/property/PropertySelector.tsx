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
}

export function PropertySelector({ className, showCreateLink = true, onCreateClick, variant = 'sidebar' }: PropertySelectorProps) {
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
    ? 'flex h-8 items-center gap-2 rounded-lg border border-admin-sidebar-border bg-[#071526]/80 px-2.5 text-xs font-medium text-admin-sidebar-foreground transition-all hover:bg-[#0E1E33] hover:border-admin-primary/40 focus:outline-none focus:ring-1 focus:ring-admin-primary/30'
    : 'flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors min-w-[200px] max-w-[300px]';

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

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
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
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-admin-sidebar-muted hidden lg:inline">
            Property
          </span>
          <span className="text-admin-sidebar-muted/40 hidden lg:inline" aria-hidden>·</span>
          <span className="max-w-[140px] truncate text-left font-semibold text-admin-sidebar-foreground" data-testid="current-property">
            {selectedProperty ? selectedProperty.propertyName : 'All Properties'}
          </span>
        </div>
        <ChevronsUpDown className="h-3 w-3 shrink-0 text-admin-sidebar-muted ml-0.5" />
      </button>

      {isOpen && (
        <div className={cn(
          'absolute z-50 mt-1.5 w-80 overflow-hidden rounded-xl border border-admin-border bg-admin-surface shadow-elevation-3 animate-in fade-in zoom-in-95 duration-120',
          isNavbar ? 'left-0' : 'right-0'
        )}>
          <div className="border-b border-admin-border/70 px-3.5 py-2.5 flex items-center justify-between bg-admin-surface-subtle/40">
            <div>
              <p className="text-[11px] font-semibold text-admin-foreground">Property Context</p>
              <p className="text-[10px] text-admin-muted">Filter workspace by property</p>
            </div>
            <div className="flex items-center gap-1.5">
              {isRefreshing && (
                <Loader2 className="h-3 w-3 animate-spin text-admin-primary shrink-0" />
              )}
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-admin-primary-soft text-admin-primary border border-admin-primary/20">
                {availableProperties.length} properties
              </span>
            </div>
          </div>
          <div className="border-b border-admin-border/70 p-2.5 bg-admin-surface">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-admin-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search properties by name..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-admin-border bg-admin-surface-subtle text-xs text-admin-foreground placeholder:text-admin-muted focus:outline-none focus:ring-1 focus:ring-admin-primary focus:border-admin-primary/50 transition-colors"
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
            <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
              <button
                type="button"
                onClick={handleSelectAll}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-all text-left group',
                  !selectedProperty
                    ? 'bg-admin-primary-soft font-semibold text-admin-primary border border-admin-primary/25 shadow-xs'
                    : 'text-admin-foreground hover:bg-admin-surface-subtle border border-transparent'
                )}
              >
                <div className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold',
                  !selectedProperty
                    ? 'bg-admin-primary text-white border-admin-primary'
                    : 'bg-admin-surface-subtle text-admin-muted border-admin-border group-hover:border-admin-primary/30'
                )}>
                  ALL
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate leading-tight">All Properties</p>
                  <p className="text-[10px] text-admin-muted truncate mt-0.5">Whole portfolio summary</p>
                </div>
                {!selectedProperty && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-admin-primary/15 text-admin-primary">Selected</span>
                )}
              </button>

              <div className="my-1 border-t border-admin-border/50" />

              {filteredProperties.map((property) => {
                const isSelected = selectedProperty?.propertyId === property.propertyId;
                return (
                  <button
                    key={property.propertyId}
                    onClick={() => handleSelect(property)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all text-left group',
                      isSelected
                        ? 'bg-admin-primary-soft text-admin-primary font-semibold border border-admin-primary/25 shadow-xs'
                        : 'text-admin-foreground hover:bg-admin-surface-subtle border border-transparent'
                    )}
                  >
                    <div className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold transition-colors',
                      isSelected
                        ? 'bg-admin-primary text-white border-admin-primary'
                        : 'bg-admin-surface-subtle text-admin-muted border-admin-border group-hover:border-admin-primary/30'
                    )}>
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate leading-tight">{property.propertyName}</p>
                      {property.organizationName && (
                        <p className="text-[10px] text-admin-muted truncate mt-0.5">{property.organizationName}</p>
                      )}
                    </div>
                    {isSelected ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-admin-primary/15 text-admin-primary">Selected</span>
                    ) : (
                      property.role && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-admin-surface-subtle text-admin-muted capitalize shrink-0 border border-admin-border/60">
                          {property.role}
                        </span>
                      )
                    )}
                  </button>
                );
              })}

              {filteredProperties.length === 0 && searchQuery && (
                <div className="p-4 text-center text-xs text-admin-muted">
                  No properties matching &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          )}

          {showCreateLink && (
            <div className="border-t border-admin-border/70 p-2 bg-admin-surface-subtle/30">
              <button
                type="button"
                onClick={handleCreate}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-admin-primary transition-all hover:bg-admin-primary-soft hover:shadow-xs border border-admin-primary/20"
              >
                <Plus className="h-3.5 w-3.5" />
                Add property
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}