/**
 * Examples and Test Cases for Advanced Cut Optimizer
 * Demonstrates usage patterns and integration points
 */

// ============================================================================
// EXAMPLE 1: Basic Usage
// ============================================================================

async function example1_basicUsage() {
    console.log('=== Example 1: Basic Usage ===');

    // Create sample data
    const parts = [
        new Part('Part A', 100, 50, 3, true, true),
        new Part('Part B', 150, 75, 2, true, true),
        new Part('Part C', 80, 40, 4, true, false)
    ];

    const stocks = [
        new Stock('Stock 1', 500, 300, 2, true, true, 10, 10, 10, 10),
        new Stock('Stock 2', 400, 250, 1, true, true, 5, 5, 5, 5)
    ];

    const settings = new Settings(3, 0); // 3mm kerf, no default margins

    // Create optimizer
    const optimizer = new AdvancedCuttingOptimizer(parts, stocks, settings);

    // Set progress callback
    optimizer.setProgressCallback((progress) => {
        console.log(`${progress.percentage}% - ${progress.message}`);
    });

    // Run optimization
    const solutions = await optimizer.optimize();

    // Display results
    console.log(`Found ${solutions.length} solutions`);
    solutions.forEach(sol => {
        console.log(`Solution #${sol.id}: ${sol.sheetsUsed} sheets, ${sol.utilization.toFixed(2)}% utilization`);
    });

    return solutions;
}

// ============================================================================
// EXAMPLE 2: Advanced Configuration
// ============================================================================

async function example2_advancedConfig() {
    console.log('=== Example 2: Advanced Configuration ===');

    const parts = [
        new Part('Door Panel', 200, 100, 5, true, true),
        new Part('Side Panel', 150, 80, 10, true, false),
        new Part('Back Panel', 120, 120, 3, true, true)
    ];

    const stocks = [
        new Stock('Plywood 4x8', 2400, 1200, 5, true, true, 0, 0, 0, 0)
    ];

    const settings = new Settings(2.5, 0);

    // Create optimizer
    const optimizer = new AdvancedCuttingOptimizer(parts, stocks, settings);

    // Configure for quality over speed
    optimizer.config.timeLimit = 60000; // 60 seconds
    optimizer.config.useFFD = true;
    optimizer.config.useBestFit = true;
    optimizer.config.maxSolutionsKept = 200;
    optimizer.config.sortStrategy = 'area-descending';

    // Use optimal config based on problem size
    const optimalConfig = OptimizerFactory.getOptimalConfig(parts, stocks);
    Object.assign(optimizer.config, optimalConfig);

    // Run optimization
    const solutions = await optimizer.optimize();

    // Get statistics
    const stats = optimizer.getStatistics();
    console.log(`Optimization took ${stats.timeElapsed.toFixed(2)} seconds`);
    console.log(`Average utilization: ${stats.avgUtilization.toFixed(2)}%`);
    console.log(`Best utilization: ${stats.bestUtilization.toFixed(2)}%`);
    console.log(`Minimum sheets used: ${stats.minSheetsUsed}`);

    return solutions;
}

// ============================================================================
// EXAMPLE 3: Using Optimizer Factory
// ============================================================================

async function example3_optimizerFactory() {
    console.log('=== Example 3: Optimizer Factory ===');

    const parts = [
        new Part('Small', 50, 25, 20, true, true),
        new Part('Medium', 100, 50, 15, true, true),
        new Part('Large', 200, 100, 5, true, true)
    ];

    const stocks = [
        new Stock('Standard', 1000, 500, 10, true, true, 0, 0, 0, 0)
    ];

    const settings = new Settings(2, 0);

    // Use factory to auto-select appropriate optimizer
    const optimizer = OptimizerFactory.createOptimizer(parts, stocks, settings);

    // Get optimal configuration
    const config = OptimizerFactory.getOptimalConfig(parts, stocks);
    if (optimizer instanceof AdvancedCuttingOptimizer) {
        Object.assign(optimizer.config, config);
    }

    // Run
    const solutions = await optimizer.optimize();
    console.log(`Used ${optimizer.constructor.name}`);
    console.log(`Found ${solutions.length} solutions`);

    return solutions;
}

// ============================================================================
// EXAMPLE 4: Event-Based Optimization
// ============================================================================

