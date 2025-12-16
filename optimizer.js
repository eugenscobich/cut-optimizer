/**
 * Optimization Algorithm Module
 * Recursive exhaustive search for all valid cutting patterns
 */

class CuttingOptimizer {
    constructor(parts, stocks, settings) {
        this.parts = parts.filter(p => p.enabled);
        this.stocks = stocks.filter(s => s.enabled);
        this.settings = settings;
        this.solutions = [];
        this.isRunning = false;
        this.isStopped = false;
        this.progressCallback = null;
    }

    setProgressCallback(callback) {
        this.progressCallback = callback;
    }

    updateProgress(message, percentage) {
        if (this.progressCallback) {
            this.progressCallback({ message, percentage });
        }
    }

    async optimize() {
        this.isRunning = true;
        this.isStopped = false;
        this.solutions = [];

        try {
            // Calculate total parts to place
            const totalParts = this.parts.reduce((sum, p) => sum + p.quantity, 0);
            console.log('Optimizer initialized with parts:', this.parts.map(p => ({ label: p.label, length: p.length, width: p.width, qty: p.quantity, enabled: p.enabled })));
            console.log('Optimizer initialized with stocks:', this.stocks.map(s => ({ label: s.label, length: s.length, width: s.width, qty: s.quantity, enabled: s.enabled })));
            this.updateProgress(`Optimizing: 0/${totalParts} parts placed`, 0);

            // Create remaining parts list
            const remainingParts = [];
            this.parts.forEach(part => {
                for (let i = 0; i < part.quantity; i++) {
                    remainingParts.push(part);
                }
            });

            // Create stock copies
            const availableStocks = [];
            this.stocks.forEach(stock => {
                for (let i = 0; i < stock.quantity; i++) {
                    availableStocks.push(new Stock(
                        stock.label,
                        stock.length,
                        stock.width,
                        1,
                        stock.enabled,
                        stock.ignore_direction,
                        stock.cut_top_size,
                        stock.cut_bottom_size,
                        stock.cut_left_size,
                        stock.cut_right_size
                    ));
                }
            });

            // Start recursive placement
            await this.placePartsRecursive(
                remainingParts,
                availableStocks,
                [],
                [],
                0,
                totalParts
            );

            // Deduplicate solutions - remove identical layouts
            this.solutions = this.deduplicateSolutions(this.solutions);

            // Sort solutions by waste
            this.solutions.sort((a, b) => a.wastePercentage - b.wastePercentage);

            this.updateProgress(`Optimization complete: ${this.solutions.length} solutions found`, 100);
        } finally {
            this.isRunning = false;
        }

        return this.solutions;
    }

