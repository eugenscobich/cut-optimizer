import { Component, computed, signal } from '@angular/core';
import { Toolbar, ToolbarWidget, ToolbarWidgetGroup } from '@angular/aria/toolbar';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  CellValueChangedEvent,
  CheckboxEditorModule,
  ColDef,
  ClientSideRowModelModule,
  GetRowIdParams,
  ICellRendererParams,
  GridApi,
  GridReadyEvent,
  ModuleRegistry,
  NumberEditorModule,
  TextEditorModule,
  themeQuartz
} from 'ag-grid-community';
import { Part } from './part.model';

const PARTS_CSV_HEADERS = [
  'number',
  'label',
  'length',
  'width',
  'quantity',
  'enabled',
  'ignore_direction',
  'material'
] as const;

type PartCsvHeader = (typeof PARTS_CSV_HEADERS)[number];

type PartsCsvRow = Record<PartCsvHeader, string>;

const PARTS_CSV_HEADER_SET = new Set<string>(PARTS_CSV_HEADERS);

ModuleRegistry.registerModules([
  CheckboxEditorModule,
  ClientSideRowModelModule,
  NumberEditorModule,
  TextEditorModule
]);

const createPartId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `part-${Math.random().toString(36).slice(2, 10)}`;
};

const createSampleParts = (): Part[] => [
  {
    id: createPartId(),
    number: 1,
    label: 'Base Panel',
    length: 2400,
    width: 600,
    quantity: 2,
    enabled: true,
    ignoreDirection: false,
    material: 'Birch plywood'
  },
  {
    id: createPartId(),
    number: 2,
    label: 'Divider',
    length: 1800,
    width: 400,
    quantity: 4,
    enabled: true,
    ignoreDirection: true,
    material: 'Birch plywood'
  },
  {
    id: createPartId(),
    number: 3,
    label: 'Back Panel',
    length: 2000,
    width: 800,
    quantity: 1,
    enabled: true,
    ignoreDirection: false,
    material: 'MDF'
  }
];

const createEmptyPart = (nextNumber: number): Part => ({
  id: createPartId(),
  number: nextNumber,
  label: `Part ${nextNumber}`,
  length: 1200,
  width: 600,
  quantity: 1,
  enabled: true,
  ignoreDirection: false,
  material: 'Birch plywood'
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
  selector: 'app-parts-management',
  standalone: true,
  imports: [FormsModule, AgGridAngular, Toolbar, ToolbarWidget],
  templateUrl: './parts-management.html',
  styleUrl: './parts-management.css'
})
export class PartsManagementComponent {
  readonly gridTheme = themeQuartz;

  readonly parts = signal<Part[]>(createSampleParts());
  readonly selectedPartId = signal<string | null>(this.parts()[0]?.id ?? null);
  readonly selectedPart = computed(
    () => this.parts().find((part) => part.id === this.selectedPartId()) ?? null
  );

  readonly defaultColDef: ColDef<Part> = {
    editable: true,
    resizable: true,
    sortable: true,
    minWidth: 80,
    flex: 1
  };

  readonly columnDefs: ColDef<Part>[] = [
    {
      field: 'number',
      headerName: '#',
      maxWidth: 60,
      minWidth: 40,
      cellDataType: 'number'
    },
    {
      field: 'label',
      headerName: 'Label',
      minWidth: 100
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
      field: 'quantity',
      headerName: 'Qty',
      cellDataType: 'number'
    },
    {
      field: 'enabled',
      headerName: 'Enabled',
      cellDataType: 'boolean',
      cellEditor: 'agCheckboxCellEditor',
      valueFormatter: (params) => (params.value ? 'Yes' : 'No')
    },
    {
      field: 'ignoreDirection',
      headerName: 'Rotate',
      cellDataType: 'boolean',
      cellEditor: 'agCheckboxCellEditor',
      valueFormatter: (params) => (params.value ? 'Yes' : 'No')
    },
    {
      field: 'material',
      headerName: 'Material',
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      editable: false,
      filter: false,
      sortable: false,
      resizable: false,
      cellRenderer: (params: ICellRendererParams<Part>) => this.createDeleteButton(params)
    }
  ];

  readonly getRowId = (params: GetRowIdParams<Part>): string => params.data.id;

  private gridApi?: GridApi<Part>;

  exportPartsToCsvText(parts: Part[] = this.parts()): string {
    const headerRow = PARTS_CSV_HEADERS.join(',');
    const dataRows = parts.map((part) =>
      [
        part.number,
        part.label,
        part.length,
        part.width,
        part.quantity,
        toCsvBoolean(part.enabled),
        toCsvBoolean(part.ignoreDirection),
        part.material
      ]
        .map((value) => escapeCsvCell(value))
        .join(',')
    );

    return [headerRow, ...dataRows].join('\r\n');
  }

