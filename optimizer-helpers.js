/**
 * Integration Helper for Advanced Cut Optimizer
 * Provides utility functions and adapters for backward compatibility
 */

class OptimizerFactory {
    /**
     * Create appropriate optimizer based on problem size
     */
    static createOptimizer(parts, stocks, settings, forceAdvanced = false) {
        const totalParts = parts.reduce((sum, p) => sum + p.quantity, 0);

        // For small problems, use exhaustive (original)
        // For large problems, use advanced
        if (!forceAdvanced && totalParts <= 10) {
            console.log('Using exhaustive optimizer for small problem');
            return new CuttingOptimizer(parts, stocks, settings);
        } else {
            console.log('Using advanced optimizer for large problem');
            return new AdvancedCuttingOptimizer(parts, stocks, settings);
        }
    }

    /**
     * Create optimized configuration for given problem size
     */
    static getOptimalConfig(parts, stocks) {
        const totalParts = parts.reduce((sum, p) => sum + p.quantity, 0);
        const totalStocks = stocks.reduce((sum, s) => sum + s.quantity, 0);

        if (totalParts <= 5) {
            return {
                timeLimit: 5000,
                useFFD: true,
                useBestFit: false,
                useGuillotine: true,
                deduplicateSolutions: true,
                maxSolutionsKept: 20
            };
        } else if (totalParts <= 15) {
            return {
                timeLimit: 15000,
                useFFD: true,
                useBestFit: true,
                useGuillotine: true,
                deduplicateSolutions: true,
                maxSolutionsKept: 50
            };
        } else if (totalParts <= 30) {
            return {
                timeLimit: 30000,
                useFFD: true,
                useBestFit: true,
                useGuillotine: true,
                deduplicateSolutions: true,
                maxSolutionsKept: 100
            };
        } else {
            return {
                timeLimit: 30000,
                useFFD: true,
                useBestFit: false, // Skip best fit for very large problems
                useGuillotine: true,
                deduplicateSolutions: true,
                maxSolutionsKept: 50
            };
        }
    }
}

/**
 * Optimizer Wrapper with enhanced event handling
 */
class OptimizerWithEvents {
    constructor(parts, stocks, settings, useAdvanced = true) {
        this.parts = parts;
        this.stocks = stocks;
        this.settings = settings;
        this.optimizer = useAdvanced ?
            new AdvancedCuttingOptimizer(parts, stocks, settings) :
            new CuttingOptimizer(parts, stocks, settings);

        this.events = {};
        this.setupDefaultProgressCallback();
    }

    /**
     * Setup progress callback
     */
    setupDefaultProgressCallback() {
        this.optimizer.setProgressCallback((progress) => {
            this.emit('progress', progress);
        });
    }

    /**
     * Register event listener
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        return this;
    }

    /**
     * Emit event
     */
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }

    /**
     * Run optimization
     */
    async run() {
        try {
            this.emit('start', { timestamp: new Date() });
            const solutions = await this.optimizer.optimize();
            this.emit('complete', {
                timestamp: new Date(),
                solutions: solutions,
                stats: this.optimizer.getStatistics()
            });
            return solutions;
        } catch (error) {
            this.emit('error', { error: error });
            throw error;
        }
    }

    /**
     * Stop optimization
     */
    stop() {
        this.optimizer.stop();
        this.emit('stopped', { timestamp: new Date() });
    }

    /**
     * Get optimizer statistics
     */
    getStats() {
        return this.optimizer.getStatistics();
    }

    /**
     * Get solutions
     */
    getSolutions() {
        return this.optimizer.solutions;
    }
}

/**
 * Batch Optimizer for processing multiple optimization jobs
 */
class BatchOptimizer {
    constructor(settings) {
        this.settings = settings;
        this.jobs = [];
        this.results = [];
    }

    /**
     * Add optimization job
     */
    addJob(id, parts, stocks) {
        this.jobs.push({
            id: id,
            parts: parts,
            stocks: stocks,
            status: 'pending',
            result: null,
            error: null
        });
        return this;
    }

    /**
     * Process all jobs sequentially
     */
    async processSequential(progressCallback = null) {
        for (let i = 0; i < this.jobs.length; i++) {
            const job = this.jobs[i];

            try {
                job.status = 'running';

                const config = OptimizerFactory.getOptimalConfig(job.parts, job.stocks);
                const optimizer = new AdvancedCuttingOptimizer(job.parts, job.stocks, this.settings);

                Object.assign(optimizer.config, config);

                optimizer.setProgressCallback((progress) => {
                    if (progressCallback) {
                        progressCallback({
                            job: job.id,
                            jobIndex: i + 1,
                            totalJobs: this.jobs.length,
                            ...progress
                        });
                    }
                });

                const solutions = await optimizer.optimize();

                job.status = 'complete';
                job.result = {
                    solutions: solutions,
                    stats: optimizer.getStatistics()
                };

            } catch (error) {
                job.status = 'error';
                job.error = error.message;
            }
        }

        return this.getResults();
    }

    /**
     * Get all results
     */
    getResults() {
        return this.jobs.map(job => ({
            id: job.id,
            status: job.status,
            result: job.result,
            error: job.error
        }));
    }
}

/**
 * Solution Analyzer for comparing and selecting best solutions
 */
