import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/admin/ui';
import {
  ColDef,
  GridOptions,
  GridReadyEvent,
  SelectionChangedEvent,
  GridApi,
  FilterChangedEvent,
  SelectionColumnDef,
  BodyScrollEvent,
} from 'ag-grid-community';

import '@/components/admin/data-grid/theme/gridTheme.css';
import { defaultGridColDef, defaultGridOptions } from './theme/gridDefaults';
import { AdminDataGridToolbar, BulkAction } from './AdminDataGridToolbar';
import { AdminDataGridPagination } from './AdminDataGridPagination';
import { AdminDataGridEmpty } from './AdminDataGridEmpty';
import { AdminDataGridLoading } from './AdminDataGridLoading';

const AgGridReact = dynamic(
  () => import('ag-grid-react').then((mod) => mod.AgGridReact),
  {
    ssr: false,
    loading: () => <AdminDataGridLoading overlay={false} />,
  }
) as unknown as typeof import('ag-grid-react').AgGridReact;
import { useCollapsibleWorkspaceOptional, useCollapsibleWorkspaceSnapshot } from '@/components/workspace/useCollapsibleDataWorkspace';
import { cn } from '@/lib/utils';
import type { AdminDataGridToolbarProps } from './AdminDataGridToolbar';

// Standard Cell Components
import { UserCell } from './cells/UserCell';
import { StatusCell } from './cells/StatusCell';
import { CurrencyCell } from './cells/CurrencyCell';
import { NumberCell } from './cells/NumberCell';
import { DateCell } from './cells/DateCell';
import { BooleanCell } from './cells/BooleanCell';
import { CodeCell } from './cells/CodeCell';
import { ActionsCell } from './cells/ActionsCell';

export interface AdminDataGridProps<TData = any> {
  rowData: TData[];
  columnDefs: ColDef[];
  loading?: boolean;
  searchPlaceholder?: string;
  defaultPageSize?: number;
  enableSelection?: boolean;
  selectionColumnDef?: SelectionColumnDef;
  enableColumnChooser?: boolean;
  enableExport?: boolean;
  exportFilename?: string;
  bulkActions?: BulkAction[];
  onDeleteSelected?: (selectedRows: TData[]) => Promise<void> | void;
  leftToolbarContent?: React.ReactNode;
  rightToolbarContent?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  labelSingular?: string;
  labelPlural?: string;
  onRowClick?: (data: TData) => void;
  getRowId?: (params: { data: TData }) => string;
  // Server-side pagination support if passed
  isServerSide?: boolean;
  totalItems?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onViewportScroll?: (detail: { scrollTop: number; direction: 'horizontal' | 'vertical' }) => void;
  compactToolbar?: boolean;
  hideSearch?: boolean;
  disablePagination?: boolean;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  defaultExpanded?: boolean;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
  lastRefreshedAt?: Date | null;
  refreshLabel?: string;
  rowHeight?: number;
  gridOptions?: GridOptions;
}

