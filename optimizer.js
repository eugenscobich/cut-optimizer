/**
 * Optimization Algorithm Module
 * Recursive exhaustive search for all valid cutting patterns (guillotine cuts)
 */

class CuttingOptimizer {
    constructor(parts, stocks, settings) {
        this.parts = parts.filter(p => p.enabled);
        this.stocks = stocks.filter(s => s.enabled);
        this.settings = settings || new Settings();
        this.solutions = [];
        this.isRunning = false;
        this.isStopped = false;
        this.progressCallback = null;
        this.totalCombinations = 0;
        this.processedCombinations = 0;
    }

    setProgressCallback(callback) {
        this.progressCallback = callback;
    }

    updateProgress(message, percentage) {
        if (this.progressCallback) {
            this.progressCallback({ message, percentage });
        }
    }

    calculateTotalCombinations(totalParts) {
        // Calculate theoretical maximum combinations
        // For each part: orientations (1-2) × stocks × strategies (2)
        // This is an estimate since actual combinations depend on successful placements
        let totalStocks = this.stocks.reduce((sum, s) => sum + s.quantity, 0);
        let totalOrientations = this.parts.reduce((sum, p) => {
            let orientCount = 1;
            if (p.enabled && p.ignore_direction && (p.length !== p.width)) {
                orientCount = 2;
            }
            return sum + (orientCount * p.quantity);
        }, 0);

        // Combination estimation: for each of N parts in sequence,
        // we try: partIndex × orientations × stocks × strategies
        // Simplified estimate: average across all parts
        const avgOrientationsPerPart = totalOrientations / Math.max(1, totalParts);
        const avgStocks = Math.max(1, totalStocks);
        const combinationsPerPlacement = avgOrientationsPerPart * avgStocks * 2; // 2 strategies

        // Factorial estimate of part ordering + combinations
        let estimate = totalParts;
        for (let i = totalParts - 1; i > 1; i--) {
            estimate *= i;
        }
        estimate *= combinationsPerPlacement;

        return Math.max(1, Math.floor(estimate));
    }

    async optimize() {
        this.isRunning = true;
        this.isStopped = false;
        this.solutions = [];
        this.processedCombinations = 0;

        try {
            const totalParts = this.parts.reduce((sum, p) => sum + p.quantity, 0);

            // Calculate total combinations
            this.totalCombinations = this.calculateTotalCombinations(totalParts);

            this.updateProgress(`Optimizing: 0/${totalParts} parts placed`, 0);

            // Expand parts by quantity
            const remainingParts = [];
            this.parts.forEach(part => {
                for (let i = 0; i < part.quantity; i++) remainingParts.push(part);
            });

            // Create stock instances based on quantity
            const availableStocks = [];
            // assign unique ids so we can track which remainders come from the same original stock
            let stockIdCounter = 0;
            this.stocks.forEach(stock => {
                for (let i = 0; i < stock.quantity; i++) {
                    // copy stock (do NOT mutate original stock object)
                    const s = new Stock(
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
                    );
                    // attach an internal id to track origin without modifying original list
                    s._id = `stock-${stockIdCounter++}`;
                    availableStocks.push(s);
                }
            });

            await this.placePartsRecursive(remainingParts, availableStocks, [], [], 0, totalParts);

            // Deduplicate and sort
            this.solutions = this.deduplicateSolutions(this.solutions);
            this.solutions.sort((a, b) => a.wastePercentage - b.wastePercentage);

            this.updateProgress(`Optimization complete: ${this.solutions.length} solutions found`, 100);
        } finally {
            this.isRunning = false;
        }

        return this.solutions;
    }

