import { Component, inject } from '@angular/core';
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
import { StocksStore } from './stocks.store';

ModuleRegistry.registerModules([
  CheckboxEditorModule,
  ClientSideRowModelModule,
  NumberEditorModule,
  TextEditorModule
]);

@Component({
  selector: 'app-stocks-management',
  standalone: true,
  imports: [FormsModule, AgGridAngular, Toolbar, ToolbarWidget],
  templateUrl: './stocks-management.html',
  styleUrl: './stocks-management.css'
})
export class StocksManagementComponent {
  private readonly stocksStore = inject(StocksStore);

  readonly gridTheme = themeQuartz;
  readonly stocks = this.stocksStore.stocks;
  readonly selectedStockId = this.stocksStore.selectedStockId;
  readonly selectedStock = this.stocksStore.selectedStock;

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
    return this.stocksStore.exportStocksToCsvText(stocks);
  }

  addStock(): void {
    const newStock = this.stocksStore.addStock();
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
    this.gridApi?.stopEditing();
    this.stocksStore.importStocksFromCsvText(csvText);
  }

  exportStocks(): void {
    this.stocksStore.exportStocks();
  }

  onGridReady(event: GridReadyEvent<Stock>): void {
    this.gridApi = event.api;
  }

  onCellValueChanged(event: CellValueChangedEvent<Stock>): void {
    if (!event.data) {
      return;
    }

    this.stocksStore.replaceStock(event.data);
  }

  selectStock(stockId: string | null): void {
    this.stocksStore.selectStock(stockId);
  }

  deleteStock(stockId: string): void {
    this.stocksStore.deleteStock(stockId);
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

}

