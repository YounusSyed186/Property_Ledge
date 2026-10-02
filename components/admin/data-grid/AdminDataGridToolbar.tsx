'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Columns, Download, CheckSquare, SlidersHorizontal, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { GridApi } from 'ag-grid-community';
import { cn } from '@/lib/utils';

import { GridRefreshButton } from './GridRefreshButton';

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
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
  lastRefreshedAt?: Date | null;
  refreshLabel?: string;
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
  onRefresh,
  isRefreshing,
  lastRefreshedAt,
  refreshLabel,
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
        'admin-data-grid-toolbar relative bg-admin-surface/60 backdrop-blur-xs p-2.5 sm:p-3 transition-[padding] duration-250 ease-out border-b border-admin-divider/60',
        compact && 'admin-data-grid-toolbar--compact p-2'
      )}
    >
      {/* Contextual Bulk Action Bar when items are selected */}
      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 animate-slide-up bg-admin-surface border border-[#008F83]/30 p-2 sm:p-2.5 rounded-xl shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-[#008F83]/15 text-[#008F83] flex items-center justify-center font-bold text-xs">
              {selectedCount}
            </span>
            <span className="text-xs font-semibold text-admin-foreground">
              {selectedCount === 1 ? `1 ${labelSingular} selected` : `${selectedCount} ${labelPlural} selected`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {bulkActions.map((action, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => action.onClick(selectedRows)}
                className={cn(
                  'h-9 px-3.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs border',
                  action.variant === 'destructive'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                )}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={onClearSelection}
              className="h-9 px-3 rounded-xl text-xs font-medium text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle transition-colors flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Deselect</span>
            </button>
          </div>
        </div>
      ) : (
        /* Normal Toolbar */
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          {/* Left: Primary Left Content & Search Bar */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
            {leftContent}

            {/* Global Search Bar (Modelled after reference mockup) */}
            {!hideSearch && (
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-9.5 pl-9 pr-7 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008F83]/20 focus:border-[#008F83] transition-all shadow-xs"
                  aria-label={searchPlaceholder}
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#008F83]/10 border border-[#008F83]/20 text-[#008F83] text-xs font-semibold shrink-0 animate-fade-in">
                <div className="w-3.5 h-3.5 border-2 border-[#008F83] border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Loading...</span>
              </div>
            )}
          </div>

          {/* Right: Dropdown Filters, Columns & Export (Modelled after reference mockup) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
            {rightContent}

            {/* Refresh Button */}
            {onRefresh && (
              <GridRefreshButton
                onRefresh={onRefresh}
                isRefreshing={isRefreshing}
                lastRefreshedAt={lastRefreshedAt}
                label={refreshLabel}
                showLastUpdated={false}
              />
            )}

            {/* Column Visibility Menu */}
            {enableColumnChooser && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => {
                    refreshColumns();
                    setIsColumnMenuOpen(!isColumnMenuOpen);
                  }}
                  className="h-10 px-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-300 transition-all flex items-center gap-1.5"
                  title="Toggle Columns"
                >
                  <Columns className="w-4 h-4 text-slate-500" />
                  <span>Columns</span>
                </button>

                {isColumnMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-dropdown animate-slide-up">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 dark:border-slate-700 mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Toggle Columns</span>
                      <button
                        type="button"
                        onClick={resetColumns}
                        className="text-[11px] text-slate-500 hover:text-[#008F83] flex items-center gap-1"
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
              <button
                type="button"
                onClick={handleExportCsv}
                className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-300 transition-all flex items-center justify-center"
                title="Export CSV"
              >
                <Download className="w-4 h-4 text-slate-500" />
              </button>
            )}

            {/* Explicit Expand / Collapse Button */}
            {onToggleExpand && (
              <button
                type="button"
                onClick={onToggleExpand}
                title={isExpanded ? 'Collapse table to normal view (Esc)' : 'Expand table to full width'}
                className={cn(
                  'h-10 px-3.5 rounded-xl border text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer',
                  isExpanded
                    ? 'border-[#008F83]/30 bg-[#008F83]/10 text-[#008F83] dark:text-[#32D5C4]'
                    : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-300'
                )}
              >
                {isExpanded ? (
                  <>
                    <Minimize2 className="w-4 h-4 text-[#008F83] dark:text-[#32D5C4]" />
                    <span>Collapse</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 text-slate-500 dark:text-[#7F8B99]" />
                    <span className="hidden sm:inline">Expand</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
