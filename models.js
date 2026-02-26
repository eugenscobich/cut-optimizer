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

    toJSON() {
        return {
            part: this.part ? this.part.toJSON() : null,
            x: this.x,
            y: this.y,
            rotated: this.rotated
        };
    }
}


class Area {
    constructor(x, y, length, width, stock, placed_part = null) {
        this.x = x;
        this.y = y;
        this.length = length;
        this.width = width;
        this.stock = stock;
        this.placed_part = placed_part;
        this.cut = null;
        this.sub_areas = [];
    }

    get area() {
        return this.length * this.width;
    }

    toJSON() {
        return {
            x: this.x,
            y: this.y,
            length: this.length,
            width: this.width,
            stock: this.stock ? this.stock.toJSON() : null,
            placed_part: this.placed_part ? this.placed_part.toJSON() : null
        };
    }
}

class Cut {
    constructor(cut_number = 1, area, direction, offset, thickness, placed_part = null, produced_areas) {
        this.cut_number = cut_number;
        this.area = area;
        this.direction = direction;
        this.offset = offset;
        this.thickness = thickness;
        this.placed_part = placed_part;
        this.produced_areas = produced_areas;
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
        return this.direction === 'H' ? this.area.length : this.area.width;
    }

    toJSON() {
        return {
            cutNumber: this.cutNumber,
            area: this.area ? this.area.toJSON() : null,
            direction: this.direction,
            offset: this.offset,
            part: this.part ? this.part.toJSON() : null
        };
    }
}

class Sheet {
    constructor(stock, areas) {
        this.stock = stock;
        this.areas = areas;
        this.cuts = this.areas.reduce((cuts, area) => cuts.concat(area.cut ? [area.cut] : []), []);
        this.placed_parts = this.areas.reduce((parts, area) => parts.concat(area.placed_part ? [area.placed_part] : []), []);
    }

    get usedArea() {
        return 0.0;
    }

    get wastedArea() {
        return 0.0;
    }

    get utilization() {
        return 0.0;
    }


    get cutLength() {
        return this.cuts.reduce((sum, cut) => sum + cut.cut_length, 0);
    }
}

class Solution {
    constructor(id = null, cuts = []) {
        this.id = id;
        this.cuts = cuts; // Array of cuts
        this.areas = this.cuts.reduce((areas, cut) => areas.concat(cut.produced_areas), []);
        this.placed_part = this.areas.reduce((parts, area) => parts.concat(area.placed_part ? [area.placed_part] : []), []);

        const groupedAreasByStock = this.areas.reduce((map, area) => {
            const key = area.stock;
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(area);
            return map;
        }, new Map());

        this.sheets = [];
        groupedAreasByStock.forEach((areas, stock) => {
            this.sheets.push(new Sheet(stock, areas));
        });

    }

    get totalUsedArea() {
        return 0;
    }

    get totalWastedArea() {
        return 0;
    }

    get totalArea() {
        return 0;
    }

    get totalCuts() {
        return 0;
    }

    get totalCutLength() {
        return 0;
    }

    get sheetsUsed() {
        return 0;
    }

    get partsPlaced() {
        return 0;
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
            cuts: this.cuts.map(s => (s && typeof s.toJSON === 'function') ? s.toJSON() : s)
        };
    }

    static fromJSON(obj) {
        const solution = new Solution(obj.id);
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
        // tolerate solutions that are already plain objects (e.g. from worker postMessage)
        const payload = solutions.map(s => (s && typeof s.toJSON === 'function') ? s.toJSON() : s);
        this.saveData('cutopt_solutions', payload);
    }

    static loadSolutions() {
        const data = this.loadData('cutopt_solutions');
        return data ? data.map(s => Solution.fromJSON(s)) : [];
    }
}
