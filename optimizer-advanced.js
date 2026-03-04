/**
 * Advanced Cut Optimization Engine
 * Implements industry-standard algorithms including:
 * - First Fit Decreasing (FFD)
 * - Guillotine Cutting Patterns
 * - Best Fit Heuristics
 * - Bottom-Left Placement
 * - Multi-pass optimization with deduplication
 *
 * Based on: "Cutting and Packing Problems" research and commercial solutions
 */

class AdvancedCuttingOptimizer {
    constructor(parts, stocks, settings) {
        this.parts = parts.filter(p => p.enabled);
        this.stocks = stocks.filter(s => s.enabled);
        this.settings = settings || new Settings();

        // Optimization state
        this.solutions = [];
        this.isRunning = false;
        this.isStopped = false;
        this.progressCallback = null;

        // Performance tracking
        this.startTime = 0;
        this.processedPatterns = 0;
        this.maxPatterns = 10000; // Limit patterns to explore

        // Configuration
        this.config = {
            timeLimit: 30000, // 30 seconds max
            useFFD: true, // First Fit Decreasing
            useBestFit: true, // Try multiple placement strategies
            useGuillotine: true, // Enforce guillotine cuts
            deduplicateSolutions: true,
            sortStrategy: 'area-descending', // Sort parts/stocks
            maxSolutionsKept: 50 // Keep best solutions
        };
    }

