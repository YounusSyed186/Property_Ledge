'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { UserPropertyAccess } from '@/lib/properties/queries';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';

interface PropertyContextType {
  availableProperties: UserPropertyAccess[];
  selectedProperty: UserPropertyAccess | null;
  isLoading: boolean;
  error: string | null;
  setSelectedProperty: (property: UserPropertyAccess | null) => void;
  refreshProperties: () => Promise<void>;
  hasPropertyAccess: (propertyId: string) => boolean;
}

const ALL_PROPERTIES_ID = 'all';

function storageKey(workspaceId: string) {
  return `selectedPropertyId:${workspaceId}`;
}

function resolveSelection(
  properties: UserPropertyAccess[],
  workspaceId: string
): UserPropertyAccess | null {
  const key = storageKey(workspaceId);
  const storedPropertyId = typeof window !== 'undefined' ? localStorage.getItem(key) : null;

  if (storedPropertyId === ALL_PROPERTIES_ID) {
    return null;
  }

  if (storedPropertyId) {
    const storedProperty = properties.find((p) => p.propertyId === storedPropertyId);
    if (storedProperty) {
      return storedProperty;
    }
    // Stale or invalid property stored for this workspace — clear it
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }

  // NON-NEGOTIABLE RULE: Always default to null (All Properties) if no explicit valid selection exists.
  return null;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [availableProperties, setAvailableProperties] = useState<UserPropertyAccess[]>([]);
  const [selectedProperty, setSelectedPropertyState] = useState<UserPropertyAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevWorkspaceIdRef = useRef<string | null>(null);

  const setSelectedProperty = useCallback(
    (property: UserPropertyAccess | null) => {
      setSelectedPropertyState(property);
      if (!activeWorkspaceId) return;
      if (property) {
        localStorage.setItem(storageKey(activeWorkspaceId), property.propertyId);
      } else {
        localStorage.setItem(storageKey(activeWorkspaceId), ALL_PROPERTIES_ID);
      }
    },
    [activeWorkspaceId]
  );

  const fetchProperties = useCallback(async () => {
    if (!activeWorkspaceId) {
      setAvailableProperties([]);
      setSelectedPropertyState(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/properties/accessible?workspaceId=${encodeURIComponent(activeWorkspaceId)}`
      );
      if (!response.ok) {
        throw new Error('Unable to load properties. Please try again.');
      }

      const data = await response.json();
      const properties: UserPropertyAccess[] = data.properties || [];
      setAvailableProperties(properties);

      const selection = resolveSelection(properties, activeWorkspaceId);
      setSelectedPropertyState(selection);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load properties');
      console.error('Error fetching properties:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspaceId]);

  const hasPropertyAccess = useCallback(
    (propertyId: string) => availableProperties.some((p) => p.propertyId === propertyId),
    [availableProperties]
  );

  useEffect(() => {
    if (prevWorkspaceIdRef.current !== activeWorkspaceId) {
      setSelectedPropertyState(null);
      setAvailableProperties([]);
      prevWorkspaceIdRef.current = activeWorkspaceId;
    }
    fetchProperties();
  }, [activeWorkspaceId, fetchProperties]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!activeWorkspaceId || e.key !== storageKey(activeWorkspaceId)) return;
      if (e.newValue === ALL_PROPERTIES_ID) {
        setSelectedPropertyState(null);
      } else if (e.newValue) {
        const property = availableProperties.find((p) => p.propertyId === e.newValue);
        if (property) {
          setSelectedPropertyState(property);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [activeWorkspaceId, availableProperties]);

  return (
    <PropertyContext.Provider
      value={{
        availableProperties,
        selectedProperty,
        isLoading,
        error,
        setSelectedProperty,
        refreshProperties: fetchProperties,
        hasPropertyAccess,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
}

export { PropertyContext };
export type { UserPropertyAccess };

export function usePropertyContext() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('usePropertyContext must be used within a PropertyProvider');
  }
  return context;
}
