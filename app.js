/**
 * Main Application Logic
 */

class CutOptimizationApp {
    constructor() {
        // Data models
        this.parts = [];
        this.stocks = [];
        this.settings = new Settings();
        this.solutions = []; // Now stores {solution, optimizer} objects
        this.currentSolution = null;
        this.selectedCut = null; // Track selected cut

        // Optimizer selection
        this.useAdvancedOptimizer = false; // Default to original, will be updated from storage

        // UI elements
        this.canvas = new CanvasRenderer('drawingCanvas');
        this.optimizer = null;
        this.isOptimizing = false;
        this.progressModal = null;

        // Initialize
        this.initializeUI();
        this.loadFromStorage();
        this.attachEventListeners();
    }

    initializeUI() {
        // Modal
        this.progressModal = new bootstrap.Modal(document.getElementById('progressModal'));

        // Parts table events
        document.getElementById('uploadPartsBtn').addEventListener('click', () => {
            document.getElementById('partsCSVInput').click();
        });

        document.getElementById('partsCSVInput').addEventListener('change', (e) => {
            this.handlePartsCSVUpload(e);
        });

        document.getElementById('addPartBtn').addEventListener('click', () => {
            this.addPart();
        });

        // Stock table events
        document.getElementById('uploadStockBtn').addEventListener('click', () => {
            document.getElementById('stockCSVInput').click();
        });

        document.getElementById('stockCSVInput').addEventListener('change', (e) => {
            this.handleStockCSVUpload(e);
        });

        document.getElementById('addStockBtn').addEventListener('click', () => {
            this.addStock();
        });

        // Optimization events
        document.getElementById('startOptimizationBtn').addEventListener('click', () => {
            this.startOptimization();
        });

        document.getElementById('stopOptimizationBtn').addEventListener('click', () => {
            this.stopOptimization();
        });

        // Canvas controls
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.canvas.zoomIn();
        });

        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.canvas.zoomOut();
        });

        document.getElementById('panResetBtn').addEventListener('click', () => {
            this.canvas.resetView();
        });

        // Clear Solutions button
        const clearBtn = document.getElementById('clearSolutionsBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSolutions());
        }

        // Sort controls
        document.querySelectorAll('input[name="sortBy"], input[name="sortOrder"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.sortAndRenderSolutions();
            });
        });

        // Initialize sidebar resizing
        this.setupSidebarResize();

        // Render initial tables
        this.renderPartTable();
        this.renderStockTable();
    }

    setupSidebarResize() {
        const leftSidebar = document.querySelector('.left-sidebar');
        const rightSidebar = document.querySelector('.right-sidebar');

        // Create resize handles
        const leftHandle = document.createElement('div');
        leftHandle.className = 'resize-handle';
        leftSidebar.appendChild(leftHandle);

        const rightHandle = document.createElement('div');
        rightHandle.className = 'resize-handle';
        rightSidebar.appendChild(rightHandle);

        // Left sidebar resize
        let isResizingLeft = false;
        let startX = 0;
        let startWidth = 0;

        leftHandle.addEventListener('mousedown', (e) => {
            isResizingLeft = true;
            startX = e.clientX;
            startWidth = leftSidebar.offsetWidth;
        });

        document.addEventListener('mousemove', (e) => {
            if (isResizingLeft) {
                const diff = e.clientX - startX;
                const newWidth = Math.max(180, startWidth + diff);
                leftSidebar.style.width = newWidth + 'px';
                this.canvas.resizeCanvas();
            }
        });

        document.addEventListener('mouseup', () => {
            isResizingLeft = false;
            this.canvas.resizeCanvas();
        });

        // Right sidebar resize
        let isResizingRight = false;
        startX = 0;
        startWidth = 0;

        rightHandle.addEventListener('mousedown', (e) => {
            isResizingRight = true;
            startX = e.clientX;
            startWidth = rightSidebar.offsetWidth;
        });

        document.addEventListener('mousemove', (e) => {
            if (isResizingRight) {
                const diff = startX - e.clientX;
                const newWidth = Math.max(180, startWidth + diff);
                rightSidebar.style.width = newWidth + 'px';
                // Ensure canvas recalculates size/position after sidebar moves
                if (this.canvas && typeof this.canvas.resizeCanvas === 'function') {
                    this.canvas.resizeCanvas();
                }
            }
        });

        document.addEventListener('mouseup', () => {
            isResizingRight = false;
            if (this.canvas && typeof this.canvas.resizeCanvas === 'function') {
                this.canvas.resizeCanvas();
            }
        });
    }

    attachEventListeners() {
        // Settings changes
        document.getElementById('kerfThickness').addEventListener('change', (e) => {
            this.settings.kerf_thickness = parseFloat(e.target.value);
            this.saveToStorage();
        });

        document.getElementById('defaultCutPerimeter').addEventListener('change', (e) => {
            this.settings.default_stock_cut_perimeter = parseFloat(e.target.value);
            this.saveToStorage();
        });

        // Optimizer selection toggle
        const useAdvancedCheckbox = document.getElementById('useAdvancedOptimizer');
        if (useAdvancedCheckbox) {
            useAdvancedCheckbox.addEventListener('change', (e) => {
                this.useAdvancedOptimizer = e.target.checked;
                localStorage.setItem('useAdvancedOptimizer', this.useAdvancedOptimizer);
                this.updateOptimizerLabel();
            });
            // Load saved preference
            const saved = localStorage.getItem('useAdvancedOptimizer');
            if (saved !== null) {
                this.useAdvancedOptimizer = saved === 'true';
                useAdvancedCheckbox.checked = this.useAdvancedOptimizer;
            }
            this.updateOptimizerLabel();
        }
    }

    updateOptimizerLabel() {
        const label = document.getElementById('optimizerLabel');
        if (label) {
            label.textContent = this.useAdvancedOptimizer ? 'Advanced Optimizer' : 'Original Optimizer';
        }
    }

    // CSV Handling
    parseCSV(content) {
        const lines = content.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;

            const values = lines[i].split(',').map(v => v.trim());
            const obj = {};

            headers.forEach((header, index) => {
                let value = values[index] || '';
                // Parse boolean values
                if (value.toLowerCase() === 'true') value = true;
                else if (value.toLowerCase() === 'false') value = false;
                // Parse numeric values
                else if (!isNaN(value) && value !== '') value = parseFloat(value);
                obj[header] = value;
            });

            data.push(obj);
        }

        return data;
    }

    handlePartsCSVUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = this.parseCSV(e.target.result);
                this.parts = data.map(row => new Part(
                    row.label || '',
                    row.length || 0,
                    row.width || 0,
                    row.quantity || 1,
                    row.enabled !== false,
                    row.ignore_direction === true
                ));
                this.renderPartTable();
                this.saveToStorage();
                alert(`Loaded ${this.parts.length} parts from CSV`);
            } catch (error) {
                alert('Error parsing CSV: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    handleStockCSVUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = this.parseCSV(e.target.result);
                this.stocks = data.map(row => new Stock(
                    row.label || '',
                    row.length || 0,
                    row.width || 0,
                    row.quantity || 1,
                    row.enabled !== false,
                    row.ignore_direction === true,
                    row.cut_top_size || 0,
                    row.cut_bottom_size || 0,
                    row.cut_left_size || 0,
                    row.cut_right_size || 0
                ));
                this.renderStockTable();
                this.saveToStorage();
                alert(`Loaded ${this.stocks.length} stocks from CSV`);
            } catch (error) {
                alert('Error parsing CSV: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    // Part management
    addPart(part = new Part('Part ' + (this.parts.length + 1), 100, 50, 1)) {
        this.parts.push(part);
        this.renderPartTable();
        this.saveToStorage();
    }

    removePart(index) {
        this.parts.splice(index, 1);
        this.renderPartTable();
        this.saveToStorage();
    }

    updatePart(index, field, value) {
        if (field === 'length' || field === 'width' || field === 'quantity') {
            this.parts[index][field] = parseFloat(value);
        } else if (field === 'enabled' || field === 'ignore_direction') {
            // Handle both boolean values (from checkbox) and string values (for compatibility)
            this.parts[index][field] = value === true || value === 'on' || value === 'true';
        } else {
            this.parts[index][field] = value;
        }
        this.saveToStorage();
    }

    renderPartTable() {
        const tbody = document.getElementById('partsTableBody');
        tbody.innerHTML = '';

        this.parts.forEach((part, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="text" class="form-control form-control-sm" value="${part.label}" data-field="label" data-index="${index}"></td>
                <td><input type="number" class="form-control form-control-sm" value="${part.length}" step="0.1" data-field="length" data-index="${index}"></td>
                <td><input type="number" class="form-control form-control-sm" value="${part.width}" step="0.1" data-field="width" data-index="${index}"></td>
                <td><input type="number" class="form-control form-control-sm" value="${part.quantity}" min="1" data-field="quantity" data-index="${index}"></td>
                <td><input type="checkbox" class="form-check-input" ${part.enabled ? 'checked' : ''} data-field="enabled" data-index="${index}"></td>
                <td><input type="checkbox" class="form-check-input" ${part.ignore_direction ? 'checked' : ''} data-field="ignore_direction" data-index="${index}"></td>
                <td><button class="btn btn-sm btn-danger" data-index="${index}" onclick="app.removePart(${index})">×</button></td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners
        tbody.querySelectorAll('input[data-field]').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const field = e.target.dataset.field;
                // For checkboxes, use checked property; for other inputs, use value
                const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                this.updatePart(index, field, value);
            });
        });
    }

    // Stock management
    addStock(stock = new Stock('Stock ' + (this.stocks.length + 1), 1000, 500, 1)) {
        this.stocks.push(stock);
        this.renderStockTable();
        this.saveToStorage();
    }

    removeStock(index) {
        this.stocks.splice(index, 1);
        this.renderStockTable();
        this.saveToStorage();
    }

    updateStock(index, field, value) {
        if (['length', 'width', 'quantity', 'cut_top_size', 'cut_bottom_size', 'cut_left_size', 'cut_right_size'].includes(field)) {
            this.stocks[index][field] = parseFloat(value);
        } else if (field === 'enabled' || field === 'ignore_direction') {
            // Handle both boolean values (from checkbox) and string values (for compatibility)
            this.stocks[index][field] = value === true || value === 'on' || value === 'true';
        } else {
            this.stocks[index][field] = value;
        }
        this.saveToStorage();
    }

    renderStockTable() {
        const tbody = document.getElementById('stockTableBody');
        tbody.innerHTML = '';

        this.stocks.forEach((stock, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="text" class="form-control form-control-sm" value="${stock.label}" data-field="label" data-index="${index}"></td>
                <td><input type="number" class="form-control form-control-sm" value="${stock.length}" step="0.1" data-field="length" data-index="${index}"></td>
                <td><input type="number" class="form-control form-control-sm" value="${stock.width}" step="0.1" data-field="width" data-index="${index}"></td>
                <td><input type="number" class="form-control form-control-sm" value="${stock.quantity}" min="1" data-field="quantity" data-index="${index}"></td>
                <td><input type="checkbox" class="form-check-input" ${stock.enabled ? 'checked' : ''} data-field="enabled" data-index="${index}"></td>
                <td><button class="btn btn-sm btn-danger" data-index="${index}" onclick="app.removeStock(${index})">×</button></td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners
        tbody.querySelectorAll('input[data-field]').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const field = e.target.dataset.field;
                // For checkboxes, use checked property; for other inputs, use value
                const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                this.updateStock(index, field, value);
            });
        });
    }

    // Optimization
    async startOptimization() {
        if (this.isOptimizing) return;

        if (this.parts.length === 0 || this.stocks.length === 0) {
            alert('Please add at least one part and one stock sheet');
            return;
        }

        console.log('Before optimization:');
        console.log('All parts in app:', this.parts);
        console.log('All stocks in app:', this.stocks);
        console.log('Using optimizer:', this.useAdvancedOptimizer ? 'Advanced' : 'Original');

        this.isOptimizing = true;
        document.getElementById('startOptimizationBtn').disabled = true;
        document.getElementById('stopOptimizationBtn').disabled = false;

        this.progressModal.show();
        this.updateProgress('Initializing optimization...', 0);

        // Select optimizer based on user preference
        const optimizerType = this.useAdvancedOptimizer ? 'advanced' : 'original';
        if (this.useAdvancedOptimizer && typeof AdvancedCuttingOptimizer !== 'undefined') {
            this.optimizer = new AdvancedCuttingOptimizer(this.parts, this.stocks, this.settings);
        } else {
            this.optimizer = new CuttingOptimizer(this.parts, this.stocks, this.settings);
        }

        this.optimizer.setProgressCallback((progress) => {
            this.updateProgress(progress.message, progress.percentage);
        });

        try {
            const results = await this.optimizer.optimize();
            // Append solutions with optimizer type metadata
            results.forEach(solution => {
                this.solutions.push({
                    solution: solution,
                    optimizer: optimizerType
                });
            });
            this.renderSolutions();
            this.saveToStorage();
        } catch (error) {
            console.error('Optimization error:', error);
            alert('Optimization error: ' + error.message);
        } finally {
            this.isOptimizing = false;
            document.getElementById('startOptimizationBtn').disabled = false;
            document.getElementById('stopOptimizationBtn').disabled = true;
            setTimeout(() => this.progressModal.hide(), 1000);
        }
    }

    stopOptimization() {
        if (this.optimizer) {
            this.optimizer.stop();
        }
    }

    updateProgress(message, percentage) {
        document.getElementById('progressText').textContent = message;
        const progressBar = document.getElementById('progressBar');
        progressBar.style.width = percentage + '%';
        progressBar.textContent = Math.round(percentage) + '%';
    }

    // Solutions Management
    renderSolutions() {
        const container = document.getElementById('solutionsList');

        if (this.solutions.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No solutions found. Try adjusting your parts and stocks.</div>';
            document.getElementById('sortControls').style.display = 'none';
            return;
        }

        document.getElementById('sortControls').style.display = 'block';
        this.sortAndRenderSolutions();
    }

    sortAndRenderSolutions() {
        const container = document.getElementById('solutionsList');
        const sortBy = document.querySelector('input[name="sortBy"]:checked').value;
        const sortOrder = document.querySelector('input[name="sortOrder"]:checked').value;

        let sorted = [...this.solutions];

        if (sortBy === 'waste') {
            sorted.sort((a, b) => {
                const aWaste = (a.solution.wastePercentage !== undefined && a.solution.wastePercentage !== null) ? a.solution.wastePercentage : 0;
                const bWaste = (b.solution.wastePercentage !== undefined && b.solution.wastePercentage !== null) ? b.solution.wastePercentage : 0;
                return aWaste - bWaste;
            });
        } else if (sortBy === 'cuts') {
            sorted.sort((a, b) => {
                const aCuts = (a.solution.totalCuts !== undefined && a.solution.totalCuts !== null) ? a.solution.totalCuts : 0;
                const bCuts = (b.solution.totalCuts !== undefined && b.solution.totalCuts !== null) ? b.solution.totalCuts : 0;
                return aCuts - bCuts;
            });
        } else if (sortBy === 'length') {
            sorted.sort((a, b) => {
                const aLength = (a.solution.totalCutLength !== undefined && a.solution.totalCutLength !== null) ? a.solution.totalCutLength : 0;
                const bLength = (b.solution.totalCutLength !== undefined && b.solution.totalCutLength !== null) ? b.solution.totalCutLength : 0;
                return aLength - bLength;
            });
        }

        if (sortOrder === 'desc') {
            sorted.reverse();
        }

        // ...existing code...

        container.innerHTML = '';
        sorted.forEach((item, index) => {
            const solution = item.solution;
            const optimizerType = item.optimizer;
            const div = document.createElement('div');
            div.className = 'solution-item';
            if (this.currentSolution === solution) {
                div.classList.add('active');
            }

            // Get safe values with defaults
            const wastePercentage = (solution.wastePercentage !== undefined && solution.wastePercentage !== null) ? solution.wastePercentage : 0;
            const sheetsUsed = (solution.sheetsUsed !== undefined && solution.sheetsUsed !== null) ? solution.sheetsUsed : 0;
            const totalCuts = (solution.totalCuts !== undefined && solution.totalCuts !== null) ? solution.totalCuts : 0;
            const totalCutLength = (solution.totalCutLength !== undefined && solution.totalCutLength !== null) ? solution.totalCutLength : 0;

            const optimizerLabel = optimizerType === 'advanced' ? 'Advanced' : 'Original';
            div.innerHTML = `
                <div class="solution-item-title">#${index + 1} <span class="optimizer-badge">${optimizerLabel}</span></div>
                <div class="solution-item-stats">
                    <div><span class="stat-label">Waste:</span> <span class="stat-value">${wastePercentage.toFixed(1)}%</span></div>
                    <div><span class="stat-label">Sheets:</span> <span class="stat-value">${sheetsUsed}</span></div>
                    <div><span class="stat-label">Cuts:</span> <span class="stat-value">${totalCuts}</span></div>
                    <div><span class="stat-label">Cut Len:</span> <span class="stat-value">${totalCutLength.toFixed(1)}</span></div>
                </div>
            `;

            div.addEventListener('click', () => {
                this.selectSolution(solution);
            });

            container.appendChild(div);
        });
    }

    selectSolution(solution) {
        this.currentSolution = solution;
        this.selectedCut = null; // Clear selected cut when switching solutions
        this.renderSolutions();
        this.updateStatistics();
        this.canvas.render(solution);
    }

    updateStatistics() {
        if (!this.currentSolution) {
            document.getElementById('globalStats').innerHTML = '<p class="text-muted">No solution selected</p>';
            document.getElementById('sheetStats').innerHTML = '<p class="text-muted">No solution selected</p>';
            document.getElementById('cutsList').innerHTML = '<p class="text-muted">No solution selected</p>';
            return;
        }

        const solution = this.currentSolution;

        // Global Statistics
        let globalStatsHTML = `
            <div class="stat-row">
                <span class="stat-label">Total Used Area:</span>
                <span class="stat-value">${solution.totalUsedArea.toFixed(2)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Total Wasted Area:</span>
                <span class="stat-value">${solution.totalWastedArea.toFixed(2)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Total Area:</span>
                <span class="stat-value">${solution.totalArea.toFixed(2)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Utilization:</span>
                <span class="stat-value">${solution.utilization.toFixed(1)}%</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Waste:</span>
                <span class="stat-value">${solution.wastePercentage.toFixed(1)}%</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Sheets Used:</span>
                <span class="stat-value">${solution.sheetsUsed}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Parts Placed:</span>
                <span class="stat-value">${solution.partsPlaced}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Total Cuts:</span>
                <span class="stat-value">${solution.totalCuts}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Total Cut Length:</span>
                <span class="stat-value">${solution.totalCutLength.toFixed(2)}</span>
            </div>
        `;
        document.getElementById('globalStats').innerHTML = globalStatsHTML;

        // Per-Sheet Statistics
        let sheetStatsHTML = '';
        solution.sheets.forEach((sheet, index) => {
            // Handle both optimizer formats
            const stockLabel = sheet.stock ? (sheet.stock.label || `Sheet ${index + 1}`) : `Sheet ${index + 1}`;
            const usedArea = sheet.usedArea || 0;
            const wastedArea = sheet.wastedArea || 0;
            const totalArea = sheet.totalArea || 0;
            const utilization = sheet.utilization || 0;

            // Handle parts count - different property names in different optimizers
            const partsCount = (sheet.placed_parts && sheet.placed_parts.length) || (sheet.placed && sheet.placed.length) || 0;

            // Handle cuts - may not exist
            const cutsCount = (sheet.cuts && sheet.cuts.length) || 0;
            const cutLength = sheet.cutLength || 0;

            sheetStatsHTML += `
                <div class="sheet-stats-group">
                    <div class="sheet-title">${stockLabel} (Sheet ${index + 1})</div>
                    <div class="stat-row">
                        <span class="stat-label">Used Area:</span>
                        <span class="stat-value">${usedArea.toFixed(2)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Wasted Area:</span>
                        <span class="stat-value">${wastedArea.toFixed(2)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Utilization:</span>
                        <span class="stat-value">${utilization.toFixed(1)}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Parts Count:</span>
                        <span class="stat-value">${partsCount}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Cuts:</span>
                        <span class="stat-value">${cutsCount}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Cut Length:</span>
                        <span class="stat-value">${cutLength.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });
        document.getElementById('sheetStats').innerHTML = sheetStatsHTML;

        // Cuts List
        let cutsHTML = '';
        solution.sheets.forEach((sheet, sheetIndex) => {
            if (sheet.cuts && Array.isArray(sheet.cuts) && sheet.cuts.length > 0) {
                const stockLabel = sheet.stock ? (sheet.stock.label || `Sheet ${sheetIndex + 1}`) : `Sheet ${sheetIndex + 1}`;
                cutsHTML += `<div class="sheet-title">${stockLabel}</div>`;
                sheet.cuts.forEach((cut, cutIdx) => {
                    const direction = cut.direction === 'H' ? 'Horizontal' : 'Vertical';
                    const cutId = `${sheetIndex}_${cutIdx}`;
                    const isSelected = this.selectedCut &&
                                     this.selectedCut.sheetIndex === sheetIndex &&
                                     this.selectedCut.cutIndex === cutIdx;
                    const activeClass = isSelected ? 'active' : '';
                    const cutLength = (cut.cutLength !== undefined && cut.cutLength !== null) ? cut.cutLength.toFixed(1) : '0.0';
                    cutsHTML += `<div class="cut-item ${activeClass}" data-sheet-index="${sheetIndex}" data-cut-index="${cutIdx}" data-direction="${cut.direction}" data-cut-number="${cut.cut_number}" data-cut-length="${cutLength}">${direction} @ ${cut.cut_number} (${cutLength})</div>`;
                });
            }
        });
        document.getElementById('cutsList').innerHTML = cutsHTML || '<p class="text-muted">No cuts</p>';

        // Add click handlers to cut items
        document.querySelectorAll('.cut-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const sheetIndex = parseInt(e.target.dataset.sheetIndex);
                const cutIndex = parseInt(e.target.dataset.cutIndex);
                this.selectCut(sheetIndex, cutIndex);
            });
        });
    }

    selectCut(sheetIndex, cutIndex) {
        // Toggle selection: if clicking the same cut again, deselect it
        if (this.selectedCut &&
            this.selectedCut.sheetIndex === sheetIndex &&
            this.selectedCut.cutIndex === cutIndex) {
            this.selectedCut.cutIndex = -1;
        } else {
            this.selectedCut = { sheetIndex, cutIndex };
        }
        this.updateStatistics();
        this.canvas.render(this.currentSolution, this.selectedCut);
    }

    // Storage
    saveToStorage() {
        AppStorage.saveParts(this.parts);
        AppStorage.saveStocks(this.stocks);
        AppStorage.saveSettings(this.settings);
        AppStorage.saveSolutions(this.solutions);
    }

    loadFromStorage() {
        this.parts = AppStorage.loadParts();
        this.stocks = AppStorage.loadStocks();
        this.settings = AppStorage.loadSettings();
        this.solutions = AppStorage.loadSolutions();

        // Update UI
        document.getElementById('kerfThickness').value = this.settings.kerf_thickness;
        document.getElementById('defaultCutPerimeter').value = this.settings.default_stock_cut_perimeter;

        this.renderPartTable();
        this.renderStockTable();

        if (this.solutions.length > 0) {
            this.renderSolutions();
        }
    }

    clearSolutions() {
        if (this.isOptimizing) {
            alert('Cannot clear solutions while optimization is running');
            return;
        }

        // Clear in-memory solutions and persisted solutions
        this.solutions = [];
        this.currentSolution = null;
        this.selectedCut = null;
        // Remove stored solutions key
        if (typeof AppStorage !== 'undefined' && typeof AppStorage.removeData === 'function') {
            AppStorage.removeData('cutopt_solutions');
        }

        // Update UI
        this.renderSolutions();
        this.updateStatistics();
        if (this.canvas && typeof this.canvas.render === 'function') {
            this.canvas.render(null);
        }
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new CutOptimizationApp();
});

