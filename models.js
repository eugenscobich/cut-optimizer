/**
 * Data Models for Panel Cutting Optimizer
 */

class Part {
    constructor(label = '', length = 0, width = 0, quantity = 1, enabled = true, ignore_direction = false) {
        this.label = label;
        this.length = parseFloat(length);
        this.width = parseFloat(width);
        this.quantity = parseInt(quantity);
        this.enabled = enabled;
        this.ignore_direction = ignore_direction;
    }

    get area() {
        return this.length * this.width;
    }

    toJSON() {
        return {
            label: this.label,
            length: this.length,
            width: this.width,
            quantity: this.quantity,
            enabled: this.enabled,
            ignore_direction: this.ignore_direction
        };
    }

    static fromJSON(obj) {
        return new Part(obj.label, obj.length, obj.width, obj.quantity, obj.enabled, obj.ignore_direction);
    }
}

class Stock {
    constructor(
        label = '',
        length = 0,
        width = 0,
        quantity = 1,
        enabled = true,
        ignore_direction = false,
        cut_top_size = 0,
        cut_bottom_size = 0,
        cut_left_size = 0,
        cut_right_size = 0
    ) {
        this.label = label;
        this.length = parseFloat(length);
        this.width = parseFloat(width);
        this.quantity = parseInt(quantity);
        this.enabled = enabled;
        this.ignore_direction = ignore_direction;
        this.cut_top_size = parseFloat(cut_top_size);
        this.cut_bottom_size = parseFloat(cut_bottom_size);
        this.cut_left_size = parseFloat(cut_left_size);
        this.cut_right_size = parseFloat(cut_right_size);
    }

    get area() {
        return this.length * this.width;
    }

    get usableArea() {
        const length = this.length - this.cut_left_size - this.cut_right_size;
        const width = this.width - this.cut_top_size - this.cut_bottom_size;
        return Math.max(0, length) * Math.max(0, width);
    }

    toJSON() {
        return {
            label: this.label,
            length: this.length,
            width: this.width,
            quantity: this.quantity,
            enabled: this.enabled,
            ignore_direction: this.ignore_direction,
            cut_top_size: this.cut_top_size,
            cut_bottom_size: this.cut_bottom_size,
            cut_left_size: this.cut_left_size,
            cut_right_size: this.cut_right_size
        };
    }

    static fromJSON(obj) {
        return new Stock(
            obj.label,
            obj.length,
            obj.width,
            obj.quantity,
            obj.enabled,
            obj.ignore_direction,
            obj.cut_top_size,
            obj.cut_bottom_size,
            obj.cut_left_size,
            obj.cut_right_size
        );
    }
}

class Settings {
    constructor(kerf_thickness = 0, default_stock_cut_perimeter = 0) {
        this.kerf_thickness = parseFloat(kerf_thickness);
        this.default_stock_cut_perimeter = parseFloat(default_stock_cut_perimeter);
    }

    toJSON() {
        return {
            kerf_thickness: this.kerf_thickness,
            default_stock_cut_perimeter: this.default_stock_cut_perimeter
        };
    }

    static fromJSON(obj) {
        return new Settings(obj.kerf_thickness, obj.default_stock_cut_perimeter);
    }
}

class PlacedPart {
    constructor(part, x = 0, y = 0, rotated = false) {
        this.part = part;
        this.x = x;
        this.y = y;
        this.rotated = rotated;
    }

    get length() {
        return this.rotated ? this.part.width : this.part.length;
    }

    get width() {
        return this.rotated ? this.part.length : this.part.width;
    }

    get area() {
        return this.length * this.width;
    }
}

class Cut {
    constructor(direction = 'H', position = 0, length = 0, offset = 0) {
        this.direction = direction; // 'H' for horizontal, 'V' for vertical
        this.position = position;
        this.length = length;
        this.offset = offset;
    }

    toJSON() {
        return {
            direction: this.direction,
            position: this.position,
            length: this.length,
            offset: this.offset
        };
    }
}

class UsedSheet {
    constructor(stock, index = 0) {
        this.stock = stock;
        this.index = index;
        this.placed_parts = []; // Array of PlacedPart
        this.cuts = []; // Array of Cut
    }

    get usedArea() {
        return this.placed_parts.reduce((sum, pp) => sum + pp.area, 0);
    }

    get wastedArea() {
        return this.stock.usableArea - this.usedArea;
    }

    get wastePercentage() {
        const total = this.stock.usableArea;
        return total > 0 ? (this.wastedArea / total) * 100 : 0;
    }

