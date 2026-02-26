/**
 * Canvas Rendering Module
 */

class CanvasRenderer {
    constructor(canvasId = 'drawingCanvas') {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.currentSolution = null; // Store current solution for re-renders
        this.currentSelectedCut = null; // Store selected cut for re-renders

        this.colors = {
            stock: '#e8f4f8',
            stockBorder: '#333',
            part: '#4a90e2',
            partBorder: '#1a4d7f',
            waste: '#ffcccc',
            cut: '#ff0000',
            partLabel: '#ffffff',
            background: '#ffffff',
            grid: '#f0f0f0',
            cutEdge: '#ff6b6b'
        };

        this.minScale = 0.1;
        this.maxScale = 5;
        this.zoomStep = 0.2;

        this.setupEventListeners();
        this.resizeCanvas();
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const oldScale = this.scale;
            this.scale += e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
            this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale));

            // Zoom towards mouse position
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomRatio = this.scale / oldScale;
            this.panX = mouseX - (mouseX - this.panX) * zoomRatio;
            this.panY = mouseY - (mouseY - this.panY) * zoomRatio;

            this.render();
        });

        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.dragStartX = e.clientX - this.panX;
            this.dragStartY = e.clientY - this.panY;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.panX = e.clientX - this.dragStartX;
                this.panY = e.clientY - this.dragStartY;
                this.render();
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.offsetWidth;
        this.canvas.height = container.offsetHeight;
        this.render();
    }

    clear() {
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Transform coordinates from world space to canvas space
    transformX(x) {
        return x * this.scale + this.panX;
    }

    transformY(y) {
        return y * this.scale + this.panY;
    }

    // Transform coordinates from canvas space to world space
    untransformX(x) {
        return (x - this.panX) / this.scale;
    }

    untransformY(y) {
        return (y - this.panY) / this.scale;
    }

    resetView() {
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.render();
    }

    zoomIn() {
        this.scale = Math.min(this.maxScale, this.scale + this.zoomStep);
        this.render();
    }

    zoomOut() {
        this.scale = Math.max(this.minScale, this.scale - this.zoomStep);
        this.render();
    }

    render(solution = null, selectedCut = null) {
        // Use stored solution if none provided (for pan/zoom operations)
        if (!solution) {
            solution = this.currentSolution;
        } else {
            // Store the new solution
            this.currentSolution = solution;
        }

        // Store the selected cut if provided, otherwise use the stored one
        if (!selectedCut) {
            selectedCut = this.currentSelectedCut;
        } else {
            this.currentSelectedCut = selectedCut;
        }

        this.clear();

        if (!solution || solution.sheets.length === 0) {
            this.drawEmptyState();
            return;
        }

        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.scale, this.scale);

        // Calculate bounds
        let minX = 0, minY = 0, maxX = 0, maxY = 0;
        solution.sheets.forEach(sheet => {
            minX = Math.min(minX, 0);
            minY = Math.min(minY, 0);
            maxX = Math.max(maxX, sheet.stock.length);
            maxY = Math.max(maxY, sheet.stock.width);
        });

        // Draw grid
        this.drawGrid(minX, minY, maxX, maxY);

        // Draw sheets
        let currentY = 0;
        solution.sheets.forEach((sheet, index) => {
            this.drawSheet(sheet, 0, currentY, selectedCut, index);
            currentY += sheet.stock.width + 20; // Spacing between sheets
        });

        this.ctx.restore();
    }

    drawEmptyState() {
        const x = this.canvas.width / 2;
        const y = this.canvas.height / 2;

        this.ctx.fillStyle = '#999';
        this.ctx.font = '14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('No solution selected', x, y - 20);
        this.ctx.font = '12px sans-serif';
        this.ctx.fillStyle = '#bbb';
        this.ctx.fillText('Run optimization to generate solutions', x, y + 10);
    }

    drawGrid(minX, minY, maxX, maxY) {
        const spacing = 100;
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;

        // Vertical lines
        for (let x = Math.floor(minX / spacing) * spacing; x <= maxX; x += spacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, minY);
            this.ctx.lineTo(x, maxY);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = Math.floor(minY / spacing) * spacing; y <= maxY; y += spacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(minX, y);
            this.ctx.lineTo(maxX, y);
            this.ctx.stroke();
        }
    }

    drawSheet(sheet, offsetX, offsetY, selectedCut = null, sheetIndex = 0) {
        const { stock, placed_parts, cuts } = sheet;
        const x = offsetX;
        const y = offsetY;

        // Draw stock outline
        this.ctx.fillStyle = this.colors.stock;
        this.ctx.fillRect(x, y, stock.length - 1, stock.width - 1);

        this.ctx.strokeStyle = this.colors.stockBorder;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, stock.length - 1, stock.width - 1);

        // Draw cut edges (restricted areas)
        this.ctx.fillStyle = 'rgba(255, 200, 200, 0.2)';
        if (stock.cut_left_size > 0) {
            this.ctx.fillRect(x, y, stock.cut_left_size, stock.width);
        }
        if (stock.cut_right_size > 0) {
            this.ctx.fillRect(x + stock.length - stock.cut_right_size, y, stock.cut_right_size, stock.width);
        }
        if (stock.cut_top_size > 0) {
            this.ctx.fillRect(x, y, stock.length, stock.cut_top_size);
        }
        if (stock.cut_bottom_size > 0) {
            this.ctx.fillRect(x, y + stock.width - stock.cut_bottom_size, stock.length, stock.cut_bottom_size);
        }

        // Draw placed parts
        placed_parts.forEach((part, index) => {
            this.drawPart(part, x + part.x, y + part.y, index);
        });

        // Draw cuts
        this.drawCuts(cuts, x, y, stock, selectedCut, sheetIndex);

        // Draw sheet label
        this.ctx.fillStyle = '#333';
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText(`${stock.label}`, x + 5, y - 5);
    }

    drawPart(placedPart, x, y, index) {
        const { length, width } = placedPart;

        // Draw part rectangle
        this.ctx.fillStyle = this.colors.part;
        this.ctx.fillRect(x, y, length - 1, width - 1);

        this.ctx.strokeStyle = this.colors.partBorder;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, length - 1, width - 1);

        // Draw label
        const label = placedPart.part.label || `Part ${index + 1}`;
        this.ctx.fillStyle = this.colors.partLabel;
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(label, x + length / 2, y + width / 2);

        // Draw dimensions
        this.ctx.fillStyle = '#666';
        this.ctx.font = '9px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${length.toFixed(1)}×${width.toFixed(1)}`, x + length / 2, y + width / 2 + 12);
    }

    drawCuts(cuts, offsetX, offsetY, stock, selectedCut = null, sheetIndex = 0) {
        cuts.forEach((cut, cutIndex) => {
            const isSelected = selectedCut && selectedCut.sheetIndex === sheetIndex && selectedCut.cutIndex === cutIndex;

            // Use different color and width for selected cuts
            if (isSelected) {
                this.ctx.strokeStyle = this.colors.cut; // Orange/yellow for selected
                this.ctx.fillStyle = this.colors.cut; // Orange/yellow for selected
                this.ctx.lineWidth = 1;
                if (cut.direction === 'H') {
                    // Horizontal cut
                    const x = offsetX + cut.area.x;
                    const y = offsetY + cut.area.y + cut.offset;
                    const length = cut.area.length;
                    const width = cut.thickness;
                    this.ctx.strokeRect(x, y, length - 1, width - 1);
                    this.ctx.fillRect(x, y, length - 1, width - 1);
                } else if (cut.direction === 'V') {
                    // Vertical cut
                    const x = offsetX + cut.area.x + cut.offset;
                    const y = offsetY + cut.area.y;
                    const length = cut.thickness;
                    const width = cut.area.width;
                    this.ctx.strokeRect(x, y, length - 1, width - 1);
                    this.ctx.fillRect(x, y, length - 1, width - 1);
                }
            }
        });
    }

    // Export canvas as image
    downloadImage() {
        const link = document.createElement('a');
        link.href = this.canvas.toDataURL('image/png');
        link.download = `cutting-pattern-${new Date().toISOString().split('T')[0]}.png`;
        link.click();
    }
}

