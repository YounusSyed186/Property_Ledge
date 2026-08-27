'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Building2, Plus, Search } from 'lucide-react';
import { usePropertyContext } from '@/components/property/PropertyContext';
import type { UserPropertyAccess } from '@/lib/properties/queries';
import { cn } from '@/lib/utils';

interface PropertySelectorProps {
  className?: string;
  showCreateLink?: boolean;
  onCreateClick?: () => void;
  variant?: 'sidebar' | 'navbar';
}

export function PropertySelector({ className, showCreateLink = true, onCreateClick, variant = 'sidebar' }: PropertySelectorProps) {
  const router = useRouter();
  const { availableProperties, selectedProperty, setSelectedProperty, isLoading, hasPropertyAccess } = usePropertyContext();

  const handleCreate = () => {
    if (onCreateClick) {
      onCreateClick();
    } else {
      router.push('/dashboard/properties/new');
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
    ? 'flex min-w-0 max-w-[160px] items-center gap-0.5 rounded-md px-1 py-0.5 text-xs font-medium text-admin-sidebar-foreground transition-colors hover:bg-admin-sidebar-hover'
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
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-muted-foreground"
        >
          <div className="w-4 h-4 rounded animate-pulse bg-muted" />
          <div className="w-24 h-4 rounded animate-pulse bg-muted" />
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (availableProperties.length === 0) {
    return (
      <div className={cn('relative', className)}>
        <button
          ref={buttonRef}
          type="button"
          onClick={handleCreate}
          data-testid="property-selector"
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
        >
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground" data-testid="current-property">No Properties</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
        {showCreateLink && (
          <div
            ref={dropdownRef}
            className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-xl shadow-lg p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
          >
            <button
              onClick={handleCreate}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Property
            </button>
          </div>
        )}
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
        className={triggerClass}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate" data-testid="current-property">
          {selectedProperty ? selectedProperty.propertyName : 'All Properties'}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className={cn(
          'absolute z-50 mt-2 w-72 overflow-hidden rounded-xl border border-admin-border bg-admin-surface shadow-lg animate-in fade-in zoom-in-95 duration-150',
          isNavbar ? 'left-0' : 'right-0'
        )}>
          <div className="border-b border-admin-border px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-admin-muted">Property</p>
          </div>
          <div className="border-b border-admin-border p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search properties..."
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-1">
            <button
              type="button"
              onClick={handleSelectAll}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                !selectedProperty ? 'bg-admin-success/10 font-medium text-admin-success' : 'text-admin-foreground hover:bg-admin-surface-subtle'
              )}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">All Properties</span>
            </button>
            {filteredProperties.map((property) => (
                  <button
                    key={property.propertyId}
                    onClick={() => handleSelect(property)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                      selectedProperty?.propertyId === property.propertyId
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-medium truncate">{property.propertyName}</p>
                      <p className="text-xs text-muted-foreground truncate">{property.organizationName}</p>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-medium',
                        property.role === 'owner' && 'bg-purple/20 text-purple',
                        property.role === 'manager' && 'bg-blue/20 text-blue',
                        property.role === 'agent' && 'bg-green/20 text-green',
                        property.role === 'staff' && 'bg-orange/20 text-orange',
                        property.role === 'viewer' && 'bg-gray/20 text-gray'
                      )}
                    >
                      {property.role}
                    </span>
                  </button>
                ))}
            {filteredProperties.length === 0 && searchQuery && (
              <div className="p-4 text-center text-sm text-admin-muted">No properties found</div>
            )}
          </div>

          {showCreateLink && (
            <div className="border-t border-admin-border p-2">
              <button
                type="button"
                onClick={handleCreate}
                className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-admin-success transition-colors hover:bg-admin-success/10"
              >
                <Plus className="h-4 w-4" />
                Add property
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}