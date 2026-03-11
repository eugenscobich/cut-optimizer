import { Component, computed, signal } from '@angular/core';
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

@Component({
  selector: 'app-parts-management',
  standalone: true,
  imports: [FormsModule, AgGridAngular],
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

  addPart(): void {
    const newPart = createEmptyPart(this.getNextPartNumber());

    this.parts.update((parts) => [...parts, newPart]);
    this.selectedPartId.set(newPart.id);
    this.focusPartRow(newPart.id, 'label');
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

  private replacePart(updatedPart: Part): void {
    const normalisedPart = this.sanitisePart(updatedPart);

    this.parts.update((parts) =>
      parts.map((part) => (part.id === normalisedPart.id ? normalisedPart : part))
    );
  }

  private getNextPartNumber(): number {
    return this.parts().reduce((max, part) => Math.max(max, part.number), 0) + 1;
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
      label: part.label,
      material: part.material
    };
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

