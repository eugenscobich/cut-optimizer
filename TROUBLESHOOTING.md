# Panel Cutting Optimizer - Quick Troubleshooting Guide

## Getting the App Working

### Step 1: Verify All Files Exist

Check that these files are in `C:\Projects\MyProjects\CutOptimizer\`:

```
✓ index.html
✓ start.html  
✓ styles.css
✓ models.js
✓ canvas.js
✓ optimizer.js
✓ app.js
✓ sample-parts.csv
✓ sample-stocks.csv
```

### Step 2: Open the App

**Option A - Direct File Open** (Quickest)
1. Open `File Explorer`
2. Navigate to `C:\Projects\MyProjects\CutOptimizer\`
3. Double-click `index.html`
4. Browser opens the app

**Option B - Start Page** (Recommended)
1. Double-click `start.html`
2. Click "Launch Application" button

**Option C - Local Server** (Best)
```powershell
cd C:\Projects\MyProjects\CutOptimizer
python -m http.server 8000
```
Then open: `http://localhost:8000/index.html`

### Step 3: Test Basic Functionality

1. **Add a Part**
   - Click "+ Add Part" button
   - Should see new row in Parts table
   - ✓ If works: UI is loaded

2. **Add a Stock**
   - Click "+ Add Stock" button
   - Should see new row in Stocks table
   - ✓ If works: Tables are functional

3. **Load Sample Data**
   - Click "Upload CSV" under Parts
   - Select `sample-parts.csv`
   - Should load 5 parts
   - ✓ If works: CSV import works

4. **Run Optimization**
   - Click "Start Optimization"
   - Should show progress modal
   - Should complete in 1-5 seconds
   - Should show solutions
   - ✓ If works: Algorithm works

5. **View Solution**
   - Click any solution
   - Canvas should update
   - Statistics should populate
   - ✓ If works: Rendering works

---

## Common Problems & Fixes

### Problem: Browser Shows Blank Page

**Causes:**
- File not found
- JavaScript error
- CSS not loaded

**Fixes:**
1. Check file path is correct: `C:\Projects\MyProjects\CutOptimizer\index.html`
2. Open browser console (F12 → Console tab)
3. Look for red error messages
4. Try refreshing (Ctrl+F5 for hard refresh)
5. Try different browser

### Problem: No Parts/Stocks Visible

**Causes:**
- Tables not rendering
- Data not loading

**Fixes:**
1. Click "+ Add Part" to create one manually
2. Check browser console for errors
3. Verify `models.js` is loading (check Network tab in DevTools)
4. Try opening `start.html` instead of `index.html`

### Problem: Can't Upload CSV File

**Causes:**
- File format incorrect
- Headers missing
- Browser restriction

**Fixes:**
1. Verify CSV format:
   ```csv
   label,length,width,quantity,enabled,ignore_direction
   MyPart,100,50,1,true,false
   ```

2. Check file extension is `.csv` (not `.txt`)

3. Verify headers match exactly (case-sensitive)

4. For stocks CSV, include all columns:
   ```csv
   label,length,width,quantity,enabled,ignore_direction,cut_top_size,cut_bottom_size,cut_left_size,cut_right_size
   ```

5. Try using `sample-parts.csv` as template

### Problem: Optimization Never Completes

**Causes:**
- Too many parts/stocks
- Algorithm stuck
- Browser performance issue

**Fixes:**
1. Click "Stop" button to halt optimization
2. Try with fewer parts (reduce sample to 2-3 parts)
3. Try with just 1 stock sheet
4. Refresh browser and try again
5. Try different browser
6. Close other applications to free memory

### Problem: Canvas Shows Blank/White

**Causes:**
- No solution selected
- Solution has no parts placed
- Rendering error

**Fixes:**
1. Click any solution in the Solutions list
2. Wait for canvas to update
3. Try zoom in/out buttons
4. Try "Reset" button to reset view
5. Check browser console for errors

### Problem: Data Lost After Closing Browser

**Causes:**
- LocalStorage disabled
- Browser in private/incognito mode
- LocalStorage full

**Fixes:**
1. Check browser isn't in private mode
2. Enable LocalStorage (usually enabled by default)
3. Clear old data:
   - Open DevTools (F12)
   - Go to Application → Local Storage
   - Right-click and delete `cutopt_*` entries
4. Try again

### Problem: CSV Import Doesn't Work

**Causes:**
- File encoding issue
- Hidden characters in CSV
- Wrong delimiter

**Fixes:**
1. Use `sample-parts.csv` format as template
2. Save CSV with UTF-8 encoding
3. Use comma `,` as delimiter (not semicolon `;`)
4. Open CSV in Notepad to verify format
5. Try copy-paste data from Excel to Notepad first

### Problem: Buttons Are Disabled/Greyed Out

**Causes:**
- Optimization in progress
- Missing required data
- Validation error

**Fixes:**
1. Wait for optimization to complete
2. If stuck, refresh browser
3. Add at least 1 part and 1 stock
4. Check browser console for validation errors