    get utilization() {
        const total = this.stock.usableArea;
        return total > 0 ? (this.usedArea / total) * 100 : 0;
    }

    get cutLength() {
        return this.cuts.reduce((sum, cut) => sum + cut.length, 0);
    }

    toJSON() {
        return {
            stock: this.stock.toJSON(),
            index: this.index,
            placed_parts: this.placed_parts.map(pp => ({
                part: pp.part.toJSON(),
                x: pp.x,
                y: pp.y,
                rotated: pp.rotated
            })),
            cuts: this.cuts.map(c => c.toJSON())
        };
    }
}

class Solution {
    constructor(id = '') {
        this.id = id;
        this.used_sheets = []; // Array of UsedSheet
        this.unused_sheets = []; // Array of unused Stock
        this.waste_parts = []; // Array of Part that couldn't be placed
        this.timestamp = new Date();
    }

    get totalUsedArea() {
        return this.used_sheets.reduce((sum, sheet) => sum + sheet.usedArea, 0);
    }

    get totalWastedArea() {
        return this.used_sheets.reduce((sum, sheet) => sum + sheet.wastedArea, 0);
    }

    get totalArea() {
        return this.used_sheets.reduce((sum, sheet) => sum + sheet.stock.usableArea, 0);
    }

    get totalCuts() {
        return this.used_sheets.reduce((sum, sheet) => sum + sheet.cuts.length, 0);
    }

    get totalCutLength() {
        return this.used_sheets.reduce((sum, sheet) => sum + sheet.cutLength, 0);
    }

    get sheetsUsed() {
        return this.used_sheets.length;
    }

    get partsPlaced() {
        return this.used_sheets.reduce((sum, sheet) => sum + sheet.placed_parts.length, 0);
    }

    get wastePercentage() {
        const total = this.totalArea;
        return total > 0 ? (this.totalWastedArea / total) * 100 : 0;
    }

    get utilization() {
        const total = this.totalArea;
        return total > 0 ? (this.totalUsedArea / total) * 100 : 0;
    }

    toJSON() {
        return {
            id: this.id,
            timestamp: this.timestamp.toISOString(),
            used_sheets: this.used_sheets.map(s => s.toJSON()),
            unused_sheets: this.unused_sheets.map(s => s.toJSON()),
            waste_parts: this.waste_parts.map(p => p.toJSON())
        };
    }

    static fromJSON(obj) {
        const solution = new Solution(obj.id);
        solution.timestamp = new Date(obj.timestamp);
        solution.used_sheets = obj.used_sheets.map(sheet => {
            const stock = Stock.fromJSON(sheet.stock);
            const usedSheet = new UsedSheet(stock, sheet.index);
            usedSheet.placed_parts = sheet.placed_parts.map(pp => {
                const part = Part.fromJSON(pp.part);
                return new PlacedPart(part, pp.x, pp.y, pp.rotated);
            });
            usedSheet.cuts = sheet.cuts.map(c => new Cut(c.direction, c.position, c.length, c.offset));
            return usedSheet;
        });
        solution.unused_sheets = obj.unused_sheets.map(s => Stock.fromJSON(s));
        solution.waste_parts = obj.waste_parts.map(p => Part.fromJSON(p));
        return solution;
    }
}

// Local Storage Helper
class AppStorage {
    static saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn('LocalStorage save failed:', e);
        }
    }

    static loadData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.warn('LocalStorage load failed:', e);
            return null;
        }
    }

    static removeData(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('LocalStorage remove failed:', e);
        }
    }

    static saveParts(parts) {
        this.saveData('cutopt_parts', parts.map(p => p.toJSON()));
    }

    static loadParts() {
        const data = this.loadData('cutopt_parts');
        return data ? data.map(p => Part.fromJSON(p)) : [];
    }

    static saveStocks(stocks) {
        this.saveData('cutopt_stocks', stocks.map(s => s.toJSON()));
    }

    static loadStocks() {
        const data = this.loadData('cutopt_stocks');
        return data ? data.map(s => Stock.fromJSON(s)) : [];
    }

    static saveSettings(settings) {
        this.saveData('cutopt_settings', settings.toJSON());
    }

    static loadSettings() {
        const data = this.loadData('cutopt_settings');
        return data ? Settings.fromJSON(data) : new Settings();
    }

    static saveSolutions(solutions) {
        this.saveData('cutopt_solutions', solutions.map(s => s.toJSON()));
    }

    static loadSolutions() {
        const data = this.loadData('cutopt_solutions');
        return data ? data.map(s => Solution.fromJSON(s)) : [];
    }
}

