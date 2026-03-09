# Quick Start Guide - Cut Optimizer

## 🚀 Getting Started in 5 Minutes

### Step 1: Navigate to Project
```bash
cd C:\Projects\MyProjects\cut-optimizer
```

### Step 2: Install Dependencies
```bash
npm install
```
This will install all required packages (Angular 18, ag-grid, Three.js, etc.)

### Step 3: Start Development Server
```bash
npm start
```
The application will automatically open at `http://localhost:4200`

### Step 4: Use the Application
1. **Left Panel**: Add parts and stocks manually or upload CSV files
2. **Center**: 3D/2D visualization (ready for implementation)
3. **Right Panel**: Trigger optimization and view results

---

## 📖 First Steps

### Import Sample Data
1. Click "Upload CSV" in the Parts section
2. Select `src/assets/sample-parts.csv`
3. Repeat for Stocks with `src/assets/sample-stocks.csv`

### Manual Entry
1. Click "Add Part" to manually add parts
2. Edit dimensions, quantities, and settings
3. Click "Add Stock" to add materials

### Configure Settings
- **Kerf Thickness**: Cutting blade thickness (default: 3.2mm)
- **Default Cut Perimeter**: Margin around stock edges

---

## 🛠 Development Workflow

### Adding a New Feature

#### 1. Create Component
```bash
ng generate component components/my-feature
```

#### 2. Create Service
```bash
ng generate service services/my-feature
```

#### 3. Add Models
Edit `src/app/models/index.ts` to add new TypeScript interfaces

#### 4. Update State
Use `OptimizationService` to manage reactive state with RxJS

#### 5. Styling
- Use SCSS variables in `src/styles.scss`
- Component-specific styles in `*.component.scss`

---

## 📝 Common Tasks

### Task: Display a Message
```typescript
// In component
ngOnInit() {
  console.log('Component initialized');
  this.optimizationService.parts$.subscribe(parts => {
    console.log('Parts updated:', parts);
  });
}
```

### Task: Update Parts List
```typescript
// In component
updateParts(parts: Part[]) {
  this.optimizationService.updateParts(parts);
}
```

### Task: Parse CSV File
```typescript
// In component
const file = event.target.files[0];
const reader = new FileReader();
reader.onload = (e) => {
  const csv = e.target.result;
  const parts = this.csvParserService.parseParts(csv);
  this.optimizationService.updateParts(parts);
};
reader.readAsText(file);
```

### Task: Draw Canvas Visualization
```typescript
// In component
@ViewChild('canvas') canvasRef: ElementRef<HTMLCanvasElement>;

ngAfterViewInit() {
  const solution = this.optimizationService.getSolutions()[0];
  this.visualizationService.visualizeSolution(solution, this.canvasRef.nativeElement);
}
```

---

## 🔗 Service Integration Example

```typescript
import { Component, OnInit } from '@angular/core';
import { OptimizationService, CsvParserService } from '@services/index';
import { Part, Stock } from '@models/index';

@Component({
  selector: 'app-example',
  template: `
    <div>
      <button (click)="optimize()">Optimize</button>
      <div>Solutions: {{ (solutions$ | async)?.length }}</div>
    </div>
  `
})
export class ExampleComponent implements OnInit {
  solutions$ = this.optimizationService.solutions$;

  constructor(
    private optimizationService: OptimizationService,
    private csvParserService: CsvParserService
  ) {}

  ngOnInit() {
    // Subscribe to observables
    this.optimizationService.parts$.subscribe(parts => {
      console.log('Parts:', parts);
    });
  }

  optimize() {
    this.optimizationService.startOptimization('guillotine-minSheets');
  }
}
```

---

## 📚 Project Structure Quick Reference

```
src/app/
├── models/           👈 Data types (Part, Stock, Solution, etc.)
├── services/         👈 Business logic (CSV parsing, optimization)
│   ├── csv-parser.service.ts
│   ├── optimization.service.ts
│   └── visualization.service.ts
├── components/       👈 UI Components
│   ├── left-panel/   (Parts/Stocks/Settings)
│   ├── viewport/     (3D/2D visualization)
│   └── right-panel/  (Solutions/Statistics)
└── pages/            👈 Future page components
```

---

## 🎯 Next Development Tasks

