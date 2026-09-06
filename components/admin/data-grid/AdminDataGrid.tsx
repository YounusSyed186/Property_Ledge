'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ColDef,
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
}: AdminDataGridProps<TData>) {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [selectedRows, setSelectedRows] = useState<TData[]>([]);
  const [isFiltered, setIsFiltered] = useState(false);
  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(defaultPageSize);
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
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
    if (gridApi) {
      requestAnimationFrame(() => {
        gridApi.sizeColumnsToFit();
      });
    }
  }, [isExpanded, onExpandedChange, gridApi]);

  const workspaceStore = useCollapsibleWorkspaceOptional();

  useEffect(() => {
    if (workspaceStore) {
      workspaceStore.setExpanded(isExpanded);
    }
  }, [isExpanded, workspaceStore]);

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

  // Handle Quick Search in AG Grid
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchValue(query);
      if (gridApi && !isServerSide) {
        gridApi.setGridOption('quickFilterText', query);
        setIsFiltered(Boolean(query || gridApi.isAnyFilterPresent()));
      }
    },
    [gridApi, isServerSide]
  );

  // Clear all filters
  const handleClearFilters = useCallback(() => {
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
      setClientPageSize(api.paginationGetPageSize());
      setClientPage(api.paginationGetCurrentPage() + 1);
    },
    [isServerSide]
  );

  const onGridReady = useCallback(
    (params: GridReadyEvent) => {
      setGridApi(params.api);
      params.api.sizeColumnsToFit();
      requestAnimationFrame(() => {
        syncPaginationFromGrid(params.api);
        params.api.sizeColumnsToFit();
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

  // Adjust column sizes and pagination on window resize
  useEffect(() => {
    const handleResize = () => {
      if (gridApi) {
        gridApi.sizeColumnsToFit();
        syncPaginationFromGrid(gridApi);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [gridApi, syncPaginationFromGrid]);

  // Recalculate auto page size when grid container resizes (sidebar collapse, etc.)
  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el || !gridApi || isServerSide) return;

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        gridApi.sizeColumnsToFit();
        syncPaginationFromGrid(gridApi);
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
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
    bulkActions,
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
  };

  return (
    <div
      className={cn(
        'flex flex-col w-full rounded-2xl bg-admin-surface border border-admin-border shadow-xs overflow-hidden transition-[height,max-height,min-height] duration-250 ease-out',
        isExpanded ? 'flex-1 h-full min-h-[480px]' : 'flex-none h-[340px] max-h-[340px]'
      )}
    >
      {/* Toolbar — isolated subscriber so grid body does not rerender on collapse */}
      <AdminDataGridToolbarBridge {...toolbarProps} />

      {/* Grid Container */}
      <div
        ref={gridContainerRef}
        className={cn(
          'relative w-full overflow-hidden transition-[height,max-height,min-height] duration-250 ease-out',
          isExpanded ? 'h-full min-h-[200px] flex-1' : 'h-[240px] min-h-[240px] max-h-[240px] flex-none'
        )}
      >
        {isLoadingState && (!isDataLoaded || rowData.length === 0) ? (
          /* Initial data fetching: Render Row Skeleton Table */
          <AdminDataGridLoading />
        ) : isEmpty ? (
          /* Confirmed empty state */
          <AdminDataGridEmpty
            isFiltered={isFiltered}
            onClearFilters={handleClearFilters}
            title={emptyTitle}
            description={emptyDescription}
            icon={emptyIcon}
          />
        ) : (
          /* Render AG Grid with overlay if refetching */
          <div className="ag-theme-propertyledge w-full h-full min-h-[380px] flex-1 relative">
            {loading && <AdminDataGridLoading overlay />}
            <AgGridReact<TData>
              rowData={rowData}
              columnDefs={effectiveColDefs}
              defaultColDef={defaultGridColDef}
              gridOptions={defaultGridOptions}
              components={components}
              pagination={!isServerSide && !disablePagination}
              paginationAutoPageSize={!isServerSide && !disablePagination}
              paginationPageSize={isServerSide ? effectivePageSize : undefined}
              suppressPaginationPanel={true}
              onGridReady={onGridReady}
              onFirstDataRendered={(params) => {
                params.api.sizeColumnsToFit();
              }}
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
      )}
    </div>
  );
}

function AdminDataGridToolbarBridge(props: AdminDataGridToolbarProps) {
  const snapshot = useCollapsibleWorkspaceSnapshot();
  const compact = props.compactOverride ?? snapshot?.isCompact ?? false;
  return <AdminDataGridToolbar {...props} compact={compact} />;
}