    // Recursive placement according to specified branching rules
    async placePartsRecursive(remainingParts, availableStocks, usedSheets, unusedSheets, placedCount, totalParts) {
        if (this.isStopped) return;

        // Yield to UI
        await new Promise(r => setTimeout(r, 0));

        // If all parts placed -> record solution
        if (remainingParts.length === 0) {
            const solution = new Solution(`Solution-${this.solutions.length + 1}`);
            solution.used_sheets = usedSheets.map(s => s);
            solution.unused_sheets = unusedSheets.map(s => s);
            solution.waste_parts = [];
            this.solutions.push(solution);
            this.processedCombinations++;
            const progressPercentage = Math.min(100, (this.processedCombinations / Math.max(1, this.totalCombinations)) * 100);
            this.updateProgress(`Optimizing: ${this.solutions.length} solutions found`, progressPercentage);
            return;
        }

        // No stocks left -> dead end
        if (availableStocks.length === 0) return;

        // For each part (each execution thread) try placements
        for (let idx = 0; idx < remainingParts.length; idx++) {
            if (this.isStopped) return;

            const part = remainingParts[idx];
            // remaining list without current index
            const rest = remainingParts.slice(0, idx).concat(remainingParts.slice(idx + 1));

            // orientations
            const orientations = [{ rotated: false, length: part.length, width: part.width }];
            if (part.ignore_direction && (part.length !== part.width)) {
                orientations.push({ rotated: true, length: part.width, width: part.length });
            }

            for (const orient of orientations) {
                if (this.isStopped) return;

                for (let sIndex = 0; sIndex < availableStocks.length; sIndex++) {
                    if (this.isStopped) return;

                    const stock = availableStocks[sIndex];

                    const strategies = ['length-first', 'width-first'];
                    for (const strat of strategies) {
                        if (this.isStopped) return;

                        this.processedCombinations++;
                        const progressPercentage = Math.min(100, (this.processedCombinations / Math.max(1, this.totalCombinations)) * 100);
                        this.updateProgress(`Optimizing: ${this.solutions.length} solutions found`, progressPercentage);

                        const attempt = this.cutStockAndPlace(stock, part, orient.rotated, strat);
                        if (!attempt) continue; // cannot place

                        const { usedSheet, remainders, cuts } = attempt;

                        // attach cuts and placed part to usedSheet (already done in helper)
                        if (cuts && cuts.length) usedSheet.cuts = (usedSheet.cuts || []).concat(cuts);

                        // Build new available stocks (replace chosen stock with remainders)
                        const newAvailable = [];
                        for (let i = 0; i < availableStocks.length; i++) {
                            if (i === sIndex) continue; // skip replaced
                            newAvailable.push(availableStocks[i]);
                        }
                        // push remainders at front to prioritize larger pieces
                        newAvailable.unshift(...remainders);

                        // Merge usedSheet into existing usedSheets if it's the same originating stock
                        let newUsedSheets;
                        if (usedSheets && usedSheets.length) {
                            const existingIndex = usedSheets.findIndex(s => s.originalStockId && s.originalStockId === usedSheet.originalStockId);
                            if (existingIndex >= 0) {
                                // merge placed parts & cuts into the existing sheet record
                                const existing = usedSheets[existingIndex];
                                // create a proper UsedSheet instance to preserve methods like toJSON
                                const merged = new UsedSheet(existing.stock, existing.index);
                                merged.placed_parts = (existing.placed_parts || []).concat(usedSheet.placed_parts || []);
                                merged.cuts = (existing.cuts || []).concat(usedSheet.cuts || []);
                                // preserve originalStockId if present
                                if (existing.originalStockId) merged.originalStockId = existing.originalStockId;
                                else if (usedSheet.originalStockId) merged.originalStockId = usedSheet.originalStockId;

                                newUsedSheets = usedSheets.slice(0, existingIndex).concat([merged], usedSheets.slice(existingIndex + 1));
                            } else {
                                newUsedSheets = usedSheets.concat([usedSheet]);
                            }
                        } else {
                            newUsedSheets = usedSheets.concat([usedSheet]);
                        }

                        // Recurse
                        await this.placePartsRecursive(rest, newAvailable, newUsedSheets, unusedSheets, placedCount + 1, totalParts);
                    }
                }
            }

            // According to requirement, each part starts an execution thread; we don't continue trying other parts in the same level after branching here
            break;
        }
    }

