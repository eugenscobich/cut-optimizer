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

        // Base case: all parts placed
        if (remainingParts.length === 0) {
            const solution = new Solution(`Solution-${this.solutions.length + 1}`);
            solution.used_sheets = usedSheets.map(sheet => sheet);
            solution.unused_sheets = unusedSheets.map(stock => stock);
            solution.waste_parts = [];
            this.solutions.push(solution);
            this.updateProgress(`Solutions found: ${this.solutions.length}`, 100);
            return;
        }

        // Try to place first remaining part
        const currentPart = remainingParts[0];
        const restParts = remainingParts.slice(1);

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

                // Try to place on used sheet or new sheet
                let placed = false;

                // Try on existing sheets first
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

                            // Process new regions (for future placements)
                            // For now, continue with simple placement
                            await this.placePartsRecursive(
                                restParts,
                                availableStocks,
                                newUsedSheets,
                                unusedSheets,
                                placedCount + 1,
                                totalParts
                            );

                            placed = true;
                            // Break after first successful placement
                            break;
                        }
                    }
                }

                // Try on new sheet
                if (!placed && availableStocks.length > 0) {
                    const newSheet = new UsedSheet(stock, usedSheets.length);
                    const newRegions = this.tryPlacePart(newSheet, currentPart, placement.x, placement.y, placement.rotated);

                    if (newRegions !== null) {
                        const newAvailableStocks = availableStocks.filter((s, i) => i !== stockIndex);
                        const newUsedSheets = [...usedSheets, newSheet];
                        const newUnusedSheets = unusedSheets.length > 0 ? unusedSheets : [];

                        await this.placePartsRecursive(
                            restParts,
                            newAvailableStocks,
                            newUsedSheets,
                            newUnusedSheets,
                            placedCount + 1,
                            totalParts
                        );

                        placed = true;
                    }
                }

                if (placed) {
                    break;
                }
            }
        }

        // Try partial solution if no stock available
        if (availableStocks.length === 0) {
            const solution = new Solution(`Solution-${this.solutions.length + 1}`);
            solution.used_sheets = usedSheets;
            solution.unused_sheets = unusedSheets;
            solution.waste_parts = remainingParts;
            this.solutions.push(solution);
            this.updateProgress(`Partial solution found: ${this.solutions.length}`, 100);
        }
    }

    getPossiblePlacements(part, stock) {
        const placements = [];
        const usableLength = stock.length - stock.cut_left_size - stock.cut_right_size;
        const usableWidth = stock.width - stock.cut_top_size - stock.cut_bottom_size;

        // Try standard orientation
        if (part.length <= usableLength && part.width <= usableWidth) {
            placements.push({
                x: stock.cut_left_size,
                y: stock.cut_top_size,
                rotated: false
            });
        }

        // Try rotated orientation if allowed
        if (part.ignore_direction && (part.width <= usableLength && part.length <= usableWidth)) {
            placements.push({
                x: stock.cut_left_size,
                y: stock.cut_top_size,
                rotated: true
            });
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
}

