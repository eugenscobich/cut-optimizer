import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Part, Stock, Settings, Solution, OptimizationInput } from '@models/index';

/**
 * Optimization Service
 * Manages optimization state and execution
 */
@Injectable({
  providedIn: 'root'
})
export class OptimizationService {
  private partsSubject = new BehaviorSubject<Part[]>([]);
  private stocksSubject = new BehaviorSubject<Stock[]>([]);
  private settingsSubject = new BehaviorSubject<Settings>({
    kerf_thickness: 3.2,
    default_stock_cut_perimeter: 0
  });
  private solutionsSubject = new BehaviorSubject<Solution[]>([]);
  private isOptimizingSubject = new BehaviorSubject<boolean>(false);

  parts$ = this.partsSubject.asObservable();
  stocks$ = this.stocksSubject.asObservable();
  settings$ = this.settingsSubject.asObservable();
  solutions$ = this.solutionsSubject.asObservable();
  isOptimizing$ = this.isOptimizingSubject.asObservable();

  constructor() {}

  /**
   * Update parts list
   */
  updateParts(parts: Part[]): void {
    this.partsSubject.next(parts);
  }

  /**
   * Update stocks list
   */
  updateStocks(stocks: Stock[]): void {
    this.stocksSubject.next(stocks);
  }

  /**
   * Update settings
   */
  updateSettings(settings: Settings): void {
    this.settingsSubject.next(settings);
  }

  /**
   * Get current parts
   */
  getParts(): Part[] {
    return this.partsSubject.value;
  }

  /**
   * Get current stocks
   */
  getStocks(): Stock[] {
    return this.stocksSubject.value;
  }

  /**
   * Get current settings
   */
  getSettings(): Settings {
    return this.settingsSubject.value;
  }

  /**
   * Get current solutions
   */
  getSolutions(): Solution[] {
    return this.solutionsSubject.value;
  }

  /**
   * Start optimization
   * @param algorithm The algorithm to use
   */
  async startOptimization(algorithm: 'guillotine-minSheets' | 'guillotine-minWaste' | 'guillotine-minCutLength' = 'guillotine-minSheets'): Promise<void> {
    const input: OptimizationInput = {
      parts: this.partsSubject.value,
      stocks: this.stocksSubject.value,
      settings: this.settingsSubject.value
    };

    if (!this.validateInput(input)) {
      throw new Error('Invalid input: No parts or stocks available');
    }

    this.isOptimizingSubject.next(true);

    try {
      // Optimization logic will be implemented here
      console.log('Starting optimization with algorithm:', algorithm);
      console.log('Input:', input);

      // Simulate optimization delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Solutions will be updated via updateSolutions
    } finally {
      this.isOptimizingSubject.next(false);
    }
  }

  /**
   * Stop ongoing optimization
   */
  stopOptimization(): void {
    this.isOptimizingSubject.next(false);
  }

  /**
   * Update solutions
   */
  updateSolutions(solutions: Solution[]): void {
    this.solutionsSubject.next(solutions);
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.partsSubject.next([]);
    this.stocksSubject.next([]);
    this.solutionsSubject.next([]);
    this.settingsSubject.next({
      kerf_thickness: 3.2,
      default_stock_cut_perimeter: 0
    });
  }

  /**
   * Validate optimization input
   */
  private validateInput(input: OptimizationInput): boolean {
    return (
      input.parts && input.parts.length > 0 &&
      input.stocks && input.stocks.length > 0 &&
      input.parts.some(p => p.enabled && p.quantity > 0) &&
      input.stocks.some(s => s.enabled && s.quantity > 0)
    );
  }
}

