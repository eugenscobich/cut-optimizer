import { Injectable } from '@angular/core';
import { Part, Stock } from '@models/index';

/**
 * CSV Parser Service
 * Handles parsing of CSV files for Parts and Stocks
 */
@Injectable({
  providedIn: 'root'
})
export class CsvParserService {
  constructor() {}

  /**
   * Parse CSV content into Part objects
   */
  parseParts(csvContent: string): Part[] {
    return this.parseCSV(csvContent, this.mapToPart.bind(this));
  }

  /**
   * Parse CSV content into Stock objects
   */
  parseStocks(csvContent: string): Stock[] {
    return this.parseCSV(csvContent, this.mapToStock.bind(this));
  }

  /**
   * Generic CSV parser
   */
  private parseCSV<T>(content: string, mapper: (row: Record<string, string>, index: number) => T): T[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = this.parseCSVLine(lines[0]);
    const results: T[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header.toLowerCase().trim()] = values[index]?.trim() || '';
      });

      results.push(mapper(row, i - 1));
    }

    return results;
  }

  /**
   * Parse a single CSV line (handles quoted values)
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  /**
   * Map CSV row to Part object
   */
  private mapToPart(row: Record<string, string>, index: number): Part {
    return {
      number: this.parseNumber(row['number']) || index + 1,
      label: row['label'] || `Part ${index + 1}`,
      length: this.parseNumber(row['length']) || 100,
      width: this.parseNumber(row['width']) || 50,
      quantity: this.parseNumber(row['quantity']) || 1,
      enabled: this.parseBoolean(row['enabled'], true),
      ignore_direction: this.parseBoolean(row['ignore_direction'], false),
      material: row['material'] || undefined
    };
  }

  /**
   * Map CSV row to Stock object
   */
  private mapToStock(row: Record<string, string>, index: number): Stock {
    return {
      number: this.parseNumber(row['number']) || index + 1,
      label: row['label'] || `Stock ${index + 1}`,
      length: this.parseNumber(row['length']) || 2800,
      width: this.parseNumber(row['width']) || 2070,
      thickness: this.parseNumber(row['thickness']) || 18,
      quantity: this.parseNumber(row['quantity']) || 1,
      enabled: this.parseBoolean(row['enabled'], true),
      ignore_direction: this.parseBoolean(row['ignore_direction'], false),
      cut_top_size: this.parseNumber(row['cut_top_size']) || 0,
      cut_bottom_size: this.parseNumber(row['cut_bottom_size']) || 0,
      cut_left_size: this.parseNumber(row['cut_left_size']) || 0,
      cut_right_size: this.parseNumber(row['cut_right_size']) || 0
    };
  }

  /**
   * Safe number parsing
   */
  private parseNumber(value?: string): number | null {
    if (!value) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }

  /**
   * Safe boolean parsing
   */
  private parseBoolean(value?: string, defaultValue = false): boolean {
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }
}

