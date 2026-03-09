# Cut Optimizer - Panel Cutting Optimization Web Application

A modern, full-stack web application for optimizing panel cutting patterns using advanced algorithms and interactive 3D visualization.

## Features

- **Parts & Stocks Management**: Add, edit, and upload parts and stock materials via CSV
- **Advanced Optimization**: Multiple cutting algorithms (Guillotine, MinSheets, MinWaste, MinCutLength)
- **3D Visualization**: Interactive 3D preview of cutting layouts using Three.js
- **2D Preview**: 2D canvas preview of cutting patterns
- **Statistics**: Detailed statistics on material usage, waste, and cutting requirements
- **Cut Management**: View and analyze all cut lines with detailed metrics
- **Responsive UI**: Modern, intuitive interface with dockable panels

## Tech Stack

- **Frontend Framework**: Angular 18+
- **UI Components**: ag-grid, dockview
- **Visualization**: Three.js, opencascade.js
- **Language**: TypeScript
- **Styling**: SCSS
- **Build Tool**: Angular CLI

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── left-panel/          # Parts & stocks input panel
│   │   ├── right-panel/         # Solutions & statistics panel
│   │   └── viewport/            # 3D/2D visualization panel
│   ├── models/                  # TypeScript interfaces and types
│   ├── services/                # Business logic services
│   │   ├── csv-parser.service   # CSV parsing logic
│   │   ├── optimization.service # Optimization state management
│   │   └── visualization.service# Visualization rendering
│   ├── app.component.*          # Root component
│   └── pages/                   # Page components (future)
├── assets/                      # Static assets
├── index.html                   # HTML entry point
├── main.ts                      # Angular bootstrap
└── styles.scss                  # Global styles
```

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd cut-optimizer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:4200`

## Usage

### Adding Parts
1. Click "Add Part" to manually add parts, or "Upload CSV" to import from file
2. Edit dimensions, quantities, and settings for each part
3. Enable/disable parts as needed

### Adding Stocks
1. Click "Add Stock" to manually add stock materials, or "Upload CSV" to import
2. Set dimensions, quantities, and cut margins
3. Enable/disable specific stock types

### Running Optimization
1. Configure parts and stocks
2. Adjust optimization settings (kerf thickness, cut perimeters)
3. Click "Start Optimization" to begin
4. View results in the solutions list

### Viewing Results
- Select a solution to view statistics
- Inspect individual cuts and waste areas
- Use 3D viewport for detailed visualization

## CSV Format

### Parts CSV
```
label,length,width,quantity,enabled,ignore_direction,material
Door Frame,2100,900,4,true,false,Oak
Shelf,1200,300,8,true,false,Plywood
```

### Stocks CSV
```
label,length,width,thickness,quantity,enabled,ignore_direction,cut_top_size,cut_bottom_size,cut_left_size,cut_right_size
Plywood 18mm,2800,2070,18,50,true,false,0,0,0,0
MDF 16mm,3000,2500,16,30,true,false,10,10,10,10
```

## Configuration

### Settings
- **Kerf Thickness**: The thickness of the cutting blade (default: 3.2mm)
- **Default Stock Cut Perimeter**: Default trimming size around stock edges

## Development

### Build for Production
```bash
npm run build:prod
```

### Run Tests
```bash
npm test
```

### Lint Code
```bash
npm run lint
```

## API Services

### CsvParserService
- `parseParts(csvContent)`: Parse CSV into Part objects
- `parseStocks(csvContent)`: Parse CSV into Stock objects

### OptimizationService
- `startOptimization(algorithm)`: Execute optimization algorithm
- `stopOptimization()`: Stop ongoing optimization
- `updateParts(parts)`: Update parts list
- `updateStocks(stocks)`: Update stocks list
- `updateSettings(settings)`: Update optimization settings
- Observable streams for reactive updates

### VisualizationService
- `visualizeSolution(solution, canvas)`: Render 2D solution visualization
- `visualizeSolution3D(solution, container)`: Render 3D visualization (Three.js)

## Future Enhancements

- [ ] Advanced 3D visualization with opencascade.js
- [ ] Export solutions to PDF and CAD formats
- [ ] Multi-objective optimization algorithms
- [ ] Material database and pricing integration
- [ ] Historical solutions storage and comparison
- [ ] Real-time collaboration features
- [ ] Machine learning-based optimization
- [ ] Integration with CNC control systems

## License

MIT

## Support

For issues, questions, or suggestions, please open an issue on the repository.

