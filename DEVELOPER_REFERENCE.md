# Panel Cutting Optimizer - Developer Reference

## Quick Navigation

| What | File | Lines | Description |
|------|------|-------|-------------|
| **UI Layout** | index.html | 337 | Main application interface |
| **Styling** | styles.css | 400+ | Responsive design and components |
| **Data Models** | models.js | 320+ | Classes for Parts, Stocks, Solutions |
| **Canvas Drawing** | canvas.js | 370+ | 2D rendering and visualization |
| **Optimization** | optimizer.js | 300+ | Recursive cutting algorithm |
| **Application** | app.js | 600+ | Main controller and event handling |
| **Documentation** | README.md | 300+ | User guide |
| **Testing** | TESTING.md | 300+ | Test scenarios and procedures |

## Class Hierarchy

```
Part
├── label: string
├── length: number
├── width: number
├── quantity: number
├── enabled: boolean
└── ignore_direction: boolean

Stock
├── label: string
├── length: number
├── width: number
├── quantity: number
├── enabled: boolean
├── ignore_direction: boolean
├── cut_top_size: number
├── cut_bottom_size: number
├── cut_left_size: number
└── cut_right_size: number

Settings
├── kerf_thickness: number
└── default_stock_cut_perimeter: number

Solution
├── id: string
├── used_sheets: UsedSheet[]
├── unused_sheets: Stock[]
├── waste_parts: Part[]
└── timestamp: Date

UsedSheet
├── stock: Stock
├── index: number
├── placed_parts: PlacedPart[]
└── cuts: Cut[]

PlacedPart
├── part: Part
├── x: number
├── y: number
└── rotated: boolean

Cut
├── direction: 'H' | 'V'
├── position: number
├── length: number
└── offset: number
```

## API Reference

### CutOptimizationApp

```javascript
// Constructor
app = new CutOptimizationApp()

// Parts Management
app.parts: Part[]
app.addPart(part: Part)
app.removePart(index: number)
app.updatePart(index: number, field: string, value: any)
app.renderPartTable()

// Stocks Management
app.stocks: Stock[]
app.addStock(stock: Stock)
app.removeStock(index: number)
app.updateStock(index: number, field: string, value: any)
app.renderStockTable()

// Settings
app.settings: Settings

// Solutions
app.solutions: Solution[]
app.currentSolution: Solution | null
app.selectSolution(solution: Solution)
app.renderSolutions()
app.sortAndRenderSolutions()

// Optimization
app.startOptimization(): Promise<void>
app.stopOptimization()
app.updateProgress(message: string, percentage: number)

// Storage
app.saveToStorage()
app.loadFromStorage()

// CSV
app.parseCSV(content: string): object[]
app.handlePartsCSVUpload(event: Event)
app.handleStockCSVUpload(event: Event)
```

### CuttingOptimizer

```javascript
// Constructor
optimizer = new CuttingOptimizer(
  parts: Part[],
  stocks: Stock[],
  settings: Settings
)

// Main Method
solutions = await optimizer.optimize(): Promise<Solution[]>

// Configuration
optimizer.setProgressCallback(callback: Function)

// Control
optimizer.stop()

// Internal Methods
optimizer.placePartsRecursive(...): Promise<void>
optimizer.getPossiblePlacements(part, stock): Placement[]
optimizer.tryPlacePart(sheet, part, x, y, rotated): boolean | null
optimizer.checkOverlap(part1, part2): boolean
optimizer.generateCuts(sheet, placedPart)
optimizer.cloneSheet(sheet): UsedSheet
```

### CanvasRenderer

```javascript
// Constructor
canvas = new CanvasRenderer(canvasId: string)

// Rendering
canvas.render(solution: Solution | null)
canvas.clear()

// View Controls
canvas.zoomIn()
canvas.zoomOut()
canvas.resetView()

// Properties
canvas.scale: number
canvas.panX: number
canvas.panY: number

// Drawing Methods
canvas.drawSheet(sheet, offsetX, offsetY)
canvas.drawPart(placedPart, x, y, index)
canvas.drawCuts(cuts, offsetX, offsetY, stock)
canvas.drawGrid(minX, minY, maxX, maxY)

// Utilities
canvas.transformX(x: number): number
canvas.transformY(y: number): number
canvas.untransformX(x: number): number
canvas.untransformY(y: number): number
canvas.downloadImage()
```

## Common Tasks

### Add a New Field to Part Model

1. Update **Part class** in models.js:
```javascript
class Part {
    constructor(..., newField = defaultValue) {
        // ...existing...
        this.newField = newField;
    }
}
```

2. Update CSV parsing in **app.js**:
```javascript
handlePartsCSVUpload(event) {
    // ...existing code...
    this.parts = data.map(row => new Part(
        // ...existing fields...,
        row.new_field || defaultValue
    ));
}
```

3. Update table rendering in **app.js**:
```javascript
renderPartTable() {
    // Add new column to table header and row
    // Add input field binding
}
```

