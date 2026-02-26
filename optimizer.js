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
            const partsToPlace = [];
            this.parts.forEach(part => {
                for (let i = 0; i < part.quantity; i++) {
                    if (part.enabled) {
                        partsToPlace.push(part);
                    }
                }
            });

            // Create stock instances based on quantity
            const availableAreas = [];
            this.stocks.forEach(stock => {
                for (let i = 0; i < stock.quantity; i++) {
                    if (stock.enabled) {
                        availableAreas.push(new Area(
                            0, 0, stock.length, stock.width, stock
                        ));
                    }
                }
            });
            availableAreas.sort((a, b) => a.area - b.area);

            console.log(`Parts to place: ${partsToPlace}`);
            console.log(`Available areas: ${availableAreas}`);

            await this.placeParts(partsToPlace, availableAreas, []);

            this.updateProgress(`Optimization complete: ${this.solutions.length} solutions found`, 100);
            console.log(this.solutions);
        } finally {
            this.isRunning = false;
        }

        return this.solutions;
    }

    async placeParts(remainingParts, availableAreas, cuts) {
        await new Promise(r => setTimeout(r, 0));
        const strategies = ['length-first', 'width-first'];



        if (remainingParts.length === 0 || availableAreas.length === 0) {
            const solution = new Solution(this.solutions.length + 1, cuts);
            this.solutions.push(solution);
            return;
        }


        for (let partIndex = 0; partIndex < remainingParts.length; partIndex++) {
            if (this.isStopped) return;

            const part = remainingParts[partIndex];
            if (this.isStopped) return;
            const restOfParts = remainingParts.slice(0, partIndex).concat(remainingParts.slice(partIndex + 1));

            // orientations
            const orientations = [{ rotated: false, length: part.length, width: part.width }];
            if (part.ignore_direction && (part.length !== part.width)) {
                orientations.push({ rotated: true, length: part.width, width: part.length });
            }

            for (const orientation of orientations) {
                if (this.isStopped) return;

                for (let areaIndex = 0; areaIndex < availableAreas.length; areaIndex++) {
                    if (this.isStopped) return;
                    const area = availableAreas[areaIndex];
                    const remainingAvailableAreas = availableAreas.slice(0, areaIndex).concat(availableAreas.slice(areaIndex + 1));

                    for (const strategy of strategies) {
                        if (this.isStopped) return;

                        // copy of cats for this branch
                        const coppyOfCuts = cuts.slice();

                        const newCuts = this.cutAreaAndPlace(area, part, orientation, strategy);
                        if (!newCuts) continue; // cannot place

                        // reduce to list of areas produced by cuts that are not fully occupied by the placed part
                        const newAreas = [];
                        newCuts.forEach(cut => {
                            cut.produced_areas.forEach(produced_area => {
                                if (!produced_area.placed_part && produced_area.sub_areas.length === 0) {
                                    newAreas.push(produced_area);
                                }
                            });
                            coppyOfCuts.push(cut);
                        });

                        remainingAvailableAreas.forEach(remainingAvailableArea => {
                            newAreas.push(remainingAvailableArea);
                        })


                        await this.placeParts(restOfParts, newAreas, coppyOfCuts);

                    }
                }
            }
        }
    }

    // Cut a stock at origin (0,0) to place the given part using a guillotine (edge-first) strategy.
    // Returns { usedSheet, remainders, cuts } or null if part doesn't fit.
    cutAreaAndPlace(area, part, orientation, strategy) {
        const kerf = parseFloat(this.settings.kerf_thickness) || 0;
        const pLen = orientation.length
        const pWid = orientation.width

        // Check fit considering area usable area (ignore pre-cut margins for simplicity)
        if (pLen > area.length || pWid > area.width) {
            return null;
        }

        const placedPart = new PlacedPart(part, area.x, area.y, orientation.rotated);
        const cuts = [];

        if (strategy === 'length-first') {
            const cut = this.cutHorizontally(area, pWid, kerf, cuts.length + 1);
            cuts.push(cut);
            const topArea = cut.produced_areas[0];
            if (pLen === topArea.length) {
                topArea.placed_part = placedPart;
                return cuts;
            } else {
                const secondCut = this.cutVertically(topArea, pLen, kerf, cuts.length + 1)
                secondCut.produced_areas[0].placed_part = placedPart;
                cuts.push(secondCut);
                return cuts;
            }
        } else {
            const cut = this.cutVertically(area, pLen, kerf, cuts.length + 1)
            cuts.push(cut);
            const leftArea = cut.produced_areas[0];
            if (pWid === leftArea.width) {
                leftArea.placed_part = placedPart;
                return cuts;
            } else {
                const secondCut = this.cutHorizontally(leftArea, pWid, kerf, cuts.length + 1);
                secondCut.produced_areas[0].placed_part = placedPart;
                cuts.push(secondCut);
                return cuts;
            }
        }
        return cuts;
    }


    cutHorizontally(area, pWid, kerf, cutNumber) {
        const topArea = new Area(
            area.x,
            area.y,
            area.length,
            pWid,
            area.stock
        )

        const bottomArea = new Area(
            area.x,
            area.y + pWid + kerf,
            area.length,
            area.width - pWid - kerf,
            area.stock
        )

        const producedAreas = [topArea, bottomArea];

        const cut = new Cut(
            cutNumber,
            area,
            'H',
            pWid,
            kerf,
            null,
            producedAreas);

        topArea.cut = cut;
        bottomArea.cut = cut;
        area.sub_areas = producedAreas;
        return cut;
    }

    cutVertically(area, pLen, kerf, cutNumber) {
        const leftArea = new Area(
            area.x,
            area.y,
            pLen,
            area.width,
            area.stock
        )

        const rightArea = new Area(
            area.x + pLen + kerf,
            area.y,
            area.length - pLen - kerf,
            area.width,
            area.stock
        )
        const producedAreas = [leftArea, rightArea];
        const cut = new Cut(
            cutNumber,
            area,
            'V',
            pLen,
            kerf,
            null,
            producedAreas);

        leftArea.cut = cut;
        rightArea.cut = cut;
        area.sub_areas = producedAreas;
        return cut;
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
