# Cut Optimizer - Project File Structure

## Complete Directory Map

```
cut-optimizer/
│
├── 📄 Configuration Files
│   ├── package.json                  # Dependencies & npm scripts
│   ├── angular.json                  # Angular CLI configuration
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── tsconfig.app.json            # App-specific TypeScript config
│   ├── .gitignore                    # Git ignore patterns
│   │
│   └── 📚 Documentation
│       ├── README.md                 # Project documentation
│       ├── SETUP.md                  # Setup & installation guide
│       └── SETUP_COMPLETE.md         # Setup completion summary
│
└── 📁 Source Code (src/)
    │
    ├── 📄 Entry Files
    │   ├── index.html               # HTML entry point
    │   ├── main.ts                  # Angular bootstrap
    │   └── styles.scss              # Global application styles
    │
    ├── 📁 Application (app/)
    │   │
    │   ├── 🎨 Root Component
    │   │   ├── app.component.ts      # Root component class
    │   │   ├── app.component.html    # Root template (3-panel layout)
    │   │   └── app.component.scss    # Root component styles
    │   │
    │   ├── 📊 Data Models (models/)
    │   │   └── index.ts              # TypeScript interfaces:
    │   │                               # - Part, Stock, Settings
    │   │                               # - PlacedPart, CutLine, UsedSheet
    │   │                               # - Solution, WasteArea
    │   │                               # - SolutionStatistics, OptimizationInput
    │   │
    │   ├── 🔧 Services (services/)
    │   │   ├── index.ts                          # Service exports
    │   │   ├── csv-parser.service.ts             # CSV parsing logic
    │   │   │                                      # - parseParts()
    │   │   │                                      # - parseStocks()
    │   │   │                                      # - CSV line parsing
    │   │   │
    │   │   ├── optimization.service.ts           # Optimization state
    │   │   │                                      # - RxJS observables
    │   │   │                                      # - Input validation
    │   │   │                                      # - Algorithm execution
    │   │   │
    │   │   └── visualization.service.ts          # Visualization rendering
    │   │                                           # - 2D canvas rendering
    │   │                                           # - 3D placeholder
    │   │                                           # - Sheet & part drawing
    │   │
    │   ├── 🧩 Components (components/)
    │   │   ├── index.ts                     # Component exports
    │   │   │
    │   │   ├── left-panel/                 # LEFT PANEL
    │   │   │   ├── left-panel.component.ts
    │   │   │   ├── left-panel.component.html    # Parts management
    │   │   │   │                                 # Stocks management
    │   │   │   │                                 # Settings controls
    │   │   │   └── left-panel.component.scss    # Panel styling
    │   │   │
    │   │   ├── viewport/                   # CENTER VIEWPORT
    │   │   │   ├── viewport.component.ts
    │   │   │   ├── viewport.component.html     # 3D/2D canvas
    │   │   │   │                               # Visualization area
    │   │   │   └── viewport.component.scss     # Canvas styling
    │   │   │
    │   │   └── right-panel/                # RIGHT PANEL
    │   │       ├── right-panel.component.ts
    │   │       ├── right-panel.component.html   # Optimization controls
    │   │       │                                 # Solutions list
    │   │       │                                 # Statistics display
    │   │       │                                 # Cuts visualization
    │   │       └── right-panel.component.scss   # Panel styling
    │   │
    │   └── 📄 Pages (pages/)
    │       └── [Placeholder for future pages]
    │
    ├── 📁 Assets (assets/)
    │   ├── sample-parts.csv           # Example parts data
    │   │                                # 8 sample furniture parts
    │   │
    │   └── sample-stocks.csv          # Example stocks data
    │                                    # 4 sample material types
    │
    └── 📁 Environments (environments/)
        ├── environment.ts              # Development configuration
        └── environment.prod.ts         # Production configuration
```

## File Count Summary

| Category | Count | Files |
|----------|-------|-------|
| **Configuration** | 5 | package.json, angular.json, tsconfig.json, tsconfig.app.json, .gitignore |
| **Documentation** | 4 | README.md, SETUP.md, SETUP_COMPLETE.md, Cut Optimiser App.md |
| **TypeScript** | 11 | *.ts files (components, services, models) |
| **Templates** | 4 | *.html files |
| **Styles** | 4 | *.scss files |
| **Entry Points** | 2 | index.html, main.ts |
| **Sample Data** | 2 | *.csv files |
| **Environment** | 2 | environment files |
| **TOTAL** | **34** | source files |

## Component Hierarchy

```
AppComponent (app.component.ts)
├── LeftPanelComponent
│   └── Parts & Stocks Management
│       ├── Parts Table (Add/Edit/Remove)
│       ├── Stocks Table (Add/Edit/Remove)
│       ├── CSV Upload
│       └── Settings Panel
│
├── ViewportComponent
│   └── 3D/2D Visualization
│       ├── Canvas (2D fallback)
│       ├── Three.js Scene (3D ready)
│       └── Zoom/Pan Controls
│
└── RightPanelComponent
    └── Solutions & Analysis
        ├── Optimization Controls
        ├── Solutions List
        ├── Statistics Display
        └── Cuts List
```

## Data Flow

```
User Input (Left Panel)
    ↓
[Parts/Stocks/Settings Data]
    ↓
OptimizationService (State Management)
    ↓
CSV Parser Service (File Import)
    ↓
Optimization Algorithm (Guillotine Packing)
    ↓
Visualization Service (Rendering)
    ↓
Solution Output (Right Panel & Viewport)
```

## Key Features by Location

### LeftPanelComponent
- ✅ Add/Edit/Remove Parts
- ✅ Add/Edit/Remove Stocks
- ✅ Upload CSV files
- ✅ Configure settings

### ViewportComponent
- ✅ 2D Canvas rendering
- ✅ 3D visualization (Three.js ready)
- ✅ Zoom controls
- ✅ Pan controls

### RightPanelComponent
- ✅ Start/Stop optimization
- ✅ View solutions
- ✅ Display statistics
- ✅ List and select cuts

## Import Paths (Configured Aliases)

```typescript
import { Part, Stock } from '@models/index';
import { CsvParserService, OptimizationService } from '@services/index';
import { LeftPanelComponent } from '@components/index';
```

## Dependencies Summary

### Production Dependencies
- @angular/core, @angular/common, @angular/forms, etc. (v18)
- ag-grid-angular & ag-grid-community (v32)
- dockview (v1.18) - Panel layout
- three (r128) - 3D graphics
- opencascade.js (v1.4) - CAD modeling
- rxjs (v7.8) - Reactive programming

### Dev Dependencies
- @angular/cli (v18)
- @angular/compiler-cli (v18)
- typescript (v5.4)
- And other build tools

---

**Last Updated**: March 9, 2026
**Project Status**: ✅ Setup Complete
**Ready for**: Development

