'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Columns, Download, CheckSquare, SlidersHorizontal, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { GridApi } from 'ag-grid-community';
import { cn } from '@/lib/utils';

export interface ColumnItem {
  colId: string;
  headerName: string;
  isVisible: boolean;
}

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  onClick: (selectedRows: any[]) => void;
}

interface AdminDataGridToolbarProps {
  gridApi: GridApi | null;
  searchValue: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  selectedRows?: any[];
  onClearSelection?: () => void;
  bulkActions?: BulkAction[];
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  enableColumnChooser?: boolean;
  enableExport?: boolean;
  exportFilename?: string;
  totalCount?: number;
  labelSingular?: string;
  labelPlural?: string;
  compact?: boolean;
  compactOverride?: boolean;
  hideSearch?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  loading?: boolean;
}

export type { AdminDataGridToolbarProps };

export function AdminDataGridToolbar({
  gridApi,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  selectedRows = [],
  onClearSelection,
  bulkActions = [],
  leftContent,
  rightContent,
  enableColumnChooser = true,
  enableExport = true,
  exportFilename = 'export',
  totalCount,
  labelSingular = 'item',
  labelPlural = 'items',
  compact = false,
  hideSearch = false,
  isExpanded = true,
  onToggleExpand,
  loading = false,
}: AdminDataGridToolbarProps) {
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [columns, setColumns] = useState<ColumnItem[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync columns state from AG Grid API
  const refreshColumns = () => {
    if (!gridApi) return;
    const allCols = gridApi.getAllGridColumns();
    const colsList: ColumnItem[] = allCols
      .filter((col) => col.getColId() !== 'ag-Grid-AutoColumn' && col.getColDef().headerName)
      .map((col) => ({
        colId: col.getColId(),
        headerName: col.getColDef().headerName || col.getColId(),
        isVisible: col.isVisible(),
      }));
    setColumns(colsList);
  };

  useEffect(() => {
    if (gridApi) {
      refreshColumns();
    }
  }, [gridApi]);

  // Handle outside click for column menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsColumnMenuOpen(false);
      }
    }
    if (isColumnMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isColumnMenuOpen]);

  const toggleColumn = (colId: string, currentVisible: boolean) => {
    if (!gridApi) return;
    gridApi.setColumnsVisible([colId], !currentVisible);
    setColumns((prev) =>
      prev.map((c) => (c.colId === colId ? { ...c, isVisible: !currentVisible } : c))
    );
  };

  const resetColumns = () => {
    if (!gridApi) return;
    gridApi.resetColumnState();
    refreshColumns();
  };

  const handleExportCsv = () => {
    if (!gridApi) return;
    gridApi.exportDataAsCsv({
      fileName: `${exportFilename}-${new Date().toISOString().slice(0, 10)}.csv`,
      allColumns: false,
    });
  };

  const selectedCount = selectedRows.length;

  return (
    <div
      className={cn(
        'admin-data-grid-toolbar relative border-b border-admin-divider bg-admin-surface transition-[padding] duration-250 ease-out',
        compact ? 'admin-data-grid-toolbar--compact px-2 py-1' : 'px-2 py-1.5'
      )}
    >
      {/* Contextual Bulk Action Bar when items are selected */}
      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2.5 animate-slide-up bg-admin-surface-elevated p-1.5 rounded-lg border border-admin-primary/30 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-admin-primary-soft text-admin-primary flex items-center justify-center font-bold text-xs">
              {selectedCount}
            </span>
            <span className="text-caption font-semibold text-admin-foreground">
              {selectedCount === 1 ? `1 ${labelSingular} selected` : `${selectedCount} ${labelPlural} selected`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {bulkActions.map((action, idx) => (
              <Button
                key={idx}
                variant={action.variant || 'secondary'}
                size="sm"
                onClick={() => action.onClick(selectedRows)}
                leftIcon={action.icon}
              >
                {action.label}
              </Button>
            ))}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              leftIcon={<X className="w-3.5 h-3.5" />}
            >
              Deselect
            </Button>
          </div>
        </div>
      ) : (
        /* Normal Toolbar */
        <div className={cn('flex flex-col lg:flex-row lg:items-center justify-between', compact ? 'gap-1' : 'gap-2')}>
          {/* Left: Quick Filters & Search */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            {leftContent}

            {loading && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#008F83]/10 border border-[#008F83]/20 text-[#008F83] text-xs font-semibold shrink-0 animate-fade-in">
                <div className="w-3.5 h-3.5 border-2 border-[#008F83] border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Loading...</span>
              </div>
            )}

            {/* Global Search Bar */}
            {!hideSearch && (
              <div className={cn('relative flex-1 min-w-[190px]', compact ? 'max-w-[220px]' : 'max-w-xs')}>
                <Search className="w-4 h-4 text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-8 pl-8 pr-7 rounded-lg bg-surface border border-border text-[12px] text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-[#008F83]/20 focus:border-[#008F83] transition-all shadow-2xs"
                  aria-label={searchPlaceholder}
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right: Columns menu, Export, Count */}
          <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
            {rightContent}

            {/* Column Visibility Menu */}
            {enableColumnChooser && (
              <div className="relative" ref={menuRef}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    refreshColumns();
                    setIsColumnMenuOpen(!isColumnMenuOpen);
                  }}
                  leftIcon={<Columns className="w-4 h-4" />}
                  title="Columns"
                >
                  {!compact && 'Columns'}
                </Button>

                {isColumnMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 p-2 rounded-xl bg-surface border border-border shadow-elevation-2 z-dropdown animate-slide-up">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-divider mb-1">
                      <span className="text-caption font-bold text-foreground">Toggle Columns</span>
                      <button
                        type="button"
                        onClick={resetColumns}
                        className="text-metadata text-muted hover:text-[#008F83] flex items-center gap-1"
                        title="Reset column layout"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-0.5 admin-scrollbar p-1">
                      {columns.map((col) => (
                        <label
                          key={col.colId}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-subtle cursor-pointer text-caption text-foreground transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={col.isVisible}
                            onChange={() => toggleColumn(col.colId, col.isVisible)}
                            className="w-4 h-4 rounded border-border text-[#008F83] accent-[#008F83] focus:ring-[#008F83]/30"
                          />
                          <span className="truncate">{col.headerName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Export CSV */}
            {enableExport && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportCsv}
                leftIcon={<Download className="w-4 h-4" />}
                title="Export CSV"
              >
                {!compact && 'Export'}
              </Button>
            )}

            {/* Explicit Expand / Collapse Button */}
            {onToggleExpand && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onToggleExpand}
                title={isExpanded ? 'Collapse Grid ↓' : 'Expand Grid ↑'}
                className="font-medium"
              >
                {isExpanded ? 'Collapse Grid ↓' : 'Expand Grid ↑'}
              </Button>
            )}

            {/* Total Count Badge */}
            {totalCount !== undefined && !compact && (
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface text-[11px] text-muted border border-border font-medium shadow-2xs">
                <span className="font-bold text-foreground">{totalCount}</span>
                <span>{totalCount === 1 ? labelSingular : labelPlural}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
