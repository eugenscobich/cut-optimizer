import { Component, computed, signal } from '@angular/core';
import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  CellValueChangedEvent,
  CheckboxEditorModule,
  ColDef,
  ClientSideRowModelModule,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  ModuleRegistry,
  NumberEditorModule,
  TextEditorModule,
  themeQuartz
} from 'ag-grid-community';
import { Stock } from './stock.model';

const STOCKS_CSV_HEADERS = [
  'number',
  'label',
  'length',
  'width',
  'thickness',
  'quantity',
  'enabled',
  'ignore_direction',
  'cut_top_size',
  'cut_bottom_size',
  'cut_left_size',
  'cut_right_size'
] as const;

type StockCsvHeader = (typeof STOCKS_CSV_HEADERS)[number];

type StocksCsvRow = Record<StockCsvHeader, string>;

const STOCKS_CSV_HEADER_SET = new Set<string>(STOCKS_CSV_HEADERS);

ModuleRegistry.registerModules([
  CheckboxEditorModule,
  ClientSideRowModelModule,
  NumberEditorModule,
  TextEditorModule
]);

const createStockId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `stock-${Math.random().toString(36).slice(2, 10)}`;
};

const createSampleStocks = (): Stock[] => [
  {
    id: createStockId(),
    number: 1,
    label: 'Birch Sheet A',
    length: 2800,
    width: 2070,
    thickness: 18,
    quantity: 4,
    enabled: true,
    ignoreDirection: false,
    cutTopSize: 10,
    cutBottomSize: 10,
    cutLeftSize: 5,
    cutRightSize: 5
  },
  {
    id: createStockId(),
    number: 2,
    label: 'MDF Sheet',
    length: 2440,
    width: 1220,
    thickness: 18,
    quantity: 6,
    enabled: true,
    ignoreDirection: true,
    cutTopSize: 0,
    cutBottomSize: 0,
    cutLeftSize: 0,
    cutRightSize: 0
  },
  {
    id: createStockId(),
    number: 3,
    label: 'White Laminate',
    length: 3050,
    width: 1300,
    thickness: 12,
    quantity: 2,
    enabled: true,
    ignoreDirection: false,
    cutTopSize: 3,
    cutBottomSize: 3,
    cutLeftSize: 3,
    cutRightSize: 3
  }
];

const createEmptyStock = (nextNumber: number): Stock => ({
  id: createStockId(),
  number: nextNumber,
  label: `Stock ${nextNumber}`,
  length: 2800,
  width: 2070,
  thickness: 18,
  quantity: 1,
  enabled: true,
  ignoreDirection: false,
  cutTopSize: 0,
  cutBottomSize: 0,
  cutLeftSize: 0,
  cutRightSize: 0
});

const normaliseCsvHeader = (header: string): string =>
  header
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();

const parseCsvTable = (csvText: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let withinQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];

    if (withinQuotes) {
      if (character === '"') {
        if (csvText[index + 1] === '"') {
          currentCell += '"';
          index += 1;
          continue;
        }

        withinQuotes = false;
        continue;
      }

      currentCell += character;
      continue;
    }

    if (character === '"') {
      withinQuotes = true;
      continue;
    }

    if (character === ',') {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if (character === '\r' || character === '\n') {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';

      if (character === '\r' && csvText[index + 1] === '\n') {
        index += 1;
      }

      continue;
    }

    currentCell += character;
  }

  if (withinQuotes) {
    throw new Error('CSV contains an unterminated quoted field.');
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
};

