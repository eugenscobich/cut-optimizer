import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { Part, Stock, Settings } from '@models/index';

@Component({
  selector: 'app-left-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridModule],
  templateUrl: './left-panel.component.html',
  styleUrls: ['./left-panel.component.scss']
})
export class LeftPanelComponent implements OnInit {
  parts: Part[] = [];
  stocks: Stock[] = [];
  settings: Settings = {
    kerf_thickness: 3.2,
    default_stock_cut_perimeter: 0
  };

  constructor() {}

  ngOnInit(): void {
    this.initializeDefaults();
  }

  private initializeDefaults(): void {
    // Initialize with empty data
    this.parts = [];
    this.stocks = [];
  }

  onPartsCSVUpload(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.parseCSV(file, 'parts');
    }
  }

  onStocksCSVUpload(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.parseCSV(file, 'stocks');
    }
  }

  private parseCSV(file: File, type: 'parts' | 'stocks'): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const csv = e.target.result;
      // CSV parsing logic will be implemented in a dedicated service
      console.log(`Parsing ${type} CSV:`, csv);
    };
    reader.readAsText(file);
  }

  addPart(): void {
    const newPart: Part = {
      number: this.parts.length + 1,
      label: 'New Part',
      length: 100,
      width: 50,
      quantity: 1,
      enabled: true,
      ignore_direction: false
    };
    this.parts.push(newPart);
  }

  addStock(): void {
    const newStock: Stock = {
      number: this.stocks.length + 1,
      label: 'New Stock',
      length: 2800,
      width: 2070,
      thickness: 18,
      quantity: 1,
      enabled: true,
      ignore_direction: false,
      cut_top_size: 0,
      cut_bottom_size: 0,
      cut_left_size: 0,
      cut_right_size: 0
    };
    this.stocks.push(newStock);
  }

  removePart(index: number): void {
    this.parts.splice(index, 1);
  }

  removeStock(index: number): void {
    this.stocks.splice(index, 1);
  }
}