### Problem: Sidebar Won't Resize

**Causes:**
- CSS issue
- JavaScript error
- Mouse conflict

**Fixes:**
1. Refresh browser
2. Position mouse exactly on resize handle (vertical line)
3. Click and hold, then drag
4. Check browser console for errors
5. Try different browser

### Problem: Solutions Don't Appear After Optimization

**Causes:**
- No solutions found (parts don't fit)
- Optimization failed
- UI not updated

**Fixes:**
1. Check if algorithm found solutions:
   - Open browser console (F12)
   - Type: `app.solutions.length`
   - Should be > 0

2. If 0 solutions:
   - Parts might not fit in stocks
   - Increase stock size or reduce parts
   - Try disabling rotation restrictions

3. Try running optimization again

4. Check browser console for errors

### Problem: Statistics Show 0 or NaN

**Causes:**
- Solution has no parts placed
- Calculation error
- Data corruption

**Fixes:**
1. Select a different solution
2. Run optimization again
3. Clear browser storage and start fresh
4. Check browser console for calculation errors

### Problem: Zoom/Pan Not Working

**Causes:**
- Canvas not in focus
- JavaScript error
- Event listeners not attached

**Fixes:**
1. Click on canvas area first
2. Try + and − buttons instead of scroll
3. Try clicking "Reset" button
4. Refresh browser
5. Check browser console for errors

---

## Browser-Specific Issues

### Chrome/Chromium
- Most compatible
- If issues: Try incognito mode (Ctrl+Shift+N)
- Clear cache: Ctrl+Shift+Delete

### Firefox
- Should work fine
- Check in about:preferences if LocalStorage enabled
- Clear cache: Ctrl+Shift+Delete

### Safari
- May need to enable JavaScript (Settings → Security)
- Check if LocalStorage enabled (Preferences → Privacy)
- Use latest version

### Edge
- Compatible with Chrome
- Try Inprivate if issues: Ctrl+Shift+P
- Clear cache: Ctrl+Shift+Delete

---

## Advanced Troubleshooting

### Check Browser Console

1. Open DevTools: **F12**
2. Go to **Console** tab
3. Look for red error messages
4. Type commands:
   ```javascript
   // Check app initialized
   typeof app
   
   // Check data loaded
   app.parts.length
   app.stocks.length
   
   // Check solutions
   app.solutions.length
   
   // Check canvas
   app.canvas.render()
   
   // Check storage
   localStorage.getItem('cutopt_parts')
   ```

### Check Network Tab

1. Open DevTools: **F12**
2. Go to **Network** tab
3. Refresh page
4. All files should load with status 200:
   - index.html
   - styles.css
   - models.js
   - canvas.js
   - optimizer.js
   - app.js

If any show 404, file not found - check paths.

### Check Storage

1. Open DevTools: **F12**
2. Go to **Application** tab
3. Left sidebar: **Local Storage**
4. Click the website URL
5. Should see `cutopt_*` keys with saved data

To clear:
- Right-click `cutopt_*` → Delete
- Or delete all and refresh

### Monitor Performance

1. Open DevTools: **F12**
2. Go to **Performance** tab
3. Click record
4. Run optimization
5. Stop recording
6. View timeline to see bottlenecks

---

## Getting Help

### Information to Provide

When reporting issues, include:
1. Browser name and version
2. Operating system
3. Steps to reproduce
4. Error messages from console (F12)
5. Screenshot if UI issue
6. Sample data being used

### Check These First

1. ✓ All files present
2. ✓ Using supported browser
3. ✓ JavaScript enabled
4. ✓ LocalStorage enabled
5. ✓ CSV format correct
6. ✓ Parts fit in stocks
7. ✓ Browser cache cleared

### Where to Look

- **Documentation**: README.md
- **Technical Spec**: Cut optimiser.md
- **Testing Guide**: TESTING.md
- **Implementation**: IMPLEMENTATION.md
- **Developer Guide**: DEVELOPER_REFERENCE.md

---

## Quick Test Checklist

Use this to verify everything works:

```
❑ 1. Open index.html - page loads
❑ 2. Click + Add Part - new row appears
❑ 3. Click + Add Stock - new row appears
❑ 4. Upload sample-parts.csv - 5 parts loaded
❑ 5. Upload sample-stocks.csv - 2 stocks loaded
❑ 6. Click Start Optimization - progress shows
❑ 7. Wait for completion - solutions appear
❑ 8. Click a solution - canvas updates
❑ 9. Check statistics - numbers display
❑ 10. Test zoom/pan - canvas responds

All checks pass? ✓ Application works!
```

---

## Report a Bug

Found an issue? Note:
1. **What happened**: Description
2. **What should happen**: Expected behavior
3. **How to reproduce**: Steps
4. **Screenshots**: If applicable
5. **Browser/OS**: Details
6. **Console errors**: From F12

---

**Last Updated:** December 2024  
**Quick Support**: Try hard refresh (Ctrl+F5) first!