  addPart(): void {
    const newPart = createEmptyPart(this.getNextPartNumber());

    this.parts.update((parts) => [...parts, newPart]);
    this.selectedPartId.set(newPart.id);
    this.focusPartRow(newPart.id, 'label');
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

      this.importPartsFromCsvText(csvText);
    } catch (error) {

    } finally {
      if (input) {
        input.value = '';
      }
    }
  }

  importPartsFromCsvText(csvText: string): void {
    const importedParts = this.parsePartsCsvText(csvText);

    if (importedParts.length === 0) {
      throw new Error('CSV file does not contain any part rows.');
    }

    this.gridApi?.stopEditing();
    this.parts.set(importedParts);
    this.selectedPartId.set(importedParts[0]?.id ?? null);
  }

  exportParts(): void {
    if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const downloadUrl = URL.createObjectURL(
      new Blob([this.exportPartsToCsvText()], { type: 'text/csv;charset=utf-8;' })
    );
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = 'parts.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

  }

  onGridReady(event: GridReadyEvent<Part>): void {
    this.gridApi = event.api;
  }

  onCellValueChanged(event: CellValueChangedEvent<Part>): void {
    if (!event.data) {
      return;
    }

    const updatedPart = this.sanitisePart(event.data);
    this.replacePart(updatedPart);
    this.selectedPartId.set(updatedPart.id);
  }

  selectPart(partId: string | null): void {
    this.selectedPartId.set(partId);
  }

  deletePart(partId: string): void {
    const currentParts = this.parts();
    const deletedPartIndex = currentParts.findIndex((part) => part.id === partId);

    if (deletedPartIndex < 0) {
      return;
    }

    const remainingParts = currentParts.filter((part) => part.id !== partId);
    const currentSelection = this.selectedPartId();

    this.parts.set(remainingParts);

    if (currentSelection !== partId) {
      if (currentSelection && remainingParts.some((part) => part.id === currentSelection)) {
        return;
      }

      this.selectedPartId.set(remainingParts[0]?.id ?? null);
      return;
    }

    const nextSelectionId =
      remainingParts[deletedPartIndex]?.id ?? remainingParts[deletedPartIndex - 1]?.id ?? null;

    this.selectedPartId.set(nextSelectionId);
  }

  private parsePartsCsvText(csvText: string): Part[] {
    const csvRows = this.readPartsCsvRows(csvText);
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

      return this.sanitisePart({
        id: createPartId(),
        number,
        label: this.toTrimmedString(row.label) || `Part ${number}`,
        length: this.toNumber(row.length, 0),
        width: this.toNumber(row.width, 0),
        quantity: Math.max(1, this.toInteger(row.quantity, 1)),
        enabled: this.toBoolean(row.enabled, true),
        ignoreDirection: this.toBoolean(row.ignore_direction, false),
        material: this.toTrimmedString(row.material)
      });
    });
  }

  private readPartsCsvRows(csvText: string): PartsCsvRow[] {
    const rows = parseCsvTable(csvText.trim());

    if (rows.length === 0) {
      throw new Error('CSV file is empty.');
    }

    const [headerRow, ...dataRows] = rows;
    const headerMap = new Map<number, PartCsvHeader>();

    headerRow.forEach((header, index) => {
      const normalisedHeader = normaliseCsvHeader(header);

      if (!PARTS_CSV_HEADER_SET.has(normalisedHeader)) {
        return;
      }

      const mappedHeader = normalisedHeader as PartCsvHeader;

      if ([...headerMap.values()].includes(mappedHeader)) {
        throw new Error(`CSV contains duplicate "${mappedHeader}" columns.`);
      }

      headerMap.set(index, mappedHeader);
    });

    if (headerMap.size === 0) {
      throw new Error(
        `CSV must include at least one supported column: ${PARTS_CSV_HEADERS.join(', ')}.`
      );
    }

    return dataRows
      .filter((row) => row.some((value) => value.trim().length > 0))
      .map((row) => {
        const partRow = Object.fromEntries(
          PARTS_CSV_HEADERS.map((header) => [header, ''])
        ) as PartsCsvRow;

        for (const [columnIndex, header] of headerMap.entries()) {
          partRow[header] = row[columnIndex]?.trim() ?? '';
        }

        return partRow;
      });
  }

  private replacePart(updatedPart: Part): void {
    const normalisedPart = this.sanitisePart(updatedPart);

    this.parts.update((parts) =>
      parts.map((part) => (part.id === normalisedPart.id ? normalisedPart : part))
    );
  }

  private getNextPartNumber(): number {
    return this.parts().reduce((max, part) => Math.max(max, part.number), 0) + 1;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return 'Unable to process the CSV file.';
  }

  private focusPartRow(partId: string, colKey: keyof Part): void {
    if (!this.gridApi) {
      return;
    }

    setTimeout(() => {
      if (!this.gridApi) {
        return;
      }

      const rowIndex = this.parts().findIndex((part) => part.id === partId);

      if (rowIndex < 0) {
        return;
      }

      this.gridApi.ensureIndexVisible(rowIndex, 'bottom');
      this.gridApi.startEditingCell({ rowIndex, colKey });
    }, 0);
  }

  private createDeleteButton(params: ICellRendererParams<Part>): HTMLSpanElement {
    const span = document.createElement('span');

    span.className = 'icon material-symbols-outlined';
    span.textContent = 'Delete';
    span.setAttribute('aria-label', `Delete ${params.data?.label ?? 'part'}`);
    span.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (params.data) {
        this.deletePart(params.data.id);
      }
    });

    return span;
  }

  private sanitisePart(part: Part): Part {
    return {
      ...part,
      number: Math.max(1, this.toInteger(part.number, 1)),
      length: this.toNumber(part.length, 0),
      width: this.toNumber(part.width, 0),
      quantity: Math.max(1, this.toInteger(part.quantity, 1)),
      enabled: Boolean(part.enabled),
      ignoreDirection: Boolean(part.ignoreDirection),
      label: this.toTrimmedString(part.label) || `Part ${Math.max(1, this.toInteger(part.number, 1))}`,
      material: this.toTrimmedString(part.material)
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

