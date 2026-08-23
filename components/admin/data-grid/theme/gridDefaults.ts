import { ModuleRegistry, AllCommunityModule, ColDef, GridOptions } from 'ag-grid-community';

// Register AG Grid Community Modules
if (typeof window !== 'undefined') {
  ModuleRegistry.registerModules([AllCommunityModule]);
}

export const defaultGridColDef: ColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  suppressMovable: false,
  minWidth: 120,
  headerClass: 'font-semibold text-caption tracking-wider',
  tooltipValueGetter: (params) => {
    if (params.valueFormatted) return params.valueFormatted;
    if (typeof params.value === 'string' || typeof params.value === 'number') {
      return String(params.value);
    }
    return undefined;
  },
};

export const defaultGridOptions: GridOptions = {
  headerHeight: 44,
  rowHeight: 54,
  animateRows: true,
  suppressCellFocus: false,
  enableCellTextSelection: true,
  suppressMenuHide: true,
  enableBrowserTooltips: true,
};
