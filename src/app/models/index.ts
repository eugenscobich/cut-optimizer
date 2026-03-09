/**
 * Part Model
 * Represents a single part to be cut from stock material
 */
export interface Part {
  number?: number;
  label: string;
  length: number;
  width: number;
  quantity: number;
  enabled: boolean;
  ignore_direction: boolean;
  material?: string; // Optional: material/stock constraint
}

/**
 * Stock Model
 * Represents available stock/sheet material
 */
export interface Stock {
  number?: number;
  label: string;
  length: number;
  width: number;
  thickness: number;
  quantity: number;
  enabled: boolean;
  ignore_direction: boolean;
  cut_top_size: number;
  cut_bottom_size: number;
  cut_left_size: number;
  cut_right_size: number;
}

/**
 * Settings Model
 * Global optimization settings
 */
export interface Settings {
  kerf_thickness: number; // Blade thickness
  default_stock_cut_perimeter: number; // Default trimming size
}

/**
 * Placed Part
 * Represents a part placed on a sheet with position and orientation
 */
export interface PlacedPart {
  part: Part;
  x: number;
  y: number;
  rotation: number; // 0 or 90 degrees
  partNumber?: number;
}

/**
 * Cut Line
 * Represents a single cut line on a sheet
 */
export interface CutLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  direction: 'horizontal' | 'vertical';
  length: number;
}

/**
 * Used Sheet
 * Represents a sheet with placed parts and cuts
 */
export interface UsedSheet {
  stock: Stock;
  placedParts: PlacedPart[];
  cuts: CutLine[];
  wasteAreas: WasteArea[];
  usedArea: number;
  wasteArea: number;
  cutCount: number;
  totalCutLength: number;
}

/**
 * Waste Area
 * Represents a waste region on a sheet
 */
export interface WasteArea {
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
}

/**
 * Solution Statistics
 * Contains metrics for a complete solution
 */
export interface SolutionStatistics {
  global: {
    totalUsedArea: number;
    totalWastedArea: number;
    totalCuts: number;
    totalCutLength: number;
    sheetsUsed: number;
  };
  perSheet: Map<number, {
    sheetUsedArea: number;
    sheetWasteArea: number;
    cutCount: number;
    totalCutLength: number;
    placedPartsCount: number;
  }>;
}

/**
 * Solution Model
 * Represents a complete cutting solution
 */
export interface Solution {
  id: string;
  usedSheets: UsedSheet[];
  unusedSheets: Stock[];
  wasteAreas: WasteArea[];
  statistics: SolutionStatistics;
  timestamp: Date;
  algorithmUsed?: 'guillotine-minSheets' | 'guillotine-minWaste' | 'guillotine-minCutLength';
  totalWaste: number;
  totalUsedArea: number;
}

/**
 * Optimization Input
 * Contains all inputs needed for optimization
 */
export interface OptimizationInput {
  parts: Part[];
  stocks: Stock[];
  settings: Settings;
}

