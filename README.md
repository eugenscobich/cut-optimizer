# Panel Cutting Optimizer - Web Application

A browser-based application for generating optimized cutting patterns for sheet materials.

## Features

- **Visual Web Interface** - Responsive UI with interactive canvas
- **CSV Import/Export** - Easy import of parts and stock sheets
- **Optimization Algorithm** - Recursive exhaustive search for all valid cutting patterns
- **Interactive Canvas** - Visual representation of cutting patterns with zoom and pan
- **Multi-column Sorting** - Sort solutions by waste, cuts, or cut length
- **Detailed Statistics** - Global and per-sheet metrics
- **Local Storage** - Automatic saving of data and settings
- **Asynchronous Processing** - Non-blocking optimization with progress tracking

## Getting Started

### 1. Open the Application

Simply open `index.html` in a modern web browser:
```bash
# Option 1: Direct file open
file:///path/to/CutOptimizer/index.html

# Option 2: Using a local server (recommended)
python -m http.server 8000
# Then navigate to: http://localhost:8000/index.html
```

### 2. Add Parts

You can add parts in two ways:

#### Method A: Manual Entry
1. Click the **"+ Add Part"** button
2. Fill in the fields:
   - **Label**: Part identifier (e.g., "Shelf A")
   - **Length**: Length dimension
   - **Width**: Width dimension
   - **Qty**: Quantity needed
   - **✓**: Enable/disable this part
   - **Rot**: Allow rotation

#### Method B: CSV Import
1. Click **"Upload CSV"** button under Parts
2. Use the CSV format:
   ```csv
   label,length,width,quantity,enabled,ignore_direction
   Shelf A,800,400,2,true,false
   Shelf B,600,300,3,true,true
   ```

### 3. Add Stock Sheets

Similar to parts, add stock sheets manually or via CSV:

```csv
label,length,width,quantity,enabled,ignore_direction,cut_top_size,cut_bottom_size,cut_left_size,cut_right_size
Stock 1,2000,1000,5,true,false,0,0,0,0
Stock 2,1500,800,3,true,false,10,10,10,10
```

**Fields:**
- **cut_top_size, cut_bottom_size, cut_left_size, cut_right_size**: Unusable edge offsets (e.g., for damaged areas)

### 4. Configure Settings

- **Kerf Thickness**: Blade width to subtract from dimensions
- **Default Cut Perimeter**: Global edge trimming applied to all stock sheets

### 5. Run Optimization

1. Click **"Start Optimization"** button
2. Watch the progress in the modal
3. Solutions will appear in the Solutions list on the right

### 6. Review Results

- **Solutions List**: Click any solution to view details
- **Sort Options**: 
  - By: Waste %, Cuts, Cut Length
  - Order: Ascending or Descending
- **Canvas**: Visual representation of the selected solution
- **Statistics**: View global and per-sheet metrics
- **Cuts List**: Detailed cut information

## Canvas Controls

- **Scroll/Wheel**: Zoom in/out
- **Click & Drag**: Pan around
- **+** Button: Zoom in
- **−** Button: Zoom out
- **Reset** Button: Reset view to default

## Data Models

### Part
- `label` - Part identifier
- `length` - Length dimension
- `width` - Width dimension
- `quantity` - Number needed
- `enabled` - Include in optimization
- `ignore_direction` - Allow 90° rotation

### Stock
- `label` - Stock identifier
- `length` - Length dimension
- `width` - Width dimension
- `quantity` - Number available
- `enabled` - Include in optimization
- `ignore_direction` - Allow 90° rotation
- `cut_*_size` - Edge restrictions

### Settings
- `kerf_thickness` - Blade width
- `default_stock_cut_perimeter` - Global trim size

## Algorithm

The optimizer uses a **recursive exhaustive search** algorithm:

1. Takes the first remaining part
2. Tries placing it on each available stock
3. For each placement, attempts both orientations (if enabled)
4. Places the part on either existing sheets or new sheets
5. Recurses with remaining parts
6. Returns all valid solutions

Solutions are automatically sorted by material waste percentage.

## Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

Requires ES6+ JavaScript support.

## Storage

All data is automatically saved to browser's local storage:
- Last parts list
- Last stocks list
- Settings
- Generated solutions

To clear storage, use browser's DevTools > Storage > Local Storage.

## Performance Tips

- For large part lists (100+), optimization may take time
- Click "Stop" button to halt optimization at any time
- Solutions are found incrementally - stop button will show partial results
- Use higher kerf thickness and cut perimeters to reduce feasible solutions

## Known Limitations

1. Algorithm is simplified for demonstration - may not find all theoretical solutions
2. Canvas assumes 2D top-down view
3. No nesting or complex shape support
4. No cost calculation (only waste-based optimization)

## File Structure

```
CutOptimizer/
├── index.html          # Main HTML file
├── styles.css          # Styling
├── models.js           # Data models and storage
├── canvas.js           # Canvas rendering
├── optimizer.js        # Optimization algorithm
├── app.js              # Main application logic
└── README.md           # This file
```

## Example Workflow

### Example 1: Simple Shelving

**Parts:**
- Label: Shelf, Length: 800, Width: 400, Qty: 4, Rotation: No

**Stock:**
- Label: 2x4 Sheet, Length: 2000, Width: 1200, Qty: 2

**Settings:**
- Kerf: 3mm
- Default Cut Perimeter: 0

**Expected:** 2-3 sheets used, 80-90% utilization

## Troubleshooting

**No solutions found:**
- Check that parts fit within stock sheets
- Verify quantities are correct
- Try disabling rotation restrictions
- Check cut perimeters aren't too large

**Slow optimization:**
- Reduce number of parts/stocks
- Increase kerf thickness to reduce possibilities
- Click Stop and review partial results

**UI Issues:**
- Clear browser cache
- Try a different browser
- Check browser console for errors (F12)

## API Usage (For Developers)

```javascript
// Create instances
const part = new Part('Shelf', 800, 400, 2, true, false);
const stock = new Stock('Sheet', 2000, 1000, 5, true, false, 0, 0, 0, 0);
const settings = new Settings(3, 0);

// Run optimizer
const optimizer = new CuttingOptimizer([part], [stock], settings);
optimizer.setProgressCallback((progress) => {
    console.log(progress.message, progress.percentage);
});
const solutions = await optimizer.optimize();

// Render solution
const renderer = new CanvasRenderer('drawingCanvas');
renderer.render(solutions[0]);
```

## Support & Feedback

For issues or feature requests, please refer to the technical specification document.

---

**Version:** 1.0.0  
**Last Updated:** December 2024