    // Cut a stock at origin (0,0) to place the given part using a guillotine (edge-first) strategy.
    // Returns { usedSheet, remainders, cuts } or null if part doesn't fit.
    cutStockAndPlace(stock, part, rotated, strategy) {
        const kerf = parseFloat(this.settings.kerf_thickness) || 0;
        const pLen = rotated ? part.width : part.length;
        const pWid = rotated ? part.length : part.width;

        // Check fit considering stock usable area (ignore pre-cut margins for simplicity)
        if (pLen > stock.length || pWid > stock.width) return null;

        // Create used sheet and placed part
        const usedSheet = new UsedSheet(
            new Stock(stock.label,
                stock.length,
                stock.width,
                1,
                stock.enabled,
                stock.ignore_direction,
                stock.cut_top_size,
                stock.cut_bottom_size,
                stock.cut_left_size,
                stock.cut_right_size
            ),
            0);
        const placed = new PlacedPart(part, 0, 0, rotated);
        usedSheet.placed_parts = [placed];
        usedSheet.cuts = usedSheet.cuts || [];

        // Mark which original available stock this usedSheet belongs to so subsequent cuts on remainders map back
        usedSheet.originalStockId = stock._id;

        const remainders = [];
        const cuts = [];

        if (strategy === 'length-first') {
            // vertical cut right after placed part (x = pLen), account for kerf
            const rightLen = stock.length - pLen - kerf;
            if (rightLen > 0) {
                const r = new Stock(stock.label + '-R', rightLen, stock.width, 1, stock.enabled, stock.ignore_direction, 0, 0, 0, 0);
                // keep origin id so that further cuts of these pieces are attributed to the same used sheet
                r._id = stock._id;
                remainders.push(r);
                cuts.push(new Cut('V', pLen, stock.width, 0));
            }

            // horizontal cut below the placed part (y = pWid) but limited to remaining left area (pLen)
            const bottomWid = stock.width - pWid - kerf;
            if (bottomWid > 0) {
                const r = new Stock(stock.label + '-B', pLen, bottomWid, 1, stock.enabled, stock.ignore_direction, 0, 0, 0, 0);
                r._id = stock._id;
                remainders.push(r);
                cuts.push(new Cut('H', pWid, pLen, 0));
            }
        } else {
            // width-first: horizontal cut below the placed part first
            const bottomWid = stock.width - pWid - kerf;
            if (bottomWid > 0) {
                const r = new Stock(stock.label + '-B', stock.length, bottomWid, 1, stock.enabled, stock.ignore_direction, 0, 0, 0, 0);
                r._id = stock._id;
                remainders.push(r);
                cuts.push(new Cut('H', pWid, stock.length, 0));
            }

            const rightLen = stock.length - pLen - kerf;
            if (rightLen > 0) {
                const r = new Stock(stock.label + '-R', rightLen, pWid, 1, stock.enabled, stock.ignore_direction, 0, 0, 0, 0);
                r._id = stock._id;
                remainders.push(r);
                cuts.push(new Cut('V', pLen, pWid, 0));
            }
        }

        return { usedSheet, remainders, cuts };
    }

    // Remove duplicate solutions by serializing placements and cuts
    deduplicateSolutions(solutions) {
        const seen = new Set();
        const unique = [];

        for (const sol of solutions) {
            // Serialize by used_sheets: for each sheet list placed parts (label,x,y,rotated) and cuts
            const keyObj = sol.used_sheets.map(sheet => ({
                stock: sheet.stock.label,
                placed: sheet.placed_parts.map(pp => ({ label: pp.part.label, x: pp.x, y: pp.y, rotated: pp.rotated })),
                cuts: sheet.cuts.map(c => ({ d: c.direction, p: c.position, l: c.length, o: c.offset }))
            }));

            const key = JSON.stringify(keyObj);
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(sol);
            }
        }

        return unique;
    }
}