const escapeCsvCell = (value: string | number | boolean): string => {
  const cellValue = String(value);

  if (!/[",\r\n]/.test(cellValue)) {
    return cellValue;
  }

  return `"${cellValue.replace(/"/g, '""')}"`;
};

const toCsvBoolean = (value: boolean): string => (value ? 'true' : 'false');

@Component({
  selector: 'app-stocks-management',
  standalone: true,
  imports: [FormsModule, AgGridAngular, Toolbar, ToolbarWidget],
  templateUrl: './stocks-management.html',
  styleUrl: './stocks-management.css'
})
export class StocksManagementComponent {
  readonly gridTheme = themeQuartz;

  readonly stocks = signal<Stock[]>(createSampleStocks());
  readonly selectedStockId = signal<string | null>(this.stocks()[0]?.id ?? null);
  readonly selectedStock = computed(
    () => this.stocks().find((stock) => stock.id === this.selectedStockId()) ?? null
  );

  readonly defaultColDef: ColDef<Stock> = {
    editable: true,
    resizable: true,
    sortable: true,
    minWidth: 95,
    flex: 1
  };

  readonly columnDefs: ColDef<Stock>[] = [
    {
      field: 'number',
      headerName: '#',
      maxWidth: 60,
      minWidth: 60,
      cellDataType: 'number'
    },
    {
      field: 'label',
      headerName: 'Label',
      minWidth: 140
    },
    {
      field: 'length',
      headerName: 'Length',
      cellDataType: 'number'
    },
    {
      field: 'width',
      headerName: 'Width',
      cellDataType: 'number'
    },
    {
      field: 'thickness',
      headerName: 'Thickness',
      cellDataType: 'number',
      minWidth: 110
    },
    {
      field: 'quantity',
      headerName: 'Qty',
      cellDataType: 'number',
      minWidth: 80
    },
    {
      field: 'enabled',
      headerName: 'Enabled',
      cellDataType: 'boolean',
      cellEditor: 'agCheckboxCellEditor',
      valueFormatter: (params) => (params.value ? 'Yes' : 'No'),
      minWidth: 105
    },
    {
      field: 'ignoreDirection',
      headerName: 'Rotate',
      cellDataType: 'boolean',
      cellEditor: 'agCheckboxCellEditor',
      valueFormatter: (params) => (params.value ? 'Yes' : 'No'),
      minWidth: 100
    },
    {
      field: 'cutTopSize',
      headerName: 'Top Cut',
      cellDataType: 'number',
      minWidth: 100
    },
    {
      field: 'cutBottomSize',
      headerName: 'Bottom Cut',
      cellDataType: 'number',
      minWidth: 120
    },
    {
      field: 'cutLeftSize',
      headerName: 'Left Cut',
      cellDataType: 'number',
      minWidth: 100
    },
    {
      field: 'cutRightSize',
      headerName: 'Right Cut',
      cellDataType: 'number',
      minWidth: 105
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      editable: false,
      filter: false,
      sortable: false,
      resizable: false,
      minWidth: 110,
      cellRenderer: (params: ICellRendererParams<Stock>) => this.createDeleteButton(params)
    }
  ];

  readonly getRowId = (params: GetRowIdParams<Stock>): string => params.data.id;

  private gridApi?: GridApi<Stock>;

  exportStocksToCsvText(stocks: Stock[] = this.stocks()): string {
    const headerRow = STOCKS_CSV_HEADERS.join(',');
    const dataRows = stocks.map((stock) =>
      [
        stock.number,
        stock.label,
        stock.length,
        stock.width,
        stock.thickness,
        stock.quantity,
        toCsvBoolean(stock.enabled),
        toCsvBoolean(stock.ignoreDirection),
        stock.cutTopSize,
        stock.cutBottomSize,
        stock.cutLeftSize,
        stock.cutRightSize
      ]
        .map((value) => escapeCsvCell(value))
        .join(',')
    );

    return [headerRow, ...dataRows].join('\r\n');
  }

  addStock(): void {
    const newStock = createEmptyStock(this.getNextStockNumber());

    this.stocks.update((stocks) => [...stocks, newStock]);
    this.selectedStockId.set(newStock.id);
    this.focusStockRow(newStock.id, 'label');
  }

  openImportPicker(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  async onImportFileSelected(event: Event): Promise<void> {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    const file = input?.files?.[0];

    if (!file) {
      return;
    }

    try {
      const csvText = await file.text();

      this.importStocksFromCsvText(csvText);
    } catch (error) {
      void error;
    } finally {
      if (input) {
        input.value = '';
      }
    }
  }

  importStocksFromCsvText(csvText: string): void {
    const importedStocks = this.parseStocksCsvText(csvText);

    if (importedStocks.length === 0) {
      throw new Error('CSV file does not contain any stock rows.');
    }

    this.gridApi?.stopEditing();
    this.stocks.set(importedStocks);
    this.selectedStockId.set(importedStocks[0]?.id ?? null);
  }

  exportStocks(): void {
    if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const downloadUrl = URL.createObjectURL(
      new Blob([this.exportStocksToCsvText()], { type: 'text/csv;charset=utf-8;' })
    );
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = 'stocks.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  }

  onGridReady(event: GridReadyEvent<Stock>): void {
    this.gridApi = event.api;
  }

  onCellValueChanged(event: CellValueChangedEvent<Stock>): void {
    if (!event.data) {
      return;
    }

    const updatedStock = this.sanitiseStock(event.data);
    this.replaceStock(updatedStock);
    this.selectedStockId.set(updatedStock.id);
  }

  selectStock(stockId: string | null): void {
    this.selectedStockId.set(stockId);
  }

  deleteStock(stockId: string): void {
    const currentStocks = this.stocks();
    const deletedStockIndex = currentStocks.findIndex((stock) => stock.id === stockId);

    if (deletedStockIndex < 0) {
      return;
    }

    const remainingStocks = currentStocks.filter((stock) => stock.id !== stockId);
    const currentSelection = this.selectedStockId();

    this.stocks.set(remainingStocks);

    if (currentSelection !== stockId) {
      if (currentSelection && remainingStocks.some((stock) => stock.id === currentSelection)) {
        return;
      }

      this.selectedStockId.set(remainingStocks[0]?.id ?? null);
      return;
    }

    const nextSelectionId =
      remainingStocks[deletedStockIndex]?.id ?? remainingStocks[deletedStockIndex - 1]?.id ?? null;

    this.selectedStockId.set(nextSelectionId);
  }

  private parseStocksCsvText(csvText: string): Stock[] {
    const csvRows = this.readStocksCsvRows(csvText);
    const usedNumbers = new Set<number>();

    for (const row of csvRows) {
      const parsedNumber = this.parseOptionalPositiveInteger(row.number);

      if (parsedNumber !== null) {
        usedNumbers.add(parsedNumber);
      }
    }

    let candidateNumber = 1;
    const getNextAvailableNumber = (): number => {
      while (usedNumbers.has(candidateNumber)) {
        candidateNumber += 1;
      }

      const nextNumber = candidateNumber;

      usedNumbers.add(nextNumber);
      candidateNumber += 1;

      return nextNumber;
    };

    return csvRows.map((row) => {
      const number = this.parseOptionalPositiveInteger(row.number) ?? getNextAvailableNumber();

      return this.sanitiseStock({
        id: createStockId(),
        number,
        label: this.toTrimmedString(row.label) || `Stock ${number}`,
        length: this.toNumber(row.length, 0),
        width: this.toNumber(row.width, 0),
        thickness: this.toNumber(row.thickness, 0),
        quantity: Math.max(1, this.toInteger(row.quantity, 1)),
        enabled: this.toBoolean(row.enabled, true),
        ignoreDirection: this.toBoolean(row.ignore_direction, false),
        cutTopSize: Math.max(0, this.toNumber(row.cut_top_size, 0)),
        cutBottomSize: Math.max(0, this.toNumber(row.cut_bottom_size, 0)),
        cutLeftSize: Math.max(0, this.toNumber(row.cut_left_size, 0)),
        cutRightSize: Math.max(0, this.toNumber(row.cut_right_size, 0))
      });
    });
  }

  private readStocksCsvRows(csvText: string): StocksCsvRow[] {
    const rows = parseCsvTable(csvText.trim());

    if (rows.length === 0) {
      throw new Error('CSV file is empty.');
    }

    const [headerRow, ...dataRows] = rows;
    const headerMap = new Map<number, StockCsvHeader>();

    headerRow.forEach((header, index) => {
      const normalisedHeader = normaliseCsvHeader(header);

      if (!STOCKS_CSV_HEADER_SET.has(normalisedHeader)) {
        return;
      }

      const mappedHeader = normalisedHeader as StockCsvHeader;

      if ([...headerMap.values()].includes(mappedHeader)) {
        throw new Error(`CSV contains duplicate "${mappedHeader}" columns.`);
      }

      headerMap.set(index, mappedHeader);
    });

    if (headerMap.size === 0) {
      throw new Error(
        `CSV must include at least one supported column: ${STOCKS_CSV_HEADERS.join(', ')}.`
      );
    }

    return dataRows
      .filter((row) => row.some((value) => value.trim().length > 0))
      .map((row) => {
        const stockRow = Object.fromEntries(
          STOCKS_CSV_HEADERS.map((header) => [header, ''])
        ) as StocksCsvRow;

        for (const [columnIndex, header] of headerMap.entries()) {
          stockRow[header] = row[columnIndex]?.trim() ?? '';
        }

        return stockRow;
      });
  }

  private replaceStock(updatedStock: Stock): void {
    const normalisedStock = this.sanitiseStock(updatedStock);

    this.stocks.update((stocks) =>
      stocks.map((stock) => (stock.id === normalisedStock.id ? normalisedStock : stock))
    );
  }

  private getNextStockNumber(): number {
    return this.stocks().reduce((max, stock) => Math.max(max, stock.number), 0) + 1;
  }

  private focusStockRow(stockId: string, colKey: keyof Stock): void {
    if (!this.gridApi) {
      return;
    }

    setTimeout(() => {
      if (!this.gridApi) {
        return;
      }

      const rowIndex = this.stocks().findIndex((stock) => stock.id === stockId);

      if (rowIndex < 0) {
        return;
      }

      this.gridApi.ensureIndexVisible(rowIndex, 'bottom');
      this.gridApi.startEditingCell({ rowIndex, colKey });
    }, 0);
  }

  private createDeleteButton(params: ICellRendererParams<Stock>): HTMLSpanElement {
    const span = document.createElement('span');

    span.className = 'icon material-symbols-outlined';
    span.textContent = 'Delete';
    span.setAttribute('aria-label', `Delete ${params.data?.label ?? 'stock'}`);
    span.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (params.data) {
        this.deleteStock(params.data.id);
      }
    });

    return span;
  }

  private sanitiseStock(stock: Stock): Stock {
    const safeNumber = Math.max(1, this.toInteger(stock.number, 1));

    return {
      ...stock,
      number: safeNumber,
      length: this.toNumber(stock.length, 0),
      width: this.toNumber(stock.width, 0),
      thickness: Math.max(0, this.toNumber(stock.thickness, 0)),
      quantity: Math.max(1, this.toInteger(stock.quantity, 1)),
      enabled: Boolean(stock.enabled),
      ignoreDirection: Boolean(stock.ignoreDirection),
      label: this.toTrimmedString(stock.label) || `Stock ${safeNumber}`,
      cutTopSize: Math.max(0, this.toNumber(stock.cutTopSize, 0)),
      cutBottomSize: Math.max(0, this.toNumber(stock.cutBottomSize, 0)),
      cutLeftSize: Math.max(0, this.toNumber(stock.cutLeftSize, 0)),
      cutRightSize: Math.max(0, this.toNumber(stock.cutRightSize, 0))
    };
  }

  private toTrimmedString(value: string | null | undefined): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private toBoolean(value: boolean | string | null | undefined, fallback: boolean): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    const normalisedValue = this.toTrimmedString(value).toLowerCase();

    if (['true', '1', 'yes', 'y', 'on'].includes(normalisedValue)) {
      return true;
    }

    if (['false', '0', 'no', 'n', 'off'].includes(normalisedValue)) {
      return false;
    }

    return fallback;
  }

  private parseOptionalPositiveInteger(value: string): number | null {
    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
      return null;
    }

    const parsedValue = this.toInteger(trimmedValue, 0);

    return parsedValue > 0 ? parsedValue : null;
  }

  private toNumber(value: number | string | null, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  }

  private toInteger(value: number | string | null, fallback: number): number {
    return Math.round(this.toNumber(value, fallback));
  }
}

