import { Injectable } from '@angular/core';
import { Solution, UsedSheet, PlacedPart, CutLine, WasteArea } from '@models/index';

/**
 * Visualization Service
 * Handles rendering and visualization of solutions
 */
@Injectable({
  providedIn: 'root'
})
export class VisualizationService {
  constructor() {}

  /**
   * Generate visualization for a solution
   */
  visualizeSolution(solution: Solution, canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all sheets
    solution.usedSheets.forEach((sheet, index) => {
      this.drawSheet(ctx, sheet, index, canvas);
    });
  }

  /**
   * Draw a single sheet
   */
  private drawSheet(ctx: CanvasRenderingContext2D, sheet: UsedSheet, index: number, canvas: HTMLCanvasElement): void {
    const scale = this.calculateScale(sheet, canvas);
    const padding = 20;
    const x = padding;
    const y = padding + (index * (sheet.stock.width * scale + 40));

    // Draw stock background
    ctx.fillStyle = '#f0f0f0';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, sheet.stock.length * scale, sheet.stock.width * scale);
    ctx.strokeRect(x, y, sheet.stock.length * scale, sheet.stock.width * scale);

    // Draw placed parts
    sheet.placedParts.forEach(placed => {
      this.drawPart(ctx, placed, scale, x, y);
    });

    // Draw cut lines
    sheet.cuts.forEach(cut => {
      this.drawCutLine(ctx, cut, scale, x, y);
    });

    // Draw waste areas
    sheet.wasteAreas.forEach(waste => {
      this.drawWasteArea(ctx, waste, scale, x, y);
    });
  }

  /**
   * Draw a placed part
   */
  private drawPart(ctx: CanvasRenderingContext2D, placed: PlacedPart, scale: number, offsetX: number, offsetY: number): void {
    const x = offsetX + placed.x * scale;
    const y = offsetY + placed.y * scale;
    const width = placed.part.width * scale;
    const height = placed.part.length * scale;

    // Draw part rectangle
    ctx.fillStyle = '#3498db';
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);

    // Draw part label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(placed.part.label, x + width / 2, y + height / 2);
  }

  /**
   * Draw a cut line
   */
  private drawCutLine(ctx: CanvasRenderingContext2D, cut: CutLine, scale: number, offsetX: number, offsetY: number): void {
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(offsetX + cut.x1 * scale, offsetY + cut.y1 * scale);
    ctx.lineTo(offsetX + cut.x2 * scale, offsetY + cut.y2 * scale);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * Draw a waste area
   */
  private drawWasteArea(ctx: CanvasRenderingContext2D, waste: WasteArea, scale: number, offsetX: number, offsetY: number): void {
    ctx.fillStyle = 'rgba(255, 193, 7, 0.3)';
    ctx.strokeStyle = '#ffc107';
    ctx.lineWidth = 1;
    ctx.fillRect(
      offsetX + waste.x * scale,
      offsetY + waste.y * scale,
      waste.width * scale,
      waste.height * scale
    );
    ctx.strokeRect(
      offsetX + waste.x * scale,
      offsetY + waste.y * scale,
      waste.width * scale,
      waste.height * scale
    );
  }

  /**
   * Calculate scale to fit on canvas
   */
  private calculateScale(sheet: UsedSheet, canvas: HTMLCanvasElement): number {
    const maxWidth = canvas.width - 60;
    const maxHeight = canvas.height - 60;
    const scaleX = maxWidth / sheet.stock.length;
    const scaleY = maxHeight / sheet.stock.width;
    return Math.min(scaleX, scaleY, 1);
  }

  /**
   * Generate 3D visualization (placeholder for Three.js integration)
   */
  visualizeSolution3D(solution: Solution, container: HTMLElement): void {
    console.log('3D visualization will be implemented with Three.js');
    console.log('Solution:', solution);
  }
}