async function example4_eventBased() {
    console.log('=== Example 4: Event-Based Optimization ===');

    const parts = [
        new Part('Panel 1', 200, 100, 8, true, true),
        new Part('Panel 2', 150, 80, 6, true, true),
        new Part('Panel 3', 100, 50, 12, true, true)
    ];

    const stocks = [
        new Stock('Wood 1', 1000, 500, 5, true, true, 0, 0, 0, 0)
    ];

    const settings = new Settings(2, 0);

    // Create wrapper with events
    const optimizer = new OptimizerWithEvents(parts, stocks, settings, true);

    // Register event handlers
    optimizer
        .on('start', (data) => {
            console.log('Optimization started at', data.timestamp);
        })
        .on('progress', (data) => {
            console.log(`Progress: ${data.percentage}% - ${data.message}`);
        })
        .on('complete', (data) => {
            console.log(`Completed at ${data.timestamp}`);
            console.log(`Found ${data.solutions.length} solutions`);
            console.log(`Stats:`, data.stats);
        })
        .on('error', (data) => {
            console.error('Error:', data.error);
        });

    // Run optimization
    const solutions = await optimizer.run();
    return solutions;
}

// ============================================================================
// EXAMPLE 5: Batch Processing
// ============================================================================

async function example5_batchProcessing() {
    console.log('=== Example 5: Batch Processing ===');

    const settings = new Settings(2, 0);
    const batchOptimizer = new BatchOptimizer(settings);

    // Add multiple jobs
    batchOptimizer
        .addJob('job1', [
            new Part('A', 100, 50, 5, true, true),
            new Part('B', 80, 40, 3, true, true)
        ], [
            new Stock('S1', 500, 300, 2, true, true, 0, 0, 0, 0)
        ])
        .addJob('job2', [
            new Part('X', 200, 100, 10, true, true),
            new Part('Y', 150, 75, 8, true, true)
        ], [
            new Stock('S2', 1000, 500, 3, true, true, 0, 0, 0, 0)
        ])
        .addJob('job3', [
            new Part('P', 120, 60, 12, true, true),
            new Part('Q', 100, 50, 15, true, true)
        ], [
            new Stock('S3', 800, 400, 2, true, true, 0, 0, 0, 0)
        ]);

    // Process sequentially with progress
    const results = await batchOptimizer.processSequential((progress) => {
        console.log(`[Job ${progress.job}] ${progress.message} (${progress.percentage}%)`);
    });

    // Show results
    results.forEach(result => {
        console.log(`${result.id}: ${result.status}`);
        if (result.result) {
            console.log(`  Solutions: ${result.result.solutions.length}`);
            console.log(`  Best utilization: ${result.result.stats.bestUtilization.toFixed(2)}%`);
        }
        if (result.error) {
            console.log(`  Error: ${result.error}`);
        }
    });

    return results;
}

// ============================================================================
// EXAMPLE 6: Solution Analysis
// ============================================================================

async function example6_solutionAnalysis() {
    console.log('=== Example 6: Solution Analysis ===');

    const parts = [
        new Part('A', 100, 50, 8, true, true),
        new Part('B', 80, 40, 6, true, true),
        new Part('C', 120, 60, 4, true, true)
    ];

    const stocks = [
        new Stock('S', 500, 300, 3, true, true, 0, 0, 0, 0)
    ];

    const settings = new Settings(2, 0);
    const optimizer = new AdvancedCuttingOptimizer(parts, stocks, settings);
    const solutions = await optimizer.optimize();

    // Analyze solutions
    const analysis = SolutionAnalyzer.analyze(solutions);
    console.log('Analysis:');
    console.log(`  Total solutions: ${analysis.count}`);
    console.log(`  Best by utilization: Solution #${analysis.bestByUtilization.id} (${analysis.bestByUtilization.utilization.toFixed(2)}%)`);
    console.log(`  Best by sheets: Solution #${analysis.bestBySheets.id} (${analysis.bestBySheets.sheetsUsed} sheets)`);
    console.log(`  Average utilization: ${analysis.avgUtilization.toFixed(2)}%`);
    console.log(`  Average sheets: ${analysis.avgSheetsUsed.toFixed(2)}`);

    // Get top 3 solutions
    const top3 = SolutionAnalyzer.getTop(solutions, 'utilization', 3);
    console.log('\nTop 3 Solutions by Utilization:');
    top3.forEach(s => {
        console.log(`  #${s.id}: ${s.utilization.toFixed(2)}% utilization`);
    });

    return solutions;
}

// ============================================================================
// EXAMPLE 7: Solution Export
// ============================================================================

async function example7_solutionExport() {
    console.log('=== Example 7: Solution Export ===');

    const parts = [
        new Part('Panel', 200, 100, 5, true, true)
    ];

    const stocks = [
        new Stock('Wood', 1000, 500, 2, true, true, 0, 0, 0, 0)
    ];

    const settings = new Settings(2, 0);
    const optimizer = new AdvancedCuttingOptimizer(parts, stocks, settings);
    const solutions = await optimizer.optimize();

    if (solutions.length > 0) {
        const bestSolution = solutions[0];

        // Export to JSON
        console.log('JSON Export:');
        const json = SolutionExporter.toJSON([bestSolution]);
        console.log(json.substring(0, 200) + '...');

        // Export to CSV
        console.log('\nCSV Export:');
        const csv = SolutionExporter.toCSV(solutions);
        console.log(csv);

        // Export to HTML
        console.log('\nHTML Export (first 200 chars):');
        const html = SolutionExporter.toHTML(bestSolution);
        console.log(html.substring(0, 200) + '...');
    }

    return solutions;
}

