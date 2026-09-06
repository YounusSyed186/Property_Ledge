'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronsUpDown, Building2, Plus, Search } from 'lucide-react';
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
  const { availableProperties, selectedProperty, setSelectedProperty, isLoading, error, refreshProperties, hasPropertyAccess } = usePropertyContext();

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
    ? 'flex h-8 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-admin-sidebar-foreground transition-colors hover:bg-admin-sidebar-hover focus:outline-none'
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

  if (isLoading) {
    return (
      <div className={cn('relative', className)}>
        <button
          ref={buttonRef}
          type="button"
          disabled
          className={cn(triggerClass, 'text-admin-sidebar-muted opacity-60')}
        >
          <div className="h-4 w-4 rounded-md bg-admin-sidebar-border animate-pulse" />
          <span className="w-20 h-3.5 rounded bg-admin-sidebar-border animate-pulse inline-block" />
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('relative', className)}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => refreshProperties()}
          title="Click to retry loading properties"
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs font-medium hover:bg-red-100 transition-colors"
        >
          <span>Couldn&apos;t load properties</span>
          <span className="underline font-semibold text-[11px]">Try again</span>
        </button>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="property-selector"
        className={cn(triggerClass)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <DiceBearIcon name="building" badge variant="red" size={13} />
        <span className="max-w-[130px] truncate text-left font-semibold text-admin-sidebar-foreground" data-testid="current-property">
          {selectedProperty ? selectedProperty.propertyName : 'All Properties'}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-admin-sidebar-muted" />
      </button>

      {isOpen && (
        <div className={cn(
          'absolute z-50 mt-1.5 w-72 overflow-hidden rounded-lg border border-admin-border bg-admin-surface shadow-elevation-2 animate-in fade-in zoom-in-95 duration-100',
          isNavbar ? 'left-0' : 'right-0'
        )}>
          <div className="border-b border-admin-border px-3 py-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-admin-foreground">Select Property</p>
            <span className="text-[10px] text-admin-muted font-normal">
              {availableProperties.length} available
            </span>
          </div>
          <div className="border-b border-admin-border p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search properties..."
                className="w-full pl-8 pr-3 py-1.5 rounded-md border border-border bg-background text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
            <button
              type="button"
              onClick={handleSelectAll}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors',
                !selectedProperty
                  ? 'bg-admin-primary-soft font-semibold text-admin-primary border border-admin-primary/20'
                  : 'text-admin-foreground hover:bg-admin-surface-subtle'
              )}
            >
              <DiceBearIcon name="building" badge variant={!selectedProperty ? 'red' : 'neutral'} size={14} />
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium truncate">All Properties</p>
                <p className="text-[10px] text-admin-muted truncate">View workspace-wide summary</p>
              </div>
              {!selectedProperty && (
                <span className="text-[10px] font-semibold text-admin-primary">Active</span>
              )}
            </button>

            {filteredProperties.map((property) => {
              const isSelected = selectedProperty?.propertyId === property.propertyId;
              return (
                <button
                  key={property.propertyId}
                  onClick={() => handleSelect(property)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors',
                    isSelected
                      ? 'bg-admin-primary-soft text-admin-primary font-semibold border border-admin-primary/20'
                      : 'text-foreground hover:bg-admin-surface-subtle'
                  )}
                >
                  <DiceBearIcon name="building" badge variant={isSelected ? 'red' : 'neutral'} size={14} />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium truncate">{property.propertyName}</p>
                    <p className="text-[10px] text-muted truncate">{property.organizationName}</p>
                  </div>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted/15 text-muted capitalize shrink-0">
                    {property.role}
                  </span>
                </button>
              );
            })}

            {filteredProperties.length === 0 && searchQuery && (
              <div className="p-3 text-center text-xs text-admin-muted">
                No properties matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>

          {showCreateLink && (
            <div className="border-t border-admin-border p-1.5">
              <button
                type="button"
                onClick={handleCreate}
                className="flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-admin-primary transition-colors hover:bg-admin-primary-soft"
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