class SolutionAnalyzer {
    /**
     * Analyze solutions
     */
    static analyze(solutions) {
        if (!solutions || solutions.length === 0) {
            return {
                count: 0,
                empty: true
            };
        }

        const stats = solutions.map(s => ({
            id: s.id,
            sheetsUsed: s.sheetsUsed,
            partsPlaced: s.partsPlaced,
            utilization: s.utilization,
            usedArea: s.totalUsedArea,
            wastedArea: s.totalWastedArea
        }));

        const utilizations = stats.map(s => s.utilization);
        const sheetsUsed = stats.map(s => s.sheetsUsed);

        return {
            count: solutions.length,
            bestByUtilization: stats.reduce((best, s) =>
                s.utilization > best.utilization ? s : best
            ),
            bestBySheets: stats.reduce((best, s) =>
                s.sheetsUsed < best.sheetsUsed ? s : best
            ),
            avgUtilization: utilizations.reduce((a, b) => a + b, 0) / utilizations.length,
            minUtilization: Math.min(...utilizations),
            maxUtilization: Math.max(...utilizations),
            avgSheetsUsed: sheetsUsed.reduce((a, b) => a + b, 0) / sheetsUsed.length,
            minSheetsUsed: Math.min(...sheetsUsed),
            maxSheetsUsed: Math.max(...sheetsUsed),
            allStats: stats
        };
    }

    /**
     * Compare two solutions
     */
    static compare(solution1, solution2) {
        const improvement = solution2.utilization - solution1.utilization;
        const sheetDiff = solution2.sheetsUsed - solution1.sheetsUsed;

        return {
            solution1Id: solution1.id,
            solution2Id: solution2.id,
            utilizationDiff: improvement,
            utilizationPercent: improvement.toFixed(2) + '%',
            sheetsDiff: sheetDiff,
            isBetter: improvement > 0 || (improvement === 0 && sheetDiff < 0)
        };
    }

    /**
     * Filter solutions by criteria
     */
    static filter(solutions, criteria) {
        return solutions.filter(s => {
            if (criteria.minUtilization && s.utilization < criteria.minUtilization) {
                return false;
            }
            if (criteria.maxSheets && s.sheetsUsed > criteria.maxSheets) {
                return false;
            }
            if (criteria.minParts && s.partsPlaced < criteria.minParts) {
                return false;
            }
            return true;
        });
    }

    /**
     * Get top N solutions by metric
     */
    static getTop(solutions, metric = 'utilization', count = 5) {
        const sorted = [...solutions].sort((a, b) => {
            if (metric === 'utilization') {
                return b.utilization - a.utilization;
            } else if (metric === 'sheets') {
                return a.sheetsUsed - b.sheetsUsed;
            } else if (metric === 'parts') {
                return b.partsPlaced - a.partsPlaced;
            }
            return 0;
        });
        return sorted.slice(0, count);
    }
}

/**
 * Export helper for solutions
 */
class SolutionExporter {
    /**
     * Export solutions to JSON
     */
    static toJSON(solutions) {
        return JSON.stringify(
            solutions.map(s => s.toJSON ? s.toJSON() : s),
            null,
            2
        );
    }

    /**
     * Export solutions to CSV (for spreadsheet)
     */
    static toCSV(solutions) {
        const rows = [
            'Solution ID,Sheets Used,Parts Placed,Utilization (%),Used Area,Wasted Area'
        ];

        solutions.forEach(s => {
            rows.push(
                `${s.id},${s.sheetsUsed},${s.partsPlaced},${s.utilization.toFixed(2)},${s.totalUsedArea.toFixed(2)},${s.totalWastedArea.toFixed(2)}`
            );
        });

        return rows.join('\n');
    }

    /**
     * Export solution details to HTML
     */
    static toHTML(solution) {
        let html = `
        <div class="solution-report">
            <h2>Solution #${solution.id}</h2>
            <div class="metrics">
                <p><strong>Sheets Used:</strong> ${solution.sheetsUsed}</p>
                <p><strong>Parts Placed:</strong> ${solution.partsPlaced}</p>
                <p><strong>Utilization:</strong> ${solution.utilization.toFixed(2)}%</p>
                <p><strong>Used Area:</strong> ${solution.totalUsedArea.toFixed(2)}</p>
                <p><strong>Wasted Area:</strong> ${solution.totalWastedArea.toFixed(2)}</p>
            </div>
            <div class="sheets">
        `;

        solution.sheets.forEach((sheet, idx) => {
            html += `
            <div class="sheet">
                <h3>Sheet ${idx + 1} - ${sheet.stock.label}</h3>
                <p>Utilization: ${sheet.utilization.toFixed(2)}%</p>
                <table>
                    <thead>
                        <tr><th>Part</th><th>X</th><th>Y</th><th>Rotated</th></tr>
                    </thead>
                    <tbody>
            `;

            sheet.placed.forEach(p => {
                html += `
                <tr>
                    <td>${p.part.label}</td>
                    <td>${p.x.toFixed(1)}</td>
                    <td>${p.y.toFixed(1)}</td>
                    <td>${p.rotated ? 'Yes' : 'No'}</td>
                </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            </div>
            `;
        });

        html += `
            </div>
        </div>
        `;

        return html;
    }
}