    async placePartsRecursive(remainingParts, availableStocks, usedSheets, unusedSheets, placedCount, totalParts) {
        // Yield to allow cancellation
        if (this.isStopped) {
            return;
        }

        // Allow UI update
        await new Promise(resolve => setTimeout(resolve, 0));

        // Base case: all parts placed - valid complete solution!
        if (remainingParts.length === 0) {
            const solution = new Solution(`Solution-${this.solutions.length + 1}`);
            solution.used_sheets = usedSheets.map(sheet => sheet);
            solution.unused_sheets = unusedSheets.map(stock => stock);
            solution.waste_parts = [];
            this.solutions.push(solution);
            this.updateProgress(`Solutions found: ${this.solutions.length}`, 100);
            return;
        }

        // If no available stocks, this branch cannot place any more parts - fail (no partial solutions)
        if (availableStocks.length === 0) {
            return; // Backtrack - no solution on this branch
        }

        // Try different part orderings to explore more permutations
        // This helps generate diverse solutions with different part arrangements
        for (let partIndex = 0; partIndex < Math.min(remainingParts.length, 3); partIndex++) {
          if (this.isStopped) {
            return;
          }

          // Pick a part from remaining parts (not always the first)
          const currentPart = remainingParts[partIndex];
          const restParts = remainingParts.filter((_, i) => i !== partIndex);

          // Try each available stock
          for (let stockIndex = 0; stockIndex < availableStocks.length; stockIndex++) {
            if (this.isStopped) {
              return;
            }

            const stock = availableStocks[stockIndex];

            // Try placement with and without rotation
            const placements = this.getPossiblePlacements(currentPart, stock);

            for (const placement of placements) {
              if (this.isStopped) {
                return;
              }

              // Try to place on existing sheets first
              for (let sheetIdx = 0; sheetIdx < usedSheets.length; sheetIdx++) {
                if (this.isStopped) {
                  return;
                }

                const sheet = usedSheets[sheetIdx];
                if (sheet.stock === stock) {
                  const clonedSheet = this.cloneSheet(sheet);
                  const newRegions = this.tryPlacePart(clonedSheet, currentPart, placement.x, placement.y, placement.rotated);

                  if (newRegions !== null) {
                    const newUsedSheets = [...usedSheets];
                    newUsedSheets[sheetIdx] = clonedSheet;

                    // Recursively try to place remaining parts
                    // This explores this branch of the solution tree
                    await this.placePartsRecursive(
                        restParts,
                        availableStocks,
                        newUsedSheets,
                        unusedSheets,
                        placedCount + 1,
                        totalParts
                    );
                    // Continue trying other placements (don't break)
                  }
                }
              }

              // Try on new sheet
              if (availableStocks.length > 0) {
                const newSheet = new UsedSheet(stock, usedSheets.length);
                const newRegions = this.tryPlacePart(newSheet, currentPart, placement.x, placement.y, placement.rotated);

                if (newRegions !== null) {
                  const newAvailableStocks = availableStocks.filter((s, i) => i !== stockIndex);
                  const newUsedSheets = [...usedSheets, newSheet];
                  const newUnusedSheets = unusedSheets.length > 0 ? unusedSheets : [];

                  // Recursively try to place remaining parts
                  // This explores this branch of the solution tree
                  await this.placePartsRecursive(
                      restParts,
                      newAvailableStocks,
                      newUsedSheets,
                      newUnusedSheets,
                      placedCount + 1,
                      totalParts
                  );
                  // Continue trying other placements (don't break)
                }
              }
            }
          }
        }
        // Try partial solution if no stock available
        // Don't create partial solutions - only valid solutions with ALL parts placed
        // If we reach here with remaining parts, this branch fails (backtrack)
    }

    getPossiblePlacements(part, stock) {
        const placements = [];
        const usableLength = stock.length - stock.cut_left_size - stock.cut_right_size;
        const usableWidth = stock.width - stock.cut_top_size - stock.cut_bottom_size;

        // Helper function to add placements for a given orientation
        const addPlacementsForOrientation = (partLength, partWidth, rotated) => {
            // Try multiple positions on the stock
            // Start from top-left and try a grid of positions
            const stepSize = 50; // Try positions every 50 units

            for (let x = stock.cut_left_size; x + partLength <= stock.length; x += stepSize) {
                for (let y = stock.cut_top_size; y + partWidth <= stock.width; y += stepSize) {
                    placements.push({
                        x: x,
                        y: y,
                        rotated: rotated
                    });
                }
            }

            // Also try the exact fit position if different from grid positions
            const exactX = stock.length - stock.cut_right_size - partLength;
            const exactY = stock.width - stock.cut_bottom_size - partWidth;
            if (exactX >= stock.cut_left_size && exactY >= stock.cut_top_size) {
                placements.push({
                    x: exactX,
                    y: exactY,
                    rotated: rotated
                });
            }
        };

        // Try standard orientation
        if (part.length <= usableLength && part.width <= usableWidth) {
            addPlacementsForOrientation(part.length, part.width, false);
        }

        // Try rotated orientation if allowed
        if (part.ignore_direction && (part.width <= usableLength && part.length <= usableWidth)) {
            addPlacementsForOrientation(part.width, part.length, true);
        }

        return placements;
    }