// ============================================================================
// EXAMPLE 8: Real-World Use Case - Furniture Manufacturing
// ============================================================================

async function example8_furnitureManufacturing() {
    console.log('=== Example 8: Real-World - Furniture Manufacturing ===');

    // Define furniture parts
    const parts = [
        new Part('Door Panel', 800, 400, 8, true, true),  // Cabinet doors
        new Part('Side Panel', 600, 400, 16, true, false), // Cabinet sides
        new Part('Shelf', 750, 350, 24, true, false),      // Shelves
        new Part('Back Panel', 800, 600, 4, true, true),   // Cabinet back
        new Part('Bottom', 750, 350, 8, true, false),      // Cabinet bottoms
    ];

    // Define available materials
    const stocks = [
        new Stock('Plywood 4x8', 2440, 1220, 12, true, true, 20, 20, 20, 20), // MDF board 4x8 with 20mm margins
        new Stock('Plywood 2x4', 1220, 610, 8, true, true, 10, 10, 10, 10),   // Smaller boards
    ];

    const settings = new Settings(4, 0); // 4mm kerf for saw blade

    // Create and configure optimizer
    const optimizer = new AdvancedCuttingOptimizer(parts, stocks, settings);
    const optimalConfig = OptimizerFactory.getOptimalConfig(parts, stocks);
    Object.assign(optimizer.config, optimalConfig);

    // Track progress
    let lastMessage = '';
    optimizer.setProgressCallback((progress) => {
        if (progress.message !== lastMessage) {
            console.log(`[${progress.percentage}%] ${progress.message}`);
            lastMessage = progress.message;
        }
    });

    // Run optimization
    console.time('Optimization Duration');
    const solutions = await optimizer.optimize();
    console.timeEnd('Optimization Duration');

    // Analyze results
    if (solutions.length > 0) {
        const bestSolution = solutions[0];
        console.log('\n=== BEST SOLUTION ===');
        console.log(`Sheets used: ${bestSolution.sheetsUsed}`);
        console.log(`Parts placed: ${bestSolution.partsPlaced}`);
        console.log(`Utilization: ${bestSolution.utilization.toFixed(2)}%`);
        console.log(`Wasted area: ${bestSolution.totalWastedArea.toFixed(2)} sq mm`);

        console.log('\nDetailed breakdown by sheet:');
        bestSolution.sheets.forEach((sheet, idx) => {
            console.log(`Sheet ${idx + 1} (${sheet.stock.label}):`);
            console.log(`  Utilization: ${sheet.utilization.toFixed(2)}%`);
            console.log(`  Parts: ${sheet.placed.length}`);
            sheet.placed.forEach(p => {
                const orient = p.rotated ? ' (rotated)' : '';
                console.log(`    - ${p.part.label} at (${p.x.toFixed(1)}, ${p.y.toFixed(1)})${orient}`);
            });
        });

        // Compare top solutions
        if (solutions.length > 1) {
            const comparison = SolutionAnalyzer.compare(solutions[1], bestSolution);
            console.log('\nComparison with 2nd best:');
            console.log(`  Utilization improvement: ${comparison.utilizationPercent}`);
            console.log(`  Sheets saved: ${-comparison.sheetsDiff}`);
        }
    }

    return solutions;
}

// ============================================================================
// EXAMPLE 9: Comparison - Old vs New Optimizer
// ============================================================================

async function example9_performanceComparison() {
    console.log('=== Example 9: Performance Comparison ===');

    // Medium-sized problem
    const parts = [
        new Part('A', 150, 100, 5, true, true),
        new Part('B', 120, 80, 8, true, true),
        new Part('C', 100, 50, 10, true, true),
        new Part('D', 80, 40, 12, true, true),
    ];

    const stocks = [
        new Stock('S1', 1000, 600, 3, true, true, 0, 0, 0, 0)
    ];

    const settings = new Settings(2, 0);

    // Test Advanced Optimizer
    console.log('Testing Advanced Optimizer...');
    console.time('Advanced Optimizer');
    const optimizerAdv = new AdvancedCuttingOptimizer(parts, stocks, settings);
    const solutionsAdv = await optimizerAdv.optimize();
    console.timeEnd('Advanced Optimizer');
    const statsAdv = optimizerAdv.getStatistics();

    console.log(`Solutions found: ${solutionsAdv.length}`);
    if (solutionsAdv.length > 0) {
        console.log(`Best utilization: ${statsAdv.bestUtilization.toFixed(2)}%`);
    }

    // Test Original Optimizer
    console.log('\nTesting Original Optimizer...');
    console.time('Original Optimizer');
    const optimizerOld = new CuttingOptimizer(parts, stocks, settings);
    const solutionsOld = await optimizerOld.optimize();
    console.timeEnd('Original Optimizer');

    console.log(`Solutions found: ${solutionsOld.length}`);

    console.log('\n=== COMPARISON ===');
    console.log('Metric\t\t\tAdvanced\tOriginal');
    console.log('---\t\t\t---\t\t---');
    if (solutionsAdv.length > 0) {
        const utilAdv = statsAdv.bestUtilization.toFixed(2);
        console.log(`Best Utilization\t${utilAdv}%\t\t${solutionsOld.length > 0 ? 'TBD' : 'N/A'}`);
    }
    console.log(`Solutions Found\t\t${solutionsAdv.length}\t\t${solutionsOld.length}`);
}