### Priority 1 - Core Algorithm
- [ ] Implement Guillotine packing algorithm
- [ ] Add edge cases handling
- [ ] Add unit tests for algorithm

### Priority 2 - Visualization
- [ ] Integrate Three.js for 3D rendering
- [ ] Implement camera controls (pan, zoom, rotate)
- [ ] Add sheet highlighting and selection

### Priority 3 - Features
- [ ] Export solutions to PDF
- [ ] Material database integration
- [ ] Historical solutions storage
- [ ] Real-time validation

### Priority 4 - Polish
- [ ] Add error handling dialogs
- [ ] Implement loading states
- [ ] Add keyboard shortcuts
- [ ] Performance optimization

---

## 🐛 Debugging Tips

### View Console Logs
1. Open browser DevTools: `F12`
2. Go to Console tab
3. Monitor component lifecycle logs

### Check Angular State
1. Install Angular DevTools extension
2. Open DevTools and go to Angular tab
3. Inspect component hierarchy and properties

### Monitor Observables
```typescript
// Add logging to service subscriptions
this.optimizationService.parts$.pipe(
  tap(parts => console.log('Parts changed:', parts))
).subscribe();
```

### Test CSV Parsing
```typescript
// In browser console
const service = ng.probe(document.querySelector('app-root')).componentInstance;
const csv = 'label,length,width\nPart1,100,50';
const result = service.csvParserService.parseParts(csv);
console.log(result);
```

---

## 📦 Build & Deployment

### Development Build
```bash
npm run build
```

### Production Build
```bash
npm run build:prod
```

### Serve Production Locally
```bash
npx http-server dist/cut-optimizer -p 8080
```

### Deploy to Server
1. Build: `npm run build:prod`
2. Copy `dist/cut-optimizer/` to web server
3. Configure server for SPA routing (all routes to index.html)

---

## 🔧 Environment-Specific Config

### Development (automatic)
```bash
npm start
# Uses src/environments/environment.ts
```

### Production (automatic)
```bash
npm run build:prod
# Uses src/environments/environment.prod.ts
```

### Manual Environment Selection
```bash
ng serve -c development
ng serve -c production
```

---

## 💡 Tips & Best Practices

✅ **DO:**
- Use TypeScript strict mode (already enabled)
- Use RxJS observables for async operations
- Keep components dumb, logic in services
- Use path aliases (@models, @services, @components)
- Comment complex algorithms

❌ **DON'T:**
- Don't use any without justification
- Don't fetch directly in components
- Don't modify service state outside services
- Don't use local storage without encryption

---

## 🆘 Common Issues & Solutions

### Issue: ng command not found
**Solution**: `npm install -g @angular/cli`

### Issue: Port 4200 in use
**Solution**: `ng serve --port 4300`

### Issue: Module not found errors
**Solution**: `rm -r node_modules package-lock.json && npm install`

### Issue: Build fails
**Solution**: 
1. Clear cache: `ng cache clean`
2. Check TypeScript: `npx tsc --noEmit`
3. Check styles: look for SCSS syntax errors

---

## 📚 Learning Resources

- **Angular**: https://angular.io/docs
- **RxJS**: https://rxjs.dev/
- **ag-grid**: https://www.ag-grid.com/documentation/
- **Three.js**: https://threejs.org/docs/
- **TypeScript**: https://www.typescriptlang.org/docs/

---

## 🎓 Project Architecture

### Service-Oriented Architecture
```
Component (UI Layer)
    ↓
Service (Business Logic)
    ↓
Data Model (Type Safety)
```

### Reactive Data Flow
```
User Action → Service Observable → Component Subscription → Template Update
```

### State Management
- Services maintain state via BehaviorSubject
- Components subscribe to observables
- State changes broadcast to all subscribers

---

## 🚦 Progress Checklist

- [x] Project setup complete
- [x] Angular 18 configured
- [x] Components created
- [x] Services scaffolded
- [x] Data models defined
- [x] CSV parsing implemented
- [ ] Guillotine algorithm
- [ ] 3D visualization
- [ ] Optimization execution
- [ ] Export functionality
- [ ] Unit tests
- [ ] E2E tests
- [ ] Production deployment

---

**Last Updated**: March 9, 2026
**Status**: ✅ Ready to Develop
**Next Step**: Implement Guillotine packing algorithm