### Implement New Sorting Criteria

1. Add radio button in **index.html**:
```html
<input type="radio" class="btn-check" name="sortBy" id="sortByNew" value="new">
<label class="btn btn-outline-secondary" for="sortByNew">New Criteria</label>
```

2. Update sorting logic in **app.js**:
```javascript
sortAndRenderSolutions() {
    // ...existing code...
    } else if (sortBy === 'new') {
        sorted.sort((a, b) => a.newProperty - b.newProperty);
    }
    // ...existing code...
}
```

### Enhance Canvas Visualization

1. Add color in **canvas.js**:
```javascript
this.colors = {
    // ...existing...
    newColor: '#xxxxxx'
};
```

2. Add drawing method:
```javascript
drawNewElement(element) {
    this.ctx.fillStyle = this.colors.newColor;
    // Draw element
}
```

3. Call in appropriate render method:
```javascript
render(solution) {
    // ...existing...
    this.drawNewElement(data);
}
```

### Add New Settings Parameter

1. Update **Settings class** in models.js
2. Update UI in **index.html**
3. Add event listener in **app.js**:
```javascript
document.getElementById('newSettingId').addEventListener('change', (e) => {
    this.settings.newProperty = parseFloat(e.target.value);
    this.saveToStorage();
});
```

## Testing Code Changes

### Unit Test Example

```javascript
// Test Part model
const part = new Part('Test', 100, 50, 2, true, false);
console.assert(part.area === 5000, 'Part area calculation');
console.assert(part.quantity === 2, 'Part quantity');
console.assert(part.enabled === true, 'Part enabled flag');
```

### Integration Test Example

```javascript
// Test optimization with known solution
const part = new Part('Test', 100, 50, 1);
const stock = new Stock('Stock', 200, 100, 1);
const settings = new Settings(0, 0);
const optimizer = new CuttingOptimizer([part], [stock], settings);
const solutions = await optimizer.optimize();
console.assert(solutions.length > 0, 'Optimization finds solutions');
console.assert(solutions[0].partsPlaced === 1, 'Part placed');
```

## Performance Optimization Tips

1. **Canvas Rendering**: 
   - Render only visible portions
   - Use requestAnimationFrame for animations
   - Cache transformed coordinates

2. **Optimization Algorithm**:
   - Prune impossible branches early
   - Use memoization for duplicate states
   - Implement heuristic ordering

3. **DOM Updates**:
   - Batch DOM operations
   - Use DocumentFragment for multiple inserts
   - Avoid layout thrashing

4. **Memory**:
   - Clear unnecessary object references
   - Implement object pooling for frequently created objects
   - Use weak references where possible

## Debugging Tips

### Enable Verbose Logging

```javascript
// In app.js constructor
this.debug = true;

// In key methods
if (this.debug) console.log('Action:', details);
```

### Browser DevTools

```javascript
// Inspect data structures
window.app.solutions
window.app.currentSolution
window.app.parts
window.app.stocks

// Check storage
localStorage.getItem('cutopt_solutions')

// Monitor events
document.addEventListener('click', (e) => console.log(e.target));
```

### Solution Visualization

```javascript
// Log current solution details
const sol = app.currentSolution;
console.table(sol.used_sheets.map(s => ({
    stock: s.stock.label,
    parts: s.placed_parts.length,
    waste: s.wastedArea.toFixed(2),
    utilization: s.utilization.toFixed(1) + '%'
})));
```

## Code Style Guidelines

### Variable Naming
- `camelCase` for variables and methods
- `UPPER_CASE` for constants
- Descriptive names: `usedSheetCount` not `n`

### Comments
```javascript
// Single line comment for code explanation

/**
 * Multi-line comment for methods
 * @param {Type} name - Description
 * @returns {Type} Description
 */
```

### Error Handling
```javascript
try {
    // Operation
    if (!isValid) throw new Error('Clear message');
} catch (error) {
    console.error('Context:', error);
    alert('User-friendly message');
}
```

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Canvas blank | Solution not selected | Call `canvas.render(solution)` |
| Optimization hangs | Large problem size | Implement early termination |
| Data lost on refresh | LocalStorage quota | Clear old data |
| Slow CSV import | Large file | Add chunked processing |
| Memory leak | Event listener not removed | Use cleanup in destruction |

## Resources

- **Specification**: Cut optimiser.md
- **User Guide**: README.md
- **Testing**: TESTING.md
- **Implementation**: IMPLEMENTATION.md
- **Bootstrap**: https://getbootstrap.com/docs/5.3/
- **Canvas API**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **ES6**: https://es6.io/

## Contact & Support

For issues or questions about the implementation, refer to:
1. Code comments and JSDoc
2. README.md for user-facing issues
3. TESTING.md for test cases
4. IMPLEMENTATION.md for architecture details

---

**Last Updated:** December 2024  
**Version:** 1.0.0

