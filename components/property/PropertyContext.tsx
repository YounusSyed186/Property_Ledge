'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { UserPropertyAccess } from '@/lib/properties/queries';

interface PropertyContextType {
  availableProperties: UserPropertyAccess[];
  selectedProperty: UserPropertyAccess | null;
  isLoading: boolean;
  error: string | null;
  setSelectedProperty: (property: UserPropertyAccess | null) => void;
  refreshProperties: () => Promise<void>;
  hasPropertyAccess: (propertyId: string) => boolean;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [availableProperties, setAvailableProperties] = useState<UserPropertyAccess[]>([]);
  const [selectedProperty, setSelectedPropertyState] = useState<UserPropertyAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/properties/accessible');
      if (!response.ok) {
        throw new Error('Failed to fetch properties');
      }
      
      const data = await response.json();
      setAvailableProperties(data.properties || []);
      
      // Restore selected property from localStorage if available
      const storedPropertyId = localStorage.getItem('selectedPropertyId');
      if (storedPropertyId && data.properties) {
        const storedProperty = data.properties.find((p: UserPropertyAccess) => p.propertyId === storedPropertyId);
        if (storedProperty) {
          setSelectedPropertyState(storedProperty);
        } else if (data.properties.length > 0) {
          setSelectedPropertyState(data.properties[0]);
          localStorage.setItem('selectedPropertyId', data.properties[0].propertyId);
        }
      } else if (data.properties && data.properties.length > 0) {
        setSelectedPropertyState(data.properties[0]);
        localStorage.setItem('selectedPropertyId', data.properties[0].propertyId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties');
      console.error('Error fetching properties:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSelectedProperty = useCallback((property: UserPropertyAccess | null) => {
    setSelectedPropertyState(property);
    if (property) {
      localStorage.setItem('selectedPropertyId', property.propertyId);
    } else {
      localStorage.removeItem('selectedPropertyId');
    }
  }, []);

  const hasPropertyAccess = useCallback((propertyId: string) => {
    return availableProperties.some(p => p.propertyId === propertyId);
  }, [availableProperties]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    // Listen for property changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedPropertyId' && e.newValue) {
        const property = availableProperties.find(p => p.propertyId === e.newValue);
        if (property) {
          setSelectedPropertyState(property);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [availableProperties]);

  return (
    <PropertyContext.Provider value={{
      availableProperties,
      selectedProperty,
      isLoading,
      error,
      setSelectedProperty,
      refreshProperties: fetchProperties,
      hasPropertyAccess,
    }}>
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