export function AdminDataGrid<TData = any>({
  rowData,
  columnDefs,
  loading = false,
  searchPlaceholder = 'Search table...',
  defaultPageSize = 10,
  enableSelection = true,
  selectionColumnDef,
  enableColumnChooser = true,
  enableExport = true,
  exportFilename = 'admin-export',
  bulkActions = [],
  onDeleteSelected,
  leftToolbarContent,
  rightToolbarContent,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  labelSingular = 'item',
  labelPlural = 'items',
  onRowClick,
  getRowId,
  isServerSide = false,
  totalItems,
  currentPage = 1,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onViewportScroll,
  compactToolbar,
  hideSearch = false,
  disablePagination = false,
  isExpanded: propIsExpanded,
  onExpandedChange,
  defaultExpanded = true,
  onRefresh,
  isRefreshing,
  lastRefreshedAt,
  refreshLabel,
  rowHeight,
  gridOptions: customGridOptions,
}: AdminDataGridProps<TData>) {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [selectedRows, setSelectedRows] = useState<TData[]>([]);
  const [isFiltered, setIsFiltered] = useState(false);
  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(defaultPageSize);
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const viewportScrollRef = useRef(onViewportScroll);

  const isExpanded = propIsExpanded ?? internalExpanded;

  const handleToggleExpand = useCallback(() => {
    const next = !isExpanded;
    if (onExpandedChange) {
      onExpandedChange(next);
    } else {
      setInternalExpanded(next);
    }
  }, [isExpanded, onExpandedChange]);

  const workspaceStore = useCollapsibleWorkspaceOptional();

  useEffect(() => {
    if (workspaceStore) {
      workspaceStore.setExpanded(isExpanded);
    }
  }, [isExpanded, workspaceStore]);

  const effectiveBulkActions = useMemo<BulkAction[]>(() => {
    const list = [...bulkActions];
    if (onDeleteSelected && !list.some((a) => a.variant === 'destructive' || a.label.toLowerCase().includes('delete'))) {
      list.push({
        label: `Delete (${selectedRows.length})`,
        icon: <Trash2 className="w-3.5 h-3.5" />,
        variant: 'destructive',
        onClick: () => setIsDeleteModalOpen(true),
      });
    }
    return list;
  }, [bulkActions, onDeleteSelected, selectedRows.length]);

  const handleConfirmBulkDelete = async () => {
    if (!onDeleteSelected || selectedRows.length === 0) return;
    setIsDeleting(true);
    try {
      await onDeleteSelected(selectedRows);
      if (gridApi) {
        gridApi.deselectAll();
      }
      setSelectedRows([]);
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      console.error('Bulk delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    viewportScrollRef.current = onViewportScroll;
  }, [onViewportScroll]);

  const onBodyScroll = useCallback((event: BodyScrollEvent) => {
    if (event.direction !== 'vertical') return;
    viewportScrollRef.current?.({ scrollTop: event.top, direction: 'vertical' });
  }, []);

  // Register cell renderers mapping
  const components = useMemo(
    () => ({
      userCell: UserCell,
      statusCell: StatusCell,
      currencyCell: CurrencyCell,
      numberCell: NumberCell,
      dateCell: DateCell,
      booleanCell: BooleanCell,
      codeCell: CodeCell,
      actionsCell: ActionsCell,
    }),
    []
  );

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // Handle Quick Search in AG Grid with 150ms debounce
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchValue(query);
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      searchDebounceRef.current = setTimeout(() => {
        if (gridApi && !isServerSide) {
          gridApi.setGridOption('quickFilterText', query);
          setIsFiltered(Boolean(query || gridApi.isAnyFilterPresent()));
        }
      }, 150);
    },
    [gridApi, isServerSide]
  );

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    setSearchValue('');
    if (gridApi) {
      gridApi.setFilterModel(null);
      gridApi.setGridOption('quickFilterText', '');
      setIsFiltered(false);
    }
  }, [gridApi]);

  const syncPaginationFromGrid = useCallback(
    (api: GridApi) => {
      if (isServerSide) return;
      const newPageSize = api.paginationGetPageSize();
      const newPage = api.paginationGetCurrentPage() + 1;
      setClientPageSize((prev) => (prev !== newPageSize ? newPageSize : prev));
      setClientPage((prev) => (prev !== newPage ? newPage : prev));
    },
    [isServerSide]
  );


  const onGridReady = useCallback(
    (params: GridReadyEvent) => {
      setGridApi(params.api);
      requestAnimationFrame(() => {
        syncPaginationFromGrid(params.api);
      });
    },
    [syncPaginationFromGrid]
  );

  const onPaginationChanged = useCallback(() => {
    if (gridApi && !isServerSide) {
      syncPaginationFromGrid(gridApi);
    }
  }, [gridApi, isServerSide, syncPaginationFromGrid]);

  const onSelectionChanged = useCallback(
    (event: SelectionChangedEvent) => {
      if (enableSelection && gridApi) {
        const rows = gridApi.getSelectedRows() as TData[];
        setSelectedRows(rows);
      }
    },
    [enableSelection, gridApi]
  );

  const onFilterChanged = useCallback(
    (event: FilterChangedEvent) => {
      if (gridApi) {
        setIsFiltered(Boolean(searchValue || gridApi.isAnyFilterPresent()));
      }
    },
    [gridApi, searchValue]
  );

  const handleClearSelection = useCallback(() => {
    if (gridApi) {
      gridApi.deselectAll();
      setSelectedRows([]);
    }
  }, [gridApi]);

  // Adjust pagination on window resize
  useEffect(() => {
    const handleResize = () => {
      if (gridApi) {
        syncPaginationFromGrid(gridApi);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [gridApi, syncPaginationFromGrid]);

  // Recalculate auto page size when grid container resizes (sidebar collapse, etc.)
  const resizeRafRef = useRef<number | null>(null);
  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el || !gridApi || isServerSide) return;

    const observer = new ResizeObserver(() => {
      if (resizeRafRef.current) {
        cancelAnimationFrame(resizeRafRef.current);
      }
      resizeRafRef.current = requestAnimationFrame(() => {
        syncPaginationFromGrid(gridApi);
      });
    });
    observer.observe(el);
    return () => {
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      observer.disconnect();
    };
  }, [gridApi, isServerSide, syncPaginationFromGrid]);


  // Client-side pagination calculations
  const effectiveTotalItems = isServerSide ? totalItems || 0 : rowData?.length || 0;
  const effectivePageSize = isServerSide ? defaultPageSize : clientPageSize;
  const effectiveCurrentPage = isServerSide ? currentPage : clientPage;
  const effectiveTotalPages = isServerSide
    ? totalPages || Math.ceil(effectiveTotalItems / effectivePageSize) || 1
    : Math.ceil(effectiveTotalItems / effectivePageSize) || 1;

  const handlePageChange = useCallback(
    (page: number) => {
      if (isServerSide && onPageChange) {
        onPageChange(page);
      } else {
        setClientPage(page);
        if (gridApi) {
          gridApi.paginationGoToPage(page - 1);
        }
      }
    },
    [isServerSide, onPageChange, gridApi]
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      if (isServerSide && onPageSizeChange) {
        onPageSizeChange(size);
      } else {
        setClientPageSize(size);
        setClientPage(1);
        if (gridApi) {
          gridApi.setGridOption('paginationPageSize', size);
          gridApi.paginationGoToPage(0);
        }
      }
    },
    [isServerSide, onPageSizeChange, gridApi]
  );

  // Prepare column definitions with explicit selection column
  const effectiveColDefs = useMemo(() => {
    if (!enableSelection) return columnDefs;
    const hasSelection = columnDefs.some((c) => c.colId === '_selection' || c.checkboxSelection);
    if (hasSelection) return columnDefs;

    return [
      {
        colId: '_selection',
        headerName: '',
        width: 48,
        minWidth: 48,
        maxWidth: 48,
        resizable: false,
        sortable: false,
        filter: false,
        suppressMovable: true,
        pinned: 'left' as const,
        lockPosition: 'left' as const,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        headerCheckboxSelectionFilteredOnly: true,
        cellClass: 'selection-checkbox-cell',
        headerClass: 'selection-checkbox-header',
      },
      ...columnDefs,
    ];
  }, [columnDefs, enableSelection]);

  const isDataLoaded = Array.isArray(rowData);
  const isLoadingState = Boolean(loading || !isDataLoaded);
  const isEmpty = !isLoadingState && rowData.length === 0;

  const toolbarProps: AdminDataGridToolbarProps = {
    gridApi,
    searchValue,
    onSearchChange: handleSearchChange,
    searchPlaceholder,
    selectedRows,
    onClearSelection: handleClearSelection,
    bulkActions: effectiveBulkActions,
    leftContent: leftToolbarContent,
    rightContent: rightToolbarContent,
    enableColumnChooser,
    enableExport,
    exportFilename,
    totalCount: effectiveTotalItems,
    labelSingular,
    labelPlural,
    compactOverride: compactToolbar,
    hideSearch,
    isExpanded,
    onToggleExpand: handleToggleExpand,
    loading: isLoadingState,
    onRefresh,
    isRefreshing,
    lastRefreshedAt,
    refreshLabel,
  };

  return (
    <div
      className={cn(
        'flex flex-col w-full rounded-2xl bg-admin-surface border border-admin-border shadow-xs overflow-hidden flex-1 transition-[height,max-height,min-height] duration-250 ease-out',
        isExpanded ? 'h-full min-h-[520px]' : 'h-full min-h-[420px]'
      )}
    >
      {/* Toolbar — isolated subscriber so grid body does not rerender on collapse */}
      <AdminDataGridToolbarBridge {...toolbarProps} />

      {/* Grid Container */}
      <div
        ref={gridContainerRef}
        className={cn(
          'relative w-full flex-1 min-h-0 overflow-hidden transition-[height,max-height,min-height] duration-250 ease-out',
          isExpanded ? 'min-h-[380px]' : 'min-h-[300px]'
        )}
      >
        {isEmpty ? (
          /* Confirmed empty state */
          <AdminDataGridEmpty
            isFiltered={isFiltered}
            onClearFilters={handleClearFilters}
            title={emptyTitle}
            description={emptyDescription}
            icon={emptyIcon}
          />
        ) : (
          /* Render AG Grid with concurrent background initialization */
          <div className="ag-theme-propertyledge w-full h-full flex-1 relative">
            {isLoadingState && (!isDataLoaded || rowData.length === 0) && (
              <div className="absolute inset-0 z-20 pointer-events-none bg-admin-surface">
                <AdminDataGridLoading overlay={false} />
              </div>
            )}
            <AgGridReact<TData>
              rowData={rowData || []}
              columnDefs={effectiveColDefs}
              defaultColDef={defaultGridColDef}
              gridOptions={{
                ...defaultGridOptions,
                ...(rowHeight ? { rowHeight } : {}),
                ...customGridOptions,
              }}
              rowHeight={rowHeight}
              components={components}
              pagination={!isServerSide && !disablePagination}
              paginationAutoPageSize={!isServerSide && !disablePagination}
              paginationPageSize={isServerSide ? effectivePageSize : undefined}
              suppressPaginationPanel={true}
              onGridReady={onGridReady}
              onPaginationChanged={onPaginationChanged}
              onSelectionChanged={onSelectionChanged}
              onFilterChanged={onFilterChanged}
              onBodyScroll={onBodyScroll}
              onCellClicked={(params) => {
                const colId = params.column?.getColId();
                if (colId === 'actions') return;
                if (onRowClick && params.data) {
                  onRowClick(params.data);
                }
              }}
              getRowId={getRowId}
              rowSelection={
                enableSelection
                  ? {
                      mode: 'multiRow',
                      enableClickSelection: false,
                      checkboxes: false,
                      headerCheckbox: false,
                    }
                  : undefined
              }
            />
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {!isEmpty && !isLoadingState && !disablePagination && (
        <div className="shrink-0">
          <AdminDataGridPagination
            currentPage={effectiveCurrentPage}
            totalPages={effectiveTotalPages}
            totalItems={effectiveTotalItems}
            pageSize={effectivePageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={isServerSide ? handlePageSizeChange : undefined}
            labelSingular={labelSingular}
            labelPlural={labelPlural}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-admin-surface border border-admin-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-black text-admin-foreground">
                  Delete Selected {selectedRows.length === 1 ? labelSingular : labelPlural}
                </h3>
                <p className="text-xs text-admin-muted mt-0.5">
                  Are you sure you want to delete {selectedRows.length} {selectedRows.length === 1 ? labelSingular : labelPlural}? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-admin-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmBulkDelete}
                loading={isDeleting}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete {selectedRows.length} {selectedRows.length === 1 ? labelSingular : labelPlural}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminDataGridToolbarBridge(props: AdminDataGridToolbarProps) {
  const snapshot = useCollapsibleWorkspaceSnapshot();
  const compact = props.compactOverride ?? snapshot?.isCompact ?? false;
  return <AdminDataGridToolbar {...props} compact={compact} />;
}