    /**
     * Set progress callback for UI updates
     */
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }

    /**
     * Update progress with message and percentage
     */
    updateProgress(message, percentage) {
        if (this.progressCallback) {
            this.progressCallback({ message, percentage });
        }
    }

    /**
     * Main optimization entry point
     * Runs multiple algorithms and returns best solutions
     */
    async optimize() {
        this.isRunning = true;
        this.isStopped = false;
        this.startTime = Date.now();
        this.solutions = [];
        this.processedPatterns = 0;

        try {
            // Expand and sort parts
            const partsToPlace = this.expandAndSortParts();

            if (partsToPlace.length === 0) {
                this.updateProgress('No parts to optimize', 100);
                return [];
            }

            const totalArea = partsToPlace.reduce((sum, p) => sum + p.area, 0);
            this.updateProgress(`Starting optimization: ${partsToPlace.length} parts, ${totalArea.toFixed(2)} total area`, 5);

            // Phase 1: First Fit Decreasing (FFD) - Fast heuristic
            if (this.config.useFFD) {
                await this.optimizeFFD(partsToPlace);
            }

            if (this.isStopped) return this.rankSolutions();

            // Phase 2: Best Fit with multiple strategies
            if (this.config.useBestFit && !this.timeExceeded()) {
                await this.optimizeBestFit(partsToPlace);
            }

            if (this.isStopped) return this.rankSolutions();

            // Phase 3: Exhaustive search on smaller problems
            if (partsToPlace.length <= 8 && !this.timeExceeded()) {
                await this.optimizeExhaustive(partsToPlace);
            }

            // Final processing
            if (this.config.deduplicateSolutions) {
                this.solutions = this.deduplicateSolutions(this.solutions);
            }

            this.rankAndFilterSolutions();
            const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
            this.updateProgress(
                `Optimization complete: ${this.solutions.length} unique solutions found in ${elapsed}s`,
                100
            );

        } finally {
            this.isRunning = false;
        }

        return this.solutions;
    }

    /**
     * Stop optimization process
     */
    stop() {
        this.isStopped = true;
    }

    /**
     * Expand parts by quantity and sort by area (descending)
     */
    expandAndSortParts() {
        const expanded = [];
        this.parts.forEach(part => {
            for (let i = 0; i < part.quantity; i++) {
                expanded.push({ ...part });
            }
        });

        // Sort by area descending (FFD principle)
        if (this.config.sortStrategy === 'area-descending') {
            expanded.sort((a, b) => (b.length * b.width) - (a.length * a.width));
        }

        return expanded;
    }

    /**
     * Create available stock areas, sorted by usable area
     */
    createAvailableStocks() {
        const stocks = [];
        this.stocks.forEach(stock => {
            for (let i = 0; i < stock.quantity; i++) {
                stocks.push({
                    stock: stock,
                    length: stock.length,
                    width: stock.width,
                    usableLength: stock.length - stock.cut_left_size - stock.cut_right_size,
                    usableWidth: stock.width - stock.cut_top_size - stock.cut_bottom_size,
                    x: stock.cut_left_size,
                    y: stock.cut_top_size,
                    placed: [],
                    cuts: [],
                    waste: 0
                });
            }
        });

        // Sort by usable area descending
        stocks.sort((a, b) => (b.usableLength * b.usableWidth) - (a.usableLength * a.usableWidth));
        return stocks;
    }

    /**
     * First Fit Decreasing (FFD) Algorithm
     * Fast heuristic: place each part in first stock where it fits
     */
    async optimizeFFD(parts) {
        this.updateProgress('Phase 1: First Fit Decreasing...', 15);

        const stocks = this.createAvailableStocks();
        const solution = {
            sheets: [],
            placed: 0,
            utilization: 0
        };

        // Try to place each part
        for (let i = 0; i < parts.length && !this.isStopped; i++) {
            const part = parts[i];
            let placed = false;

            // Try each stock
            for (const stock of stocks) {
                if (this.isStopped) return;

                // Try both orientations if allowed
                const orientations = this.getOrientations(part);
                for (const orientation of orientations) {
                    // Try to place in this stock
                    const placement = this.findPlacementFFD(stock, orientation);
                    if (placement) {
                        this.placePart(stock, part, orientation, placement);
                        solution.placed++;
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }

            if ((i + 1) % 5 === 0) {
                await new Promise(r => setTimeout(r, 0)); // Yield to UI
            }
        }

        // Record solution
        if (solution.placed > 0) {
            this.recordSolution(stocks, solution);
            this.updateProgress(`FFD: Placed ${solution.placed}/${parts.length} parts`, 25);
        }
    }

    /**
     * Best Fit Algorithm with multiple strategies
     * Tries different placement positions and orientations
     */
    async optimizeBestFit(parts) {
        this.updateProgress('Phase 2: Best Fit Heuristic...', 35);

        const stocks = this.createAvailableStocks();
        const strategies = [
            'bottom-left',
            'best-area',
            'best-width'
        ];

        for (const strategy of strategies) {
            if (this.isStopped) return;

            const solution = {
                sheets: [],
                placed: 0,
                utilization: 0,
                strategy: strategy
            };

            for (let i = 0; i < parts.length && !this.isStopped; i++) {
                const part = parts[i];

                // Find best placement across all stocks
                let bestPlacement = null;
                let bestStock = null;

                for (const stock of stocks) {
                    const orientations = this.getOrientations(part);
                    for (const orientation of orientations) {
                        const placement = this.findPlacementByStrategy(stock, orientation, strategy);
                        if (placement) {
                            // Score placement
                            const score = this.scorePlacement(stock, placement, strategy);
                            if (!bestPlacement || score < bestPlacement.score) {
                                bestPlacement = placement;
                                bestPlacement.score = score;
                                bestStock = stock;
                            }
                        }
                    }
                }

                if (bestPlacement && bestStock) {
                    this.placePart(bestStock, part, bestPlacement.orientation, bestPlacement);
                    solution.placed++;
                }

                if ((i + 1) % 5 === 0) {
                    await new Promise(r => setTimeout(r, 0));
                }
            }

            if (solution.placed > 0) {
                this.recordSolution(stocks, solution);
            }
        }

        this.updateProgress(`Best Fit: Multiple strategies evaluated`, 45);
    }

    /**
     * Exhaustive search for small problems
     */
    async optimizeExhaustive(parts) {
        if (parts.length > 8) return;

        this.updateProgress('Phase 3: Exhaustive Search...', 55);

        const stocks = this.createAvailableStocks();

        // Generate permutations of parts (reduced for performance)
        const permutations = this.generatePermutations(parts.slice(0, Math.min(6, parts.length)));

        for (let p = 0; p < permutations.length && !this.isStopped; p++) {
            const perm = permutations[p];
            const stocksCopy = this.deepCopyStocks(stocks);
            let placed = 0;

            for (const part of perm) {
                if (this.isStopped) return;

                let bestPlacement = null;
                let bestStock = null;
                let bestScore = Infinity;

                for (const stock of stocksCopy) {
                    const orientations = this.getOrientations(part);
                    for (const orientation of orientations) {
                        const placement = this.findPlacementBestArea(stock, orientation);
                        if (placement) {
                            const score = this.scorePlacement(stock, placement, 'best-area');
                            if (score < bestScore) {
                                bestScore = score;
                                bestPlacement = placement;
                                bestStock = stock;
                            }
                        }
                    }
                }

                if (bestPlacement && bestStock) {
                    this.placePart(bestStock, part, bestPlacement.orientation, bestPlacement);
                    placed++;
                }
            }

            if (placed > 0) {
                this.recordSolution(stocksCopy, { placed });
            }

            if (p % 10 === 0) {
                await new Promise(r => setTimeout(r, 0));
            }
        }
    }

    /**
     * Get allowed orientations for a part
     */
    getOrientations(part) {
        const orientations = [
            { length: part.length, width: part.width, rotated: false }
        ];

        if (part.ignore_direction && part.length !== part.width) {
            orientations.push({ length: part.width, width: part.length, rotated: true });
        }

        return orientations;
    }

    /**
     * Find First Fit Decreasing placement
     */
    findPlacementFFD(stock, orientation) {
        // Simple: try to place at next available position
        const placements = this.findAllPlacements(stock, orientation);
        return placements.length > 0 ? placements[0] : null;
    }

    /**
     * Find placement using strategy
     */
    findPlacementByStrategy(stock, orientation, strategy) {
        const placements = this.findAllPlacements(stock, orientation);
        if (placements.length === 0) return null;

        if (strategy === 'bottom-left') {
            // Prefer bottom-left corner
            placements.sort((a, b) => {
                const distA = a.x + a.y;
                const distB = b.x + b.y;
                return distA - distB;
            });
        } else if (strategy === 'best-area') {
            // Find placement that minimizes wasted area
            placements.sort((a, b) => {
                const wasteA = stock.usableLength * stock.usableWidth - orientation.length * orientation.width;
                const wasteB = wasteA;
                return wasteA - wasteB;
            });
        } else if (strategy === 'best-width') {
            // Minimize remaining width
            placements.sort((a, b) => {
                const remA = Math.abs(stock.usableLength - a.x - orientation.length);
                const remB = Math.abs(stock.usableLength - b.x - orientation.length);
                return remA - remB;
            });
        }

        return placements[0];
    }

    /**
     * Find best area placement
     */
    findPlacementBestArea(stock, orientation) {
        return this.findPlacementByStrategy(stock, orientation, 'best-area');
    }

    /**
     * Find all valid placements for a part in a stock
     */
    findAllPlacements(stock, orientation) {
        const placements = [];
        const kerf = parseFloat(this.settings.kerf_thickness) || 0;
        const placed = stock.placed || [];

        // Guillotine constraint: try to align with existing placements
        const xPositions = new Set([stock.x]);
        const yPositions = new Set([stock.y]);

        placed.forEach(p => {
            xPositions.add(p.x + p.length + kerf);
            yPositions.add(p.y + p.width + kerf);
        });

        // Try each position
        for (const x of xPositions) {
            for (const y of yPositions) {
                if (this.canPlace(stock, orientation, x, y, placed, kerf)) {
                    placements.push({
                        x: x,
                        y: y,
                        orientation: orientation
                    });
                }
            }
        }

        return placements;
    }

    /**
     * Check if part can be placed at position
     */
    canPlace(stock, orientation, x, y, placed, kerf) {
        // Check bounds
        if (x + orientation.length > stock.x + stock.usableLength) return false;
        if (y + orientation.width > stock.y + stock.usableWidth) return false;

        // Check overlaps with existing placements
        for (const p of placed) {
            const overlapsX = !(x + orientation.length <= p.x || x >= p.x + p.length);
            const overlapsY = !(y + orientation.width <= p.y || y >= p.y + p.width);
            if (overlapsX && overlapsY) return false;
        }

        return true;
    }

    /**
     * Place a part in a stock
     */
    placePart(stock, part, orientation, placement) {
        stock.placed.push({
            part: part,
            x: placement.x,
            y: placement.y,
            length: orientation.length,
            width: orientation.width,
            rotated: orientation.rotated,
            area: orientation.length * orientation.width
        });
    }

    /**
     * Score a placement (lower is better)
     */
    scorePlacement(stock, placement, strategy) {
        const kerf = parseFloat(this.settings.kerf_thickness) || 0;
        const remainingLength = stock.x + stock.usableLength - placement.x - placement.orientation.length;
        const remainingWidth = stock.y + stock.usableWidth - placement.y - placement.orientation.width;

        if (strategy === 'bottom-left') {
            return placement.x + placement.y;
        } else if (strategy === 'best-width') {
            return remainingLength * remainingWidth;
        } else {
            return remainingLength + remainingWidth;
        }
    }

    /**
     * Record a complete solution
     */
    recordSolution(stocks, metadata) {
        // Generate visualization-friendly cuts for each stock so UI can display them
        try {
            this.generateCutsForStocks(stocks);
        } catch (e) {
            // Non-fatal: continue even if cut generation fails
            console.warn('Cut generation failed:', e);
        }

        const sheets = stocks.filter(s => s.placed.length > 0).map(stock => {
            const totalArea = stock.usableLength * stock.usableWidth;
            const usedArea = stock.placed.reduce((sum, p) => sum + p.area, 0);

            return {
                stock: stock.stock,
                placed: stock.placed,
                cuts: stock.cuts,
                utilization: totalArea > 0 ? (usedArea / totalArea) * 100 : 0,
                usedArea: usedArea,
                totalArea: totalArea,
                wastedArea: totalArea - usedArea
            };
        });

        if (sheets.length > 0) {
            const solution = new SolutionAdvanced(
                this.solutions.length + 1,
                sheets,
                metadata
            );
            solution.calculateMetrics();
            this.solutions.push(solution);
            this.processedPatterns++;
        }
    }

    /**
     * Generate permutations of parts array
     */
    generatePermutations(arr) {
        if (arr.length <= 1) return [arr];
        if (arr.length > 8) return [arr]; // Don't permute large arrays

        const permutations = [];
        const helper = (curr) => {
            if (curr.length === arr.length) {
                permutations.push([...curr]);
                return;
            }
            for (let i = 0; i < arr.length; i++) {
                if (!curr.includes(arr[i])) {
                    curr.push(arr[i]);
                    helper(curr);
                    curr.pop();
                }
            }
        };
        helper([]);
        return permutations;
    }

    /**
     * Deep copy stocks for branching
     */
    deepCopyStocks(stocks) {
        return stocks.map(s => ({
            ...s,
            placed: s.placed.map(p => ({ ...p })),
            cuts: [...s.cuts]
        }));
    }

    /**
     * Generate simple guillotine cuts for a set of stocks based on placed parts.
     * Produces vertical cuts at distinct x edges and horizontal cuts at distinct y edges.
     * This is a heuristic / visualization aid (not an exact cutter plan).
     */
    generateCutsForStocks(stocks) {
        const kerf = parseFloat(this.settings.kerf_thickness) || 0;
        stocks.forEach((stock, sIdx) => {
            stock.cuts = this.generateCutsForStock(stock, kerf);
        });
    }

    generateCutsForStock(stock, kerf) {
        const cuts = [];
        const placed = stock.placed || [];
        const area = { x: stock.x, y: stock.y, length: stock.usableLength, width: stock.usableWidth };

        // Collect unique candidate cut positions (edges of placed parts)
        const xEdges = new Set();
        const yEdges = new Set();

        placed.forEach(p => {
            // edges relative to area origin
            const rightEdge = p.x + p.length - stock.x; // offset from area.x
            const bottomEdge = p.y + p.width - stock.y; // offset from area.y
            if (rightEdge > 0 && rightEdge < area.length) xEdges.add(Math.round(rightEdge * 100) / 100);
            if (bottomEdge > 0 && bottomEdge < area.width) yEdges.add(Math.round(bottomEdge * 100) / 100);
        });

        // Convert sets to sorted arrays
        const xCuts = Array.from(xEdges).sort((a, b) => a - b);
        const yCuts = Array.from(yEdges).sort((a, b) => a - b);

        let cutNumber = 1;

        // Vertical cuts
        xCuts.forEach(offset => {
            const cut = {
                cut_number: cutNumber++,
                area: { ...area },
                direction: 'V',
                offset: offset, // offset from area.x
                thickness: kerf,
                produced_areas: []
            };

            // Left produced area
            const leftLength = Math.max(0, offset);
            const rightLength = Math.max(0, area.length - offset - kerf);

            if (leftLength > 0) {
                cut.produced_areas.push({ x: area.x, y: area.y, length: leftLength, width: area.width });
            }
            if (rightLength > 0) {
                cut.produced_areas.push({ x: area.x + offset + kerf, y: area.y, length: rightLength, width: area.width });
            }

            cut.cutLength = area.width;
            cut.cut_length = cut.cutLength;

            cuts.push(cut);
        });

        // Horizontal cuts
        yCuts.forEach(offset => {
            const cut = {
                cut_number: cutNumber++,
                area: { ...area },
                direction: 'H',
                offset: offset, // offset from area.y
                thickness: kerf,
                produced_areas: []
            };

            const topHeight = Math.max(0, offset);
            const bottomHeight = Math.max(0, area.width - offset - kerf);

            if (topHeight > 0) {
                cut.produced_areas.push({ x: area.x, y: area.y, length: area.length, width: topHeight });
            }
            if (bottomHeight > 0) {
                cut.produced_areas.push({ x: area.x, y: area.y + offset + kerf, length: area.length, width: bottomHeight });
            }

            cut.cutLength = area.length;
            cut.cut_length = cut.cutLength;

            cuts.push(cut);
        });

        return cuts;
    }

    /**
     * Check if time limit exceeded
     */
    timeExceeded() {
        return (Date.now() - this.startTime) > this.config.timeLimit;
    }

    /**
     * Rank and filter solutions
     */
    rankAndFilterSolutions() {
        // Calculate metrics
        this.solutions.forEach(sol => {
            sol.calculateMetrics();
        });

        // Sort by utilization (descending)
        this.solutions.sort((a, b) => b.utilization - a.utilization);

        // Keep only best solutions
        this.solutions = this.solutions.slice(0, this.config.maxSolutionsKept);
    }

    /**
     * Remove duplicate solutions
     */
    deduplicateSolutions(solutions) {
        const seen = new Set();
        const unique = [];

        for (const sol of solutions) {
            // Create signature from placed parts
            const signature = this.createSolutionSignature(sol);
            if (!seen.has(signature)) {
                seen.add(signature);
                unique.push(sol);
            }
        }

        return unique;
    }

    /**
     * Create unique signature for solution
     */
    createSolutionSignature(solution) {
        const parts = [];
        solution.sheets.forEach(sheet => {
            sheet.placed.forEach(p => {
                parts.push(`${p.part.label}:${p.x},${p.y},${p.rotated}`);
            });
        });
        return parts.sort().join('|');
    }

    /**
     * Return ranked solutions
     */
    rankSolutions() {
        this.rankAndFilterSolutions();
        return this.solutions;
    }

    /**
     * Get statistics about solutions
     */
    getStatistics() {
        if (this.solutions.length === 0) {
            return {
                solutionsFound: 0,
                avgUtilization: 0,
                bestUtilization: 0,
                avgSheetsUsed: 0,
                minSheetsUsed: 0
            };
        }

        const utilizations = this.solutions.map(s => s.utilization);
        const sheetsUsed = this.solutions.map(s => s.sheetsUsed);

        return {
            solutionsFound: this.solutions.length,
            avgUtilization: utilizations.reduce((a, b) => a + b, 0) / utilizations.length,
            bestUtilization: Math.max(...utilizations),
            avgSheetsUsed: sheetsUsed.reduce((a, b) => a + b, 0) / sheetsUsed.length,
            minSheetsUsed: Math.min(...sheetsUsed),
            timeElapsed: (Date.now() - this.startTime) / 1000
        };
    }
}

/**
 * Advanced Solution class with enhanced metrics
 */
class SolutionAdvanced {
    constructor(id, sheets, metadata = {}) {
        this.id = id;
        this.sheets = sheets;
        this.metadata = metadata;
        this.createdAt = new Date();

        this.totalUsedArea = 0;
        this.totalWastedArea = 0;
        this.totalArea = 0;
        this.utilization = 0;
        this.sheetsUsed = sheets.length;
        this.partsPlaced = 0;
        this.totalCuts = 0;
        this.totalCutLength = 0;
        this.wastePercentage = 0;
    }

    /**
     * Calculate solution metrics
     */
    calculateMetrics() {
        this.totalUsedArea = 0;
        this.totalWastedArea = 0;
        this.totalArea = 0;
        this.partsPlaced = 0;
        this.totalCuts = 0;
        this.totalCutLength = 0;

        this.sheets.forEach(sheet => {
            this.totalArea += sheet.totalArea;
            this.totalUsedArea += sheet.usedArea;
            this.totalWastedArea += sheet.wastedArea;
            this.partsPlaced += sheet.placed.length;

            // Calculate cuts data from sheet
            if (sheet.cuts && Array.isArray(sheet.cuts)) {
                this.totalCuts += sheet.cuts.length;
                sheet.cuts.forEach(cut => {
                    if (cut.cutLength) {
                        this.totalCutLength += cut.cutLength;
                    }
                });
            }
        });

        this.utilization = this.totalArea > 0 ? (this.totalUsedArea / this.totalArea) * 100 : 0;
        this.wastePercentage = this.totalArea > 0 ? (this.totalWastedArea / this.totalArea) * 100 : 0;
    }

    /**
     * Get detailed statistics
     */
    getStats() {
        return {
            id: this.id,
            sheetsUsed: this.sheetsUsed,
            partsPlaced: this.partsPlaced,
            utilization: this.utilization.toFixed(2) + '%',
            totalArea: this.totalArea.toFixed(2),
            usedArea: this.totalUsedArea.toFixed(2),
            wastedArea: this.totalWastedArea.toFixed(2),
            efficiency: (this.totalUsedArea / this.partsPlaced).toFixed(2)
        };
    }

    /**
     * Export solution to JSON
     */
    toJSON() {
        return {
            id: this.id,
            sheetsUsed: this.sheetsUsed,
            partsPlaced: this.partsPlaced,
            totalUsedArea: this.totalUsedArea,
            totalWastedArea: this.totalWastedArea,
            totalArea: this.totalArea,
            utilization: this.utilization,
            wastePercentage: this.wastePercentage,
            totalCuts: this.totalCuts,
            totalCutLength: this.totalCutLength,
            createdAt: this.createdAt,
            sheets: this.sheets.map(sheet => ({
                stock: sheet.stock ? {
                    label: sheet.stock.label,
                    length: sheet.stock.length,
                    width: sheet.stock.width
                } : null,
                placed: sheet.placed.map(p => ({
                    part: {
                        label: p.part.label,
                        length: p.part.length,
                        width: p.part.width
                    },
                    x: p.x,
                    y: p.y,
                    length: p.length,
                    width: p.width,
                    rotated: p.rotated,
                    area: p.area
                })),
                cuts: sheet.cuts || [],
                utilization: sheet.utilization,
                usedArea: sheet.usedArea,
                totalArea: sheet.totalArea,
                wastedArea: sheet.wastedArea
            }))
        };
    }

    /**
     * Reconstruct SolutionAdvanced from JSON
     */
    static fromJSON(obj) {
        const sheets = (obj.sheets || []).map(sheetData => ({
            stock: sheetData.stock,
            placed: (sheetData.placed || []).map(p => ({
                part: p.part,
                x: p.x,
                y: p.y,
                length: p.length,
                width: p.width,
                rotated: p.rotated,
                area: p.area
            })),
            cuts: sheetData.cuts || [],
            utilization: sheetData.utilization || 0,
            usedArea: sheetData.usedArea || 0,
            totalArea: sheetData.totalArea || 0,
            wastedArea: sheetData.wastedArea || 0
        }));

        const solution = new SolutionAdvanced(obj.id, sheets, {});
        // Restore calculated metrics if available
        if (obj.totalUsedArea !== undefined) {
            solution.totalUsedArea = obj.totalUsedArea;
            solution.totalWastedArea = obj.totalWastedArea;
            solution.totalArea = obj.totalArea;
            solution.utilization = obj.utilization;
            solution.wastePercentage = obj.wastePercentage;
            solution.totalCuts = obj.totalCuts || 0;
            solution.totalCutLength = obj.totalCutLength || 0;
        } else {
            solution.calculateMetrics();
        }
        return solution;
    }
}

