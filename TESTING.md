# Panel Cutting Optimizer - Testing Guide

## Pre-Launch Checklist

Before running the application, verify all files are present:

```
CutOptimizer/
├── index.html              ✓ Main application
├── start.html              ✓ Quick start page
├── styles.css              ✓ Styling
├── models.js               ✓ Data models
├── canvas.js               ✓ Rendering
├── optimizer.js            ✓ Algorithm
├── app.js                  ✓ Main logic
├── sample-parts.csv        ✓ Test data
├── sample-stocks.csv       ✓ Test data
├── README.md               ✓ Documentation
└── TESTING.md              ✓ This file
```

## Getting Started

### 1. Launch Application

**Option A: Direct File Open**
```
Open index.html in a web browser
```

**Option B: Local Server (Recommended)**
```powershell
# PowerShell
cd C:\Projects\MyProjects\CutOptimizer
python -m http.server 8000
# Then open: http://localhost:8000/start.html
```

## Basic Functionality Tests

### Test 1: UI Layout ✓
- [ ] Header with buttons visible
- [ ] Left sidebar (Parts) visible
- [ ] Center canvas area visible
- [ ] Right sidebar (Solutions) visible
- [ ] All sections expandable/collapsible
- [ ] Sidebars are resizable

### Test 2: Manual Part Entry ✓
1. Click "+ Add Part"
2. Fill in fields:
   - Label: "Test Part 1"
   - Length: "100"
   - Width: "50"
   - Qty: "2"
3. Verify row added to table
4. Edit a field and verify update
5. Click remove (×) and verify deletion

### Test 3: CSV Import - Parts ✓
1. Click "Upload CSV" under Parts
2. Select `sample-parts.csv`
3. Verify parts loaded:
   - Shelf A (800×400, qty 2)
   - Shelf B (600×300, qty 3)
   - Shelf C (500×250, qty 4)
   - Back Panel (1500×1000, qty 1)
   - Side Panel (1000×500, qty 2)

### Test 4: CSV Import - Stocks ✓
1. Click "Upload CSV" under Stocks
2. Select `sample-stocks.csv`
3. Verify stocks loaded:
   - Sheet A 2000x1000 (qty 5)
   - Sheet B 1500x800 (qty 3)

### Test 5: Settings ✓
1. Set Kerf Thickness to "3"
2. Set Default Cut Perimeter to "0"
3. Close browser and reopen
4. Verify values persist (local storage)

### Test 6: Optimization - Basic ✓
1. Ensure parts and stocks are loaded
2. Click "Start Optimization"
3. Progress modal appears
4. Progress updates (message and %)
5. After completion:
   - Modal closes
   - Solutions appear in right panel
   - Sort controls visible

### Test 7: Solutions Viewing ✓
1. After optimization, solutions listed
2. Click a solution
   - Solution highlighted
   - Canvas updates
   - Statistics populate
3. Verify statistics show:
   - Global stats (waste %, utilization, sheet count, etc.)
   - Per-sheet stats (one group per sheet)
   - Cuts list

### Test 8: Sorting ✓
1. Use sort controls:
   - [ ] Sort by Waste %
   - [ ] Sort by Cuts
   - [ ] Sort by Cut Length
   - [ ] Ascending order
   - [ ] Descending order
2. Solutions list reorders appropriately

### Test 9: Canvas Controls ✓
1. Select a solution
2. Canvas displays cutting pattern
3. Test controls:
   - [ ] Zoom in (+)
   - [ ] Zoom out (−)
   - [ ] Reset view
   - [ ] Mouse wheel zoom
   - [ ] Click and drag to pan

### Test 10: Stop Optimization ✓
1. Start optimization
2. Immediately click "Stop"
3. Optimization halts
4. Partial results displayed
5. Can view incomplete solution

## Advanced Tests

### Test 11: Large Problem ✓
1. Manually add 10 parts
2. Add 3 stocks
3. Run optimization
4. Verify no freezing
5. Can stop at any time
6. Results show multiple solutions

### Test 12: Edge Cases ✓

**Test 12a: No Solutions**
- Add parts that don't fit in stocks
- Run optimization
- Verify "No solutions" message
- All parts in waste_parts

**Test 12b: Single Stock**
- One part, one stock
- Verify single solution
- 100% utilization displayed

**Test 12c: Rotation Enabled**
- Create wide part (e.g., 100×500)
- Create tall stock (e.g., 1000×200)
- Enable rotation on part
- Verify part fits when rotated
- Check "rotated" flag in solution

### Test 13: Data Persistence ✓
1. Load sample data
2. Run optimization
3. Refresh browser (F5)
4. Verify data retained:
   - Parts still present
   - Stocks still present
   - Settings preserved
   - Solutions restored

### Test 14: CSV Format Tolerance ✓
Create test CSV with:
- [ ] Extra whitespace in headers
- [ ] Missing optional fields
- [ ] Boolean values (true/false)
- [ ] Numeric values with decimals
- [ ] Empty rows

Verify parser handles gracefully.

## Visual Inspection

### Canvas Rendering
- [ ] Sheets drawn as rectangles
- [ ] Parts shown with different colors
- [ ] Part labels visible
- [ ] Dimensions displayed
- [ ] Cut lines shown as dashed
- [ ] Cut edge restrictions visible
- [ ] Grid visible in background

### UI Responsiveness
- [ ] Controls responsive to clicks
- [ ] Tables scrollable
- [ ] No horizontal scrolling on smaller screens
- [ ] Modal dialogs centered
- [ ] Buttons disabled appropriately

## Performance Metrics

Test with sample data and note:
- Time to complete optimization: _____ seconds
- Number of solutions found: _____ 
- Browser memory usage: _____ MB

## Browser Compatibility

Test in each supported browser:

- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

For each, verify:
- All features work
- Canvas renders correctly
- No console errors
- Smooth interactions

## Error Handling

### Test 15: Error States ✓
1. Invalid CSV (missing columns)
   - [ ] Shows error message
   - [ ] Doesn't crash

2. Malformed data (non-numeric values)
   - [ ] Parsed or ignored
   - [ ] Shows warning

3. Empty tables
   - [ ] Can't start optimization
   - [ ] Shows helpful message

## Regression Tests

After any code changes, verify:
1. All UI elements appear
2. CSV import/export works
3. Optimization completes
4. Canvas renders solutions
5. Statistics calculate correctly
6. No JavaScript errors in console

## Known Issues / Limitations

Document any issues found:

Issue: _______________
Severity: Low / Medium / High
Workaround: _______________

## Sign-off

- [ ] All basic functionality tests pass
- [ ] Application is stable
- [ ] Data persistence works
- [ ] Canvas renders correctly
- [ ] No critical errors
- [ ] Ready for production use

**Tested By:** ________________
**Date:** ________________
**Build Version:** 1.0.0

---

## Quick Test Checklist

Use this abbreviated checklist for quick verification:

```
Quick Test (5 minutes):
1. [ ] Load index.html in browser
2. [ ] Click "Add Part" and verify table updates
3. [ ] Upload sample-parts.csv
4. [ ] Upload sample-stocks.csv
5. [ ] Click "Start Optimization"
6. [ ] Wait for completion
7. [ ] Click a solution
8. [ ] Verify canvas renders
9. [ ] Check statistics display
10. [ ] Test zoom/pan on canvas

All checks pass? Application is working correctly! ✓
```