// ============================================================================
// EXAMPLE 10: Interactive / UI Integration
// ============================================================================

class OptimizationUI {
    constructor(elementId) {
        this.container = document.getElementById(elementId);
        this.optimizer = null;
    }

    async runOptimization(parts, stocks, settings) {
        const optimizer = new OptimizerWithEvents(parts, stocks, settings, true);

        // Update UI on progress
        optimizer.on('progress', (data) => {
            this.updateProgressBar(data.percentage);
            this.updateMessage(data.message);
        });

        optimizer.on('complete', (data) => {
            this.displaySolutions(data.solutions);
            this.displayStats(data.stats);
        });

        optimizer.on('error', (data) => {
            this.displayError(data.error);
        });

        return await optimizer.run();
    }

    updateProgressBar(percentage) {
        // Implementation for UI
        console.log(`Progress: ${percentage}%`);
    }

    updateMessage(message) {
        // Implementation for UI
        console.log(`Message: ${message}`);
    }

    displaySolutions(solutions) {
        // Implementation for UI
        console.log(`Displaying ${solutions.length} solutions`);
    }

    displayStats(stats) {
        // Implementation for UI
        console.log('Stats:', stats);
    }

    displayError(error) {
        // Implementation for UI
        console.error('Error:', error);
    }
}

// ============================================================================
// EXAMPLE 11: Configuration Presets
// ============================================================================

const OptimizationPresets = {
    FAST: {
        timeLimit: 5000,
        useFFD: true,
        useBestFit: false,
        useGuillotine: true,
        deduplicateSolutions: true,
        maxSolutionsKept: 10,
        description: 'Fast approximation - seconds'
    },

    BALANCED: {
        timeLimit: 30000,
        useFFD: true,
        useBestFit: true,
        useGuillotine: true,
        deduplicateSolutions: true,
        maxSolutionsKept: 50,
        description: 'Balanced speed/quality - recommended'
    },

    QUALITY: {
        timeLimit: 60000,
        useFFD: true,
        useBestFit: true,
        useGuillotine: true,
        deduplicateSolutions: true,
        maxSolutionsKept: 200,
        description: 'High quality - may take longer'
    },

    EXHAUSTIVE: {
        timeLimit: 120000,
        useFFD: true,
        useBestFit: true,
        useGuillotine: true,
        deduplicateSolutions: true,
        maxSolutionsKept: 500,
        description: 'Exhaustive - best solutions (for small problems)'
    }
};

async function example11_usePreset() {
    const parts = [
        new Part('A', 100, 50, 5, true, true)
    ];
    const stocks = [
        new Stock('S', 500, 300, 2, true, true, 0, 0, 0, 0)
    ];
    const settings = new Settings(2, 0);

    const optimizer = new AdvancedCuttingOptimizer(parts, stocks, settings);
    Object.assign(optimizer.config, OptimizationPresets.BALANCED);

    console.log('Using preset:', OptimizationPresets.BALANCED.description);
    const solutions = await optimizer.optimize();
    console.log('Found', solutions.length, 'solutions');
}

// ============================================================================
// Run Examples
// ============================================================================

async function runAllExamples() {
    try {
        await example1_basicUsage();
        console.log('\n---\n');

        await example2_advancedConfig();
        console.log('\n---\n');

        await example3_optimizerFactory();
        console.log('\n---\n');

        await example4_eventBased();
        console.log('\n---\n');

        await example5_batchProcessing();
        console.log('\n---\n');

        await example6_solutionAnalysis();
        console.log('\n---\n');

        await example7_solutionExport();
        console.log('\n---\n');

        await example8_furnitureManufacturing();
        console.log('\n---\n');

        await example9_performanceComparison();
        console.log('\n---\n');

        await example11_usePreset();

    } catch (error) {
        console.error('Error running examples:', error);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        OptimizationPresets,
        runAllExamples
    };
}

