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
} from 'ag-grid-community';

import '@/components/admin/data-grid/theme/gridTheme.css';
import { defaultGridColDef, defaultGridOptions } from './theme/gridDefaults';
import { AdminDataGridToolbar, BulkAction } from './AdminDataGridToolbar';
import { AdminDataGridPagination } from './AdminDataGridPagination';
import { AdminDataGridEmpty } from './AdminDataGridEmpty';
import { AdminDataGridLoading } from './AdminDataGridLoading';

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
}

export function AdminDataGrid<TData = any>({
  rowData,
  columnDefs,
  loading = false,
  searchPlaceholder = 'Search table...',
  defaultPageSize = 10,
  enableSelection = false,
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
}: AdminDataGridProps<TData>) {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [selectedRows, setSelectedRows] = useState<TData[]>([]);
  const [isFiltered, setIsFiltered] = useState(false);
  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(defaultPageSize);
  const gridContainerRef = useRef<HTMLDivElement>(null);

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

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    params.api.sizeColumnsToFit();
  }, []);

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

  // Adjust column sizes on window resize
  useEffect(() => {
    const handleResize = () => {
      if (gridApi) {
        gridApi.sizeColumnsToFit();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [gridApi]);

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

  const isEmpty = !loading && (!rowData || rowData.length === 0);

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 rounded-2xl bg-admin-surface border border-admin-border shadow-xs overflow-hidden">
      {/* Toolbar */}
      <AdminDataGridToolbar
        gridApi={gridApi}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        searchPlaceholder={searchPlaceholder}
        selectedRows={selectedRows}
        onClearSelection={handleClearSelection}
        bulkActions={bulkActions}
        leftContent={leftToolbarContent}
        rightContent={rightToolbarContent}
        enableColumnChooser={enableColumnChooser}
        enableExport={enableExport}
        exportFilename={exportFilename}
        totalCount={effectiveTotalItems}
        labelSingular={labelSingular}
        labelPlural={labelPlural}
      />

      {/* Grid Container */}
      <div ref={gridContainerRef} className="relative w-full flex-1 min-h-0 h-full overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 bg-admin-surface/85 backdrop-blur-xs flex items-center justify-center">
            <AdminDataGridLoading />
          </div>
        )}

        {isEmpty ? (
          <AdminDataGridEmpty
            isFiltered={isFiltered}
            onClearFilters={handleClearFilters}
            title={emptyTitle}
            description={emptyDescription}
            icon={emptyIcon}
          />
        ) : (
          <div className="ag-theme-propertyledge w-full h-full min-h-0 flex-1">
            <AgGridReact<TData>
              rowData={rowData}
              columnDefs={effectiveColDefs}
              defaultColDef={defaultGridColDef}
              gridOptions={defaultGridOptions}
              components={components}
              pagination={!isServerSide}
              paginationPageSize={effectivePageSize}
              suppressPaginationPanel={true}
              onGridReady={onGridReady}
              onSelectionChanged={onSelectionChanged}
              onFilterChanged={onFilterChanged}
              onRowClicked={(params) => {
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
      {!isEmpty && (
        <AdminDataGridPagination
          currentPage={effectiveCurrentPage}
          totalPages={effectiveTotalPages}
          totalItems={effectiveTotalItems}
          pageSize={effectivePageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          labelSingular={labelSingular}
          labelPlural={labelPlural}
        />
      )}
    </div>
  );
}