    tryPlacePart(sheet, part, x, y, rotated) {
        const placedPart = new PlacedPart(part, x, y, rotated);
        const { length, width } = placedPart;

        // Check if part fits within stock bounds
        if (x + length > sheet.stock.length || y + width > sheet.stock.width) {
            return null;
        }

        // Check for overlap with existing parts
        for (const existing of sheet.placed_parts) {
            if (this.checkOverlap(placedPart, existing)) {
                return null;
            }
        }

        // Place the part
        sheet.placed_parts.push(placedPart);

        // Generate cuts
        this.generateCuts(sheet, placedPart);

        return true;
    }

    checkOverlap(part1, part2) {
        return !(
            part1.x + part1.length <= part2.x ||
            part2.x + part2.length <= part1.x ||
            part1.y + part1.width <= part2.y ||
            part2.y + part2.width <= part1.y
        );
    }

    generateCuts(sheet, placedPart) {
        const kerf = this.settings.kerf_thickness;

        // Add horizontal and vertical cuts for the part
        // Horizontal cuts (top and bottom of part)
        if (!sheet.cuts.find(c => c.direction === 'H' && Math.abs(c.position - placedPart.y) < 0.1)) {
            sheet.cuts.push(new Cut('H', placedPart.y, placedPart.length, placedPart.x));
        }
        if (!sheet.cuts.find(c => c.direction === 'H' && Math.abs(c.position - (placedPart.y + placedPart.width)) < 0.1)) {
            sheet.cuts.push(new Cut('H', placedPart.y + placedPart.width, placedPart.length, placedPart.x));
        }

        // Vertical cuts (left and right of part)
        if (!sheet.cuts.find(c => c.direction === 'V' && Math.abs(c.position - placedPart.x) < 0.1)) {
            sheet.cuts.push(new Cut('V', placedPart.x, placedPart.width, placedPart.y));
        }
        if (!sheet.cuts.find(c => c.direction === 'V' && Math.abs(c.position - (placedPart.x + placedPart.length)) < 0.1)) {
            sheet.cuts.push(new Cut('V', placedPart.x + placedPart.length, placedPart.width, placedPart.y));
        }
    }

    cloneSheet(sheet) {
        const clonedSheet = new UsedSheet(sheet.stock, sheet.index);
        clonedSheet.placed_parts = sheet.placed_parts.map(pp =>
            new PlacedPart(pp.part, pp.x, pp.y, pp.rotated)
        );
        clonedSheet.cuts = sheet.cuts.map(c => new Cut(c.direction, c.position, c.length, c.offset));
        return clonedSheet;
    }

    stop() {
        this.isStopped = true;
    }

    deduplicateSolutions(solutions) {
        // Create a hash map to track unique solutions by their layout
        const seenLayouts = new Map();
        const uniqueSolutions = [];

        solutions.forEach(solution => {
            // Create a signature for this solution based on sheets and part placements
            const signature = this.createSolutionSignature(solution);

            // Only keep the first occurrence of each unique layout
            if (!seenLayouts.has(signature)) {
                seenLayouts.set(signature, true);
                uniqueSolutions.push(solution);
            }
        });

        return uniqueSolutions;
    }

    createSolutionSignature(solution) {
        // Create a unique signature for a solution based on its layout
        // This helps identify duplicate solutions that have the same physical layout

        const sheetSignatures = solution.used_sheets.map(sheet => {
            // Sort parts by position to normalize the signature
            const sortedParts = [...sheet.placed_parts].sort((a, b) => {
                if (a.x !== b.x) return a.x - b.x;
                return a.y - b.y;
            });

            const partsStr = sortedParts.map(p =>
                `${p.part.label}:${p.x},${p.y},${p.rotated ? 'R' : 'N'}`
            ).join('|');

            return `${sheet.stock.label}[${partsStr}]`;
        }).sort().join(';');

        return sheetSignatures;
    }
}

