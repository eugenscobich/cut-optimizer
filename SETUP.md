# Project Setup Instructions

This document provides detailed setup instructions for the Cut Optimizer application.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js) or **yarn**
   - Verify npm: `npm --version`
   - Or install yarn: `npm install -g yarn`

3. **Git** (for version control)
   - Download from: https://git-scm.com/

## Installation Steps

### 1. Navigate to Project Directory

```bash
cd C:\Projects\MyProjects\cut-optimizer
```

### 2. Install Dependencies

Install all required npm packages:

```bash
npm install
```

Or if using yarn:

```bash
yarn install
```

This will install:
- Angular 18+ framework
- ag-grid components
- dockview layout manager
- Three.js for 3D visualization
- opencascade.js for advanced 3D operations
- TypeScript and build tools
- And all other required dependencies

### 3. Start Development Server

Run the Angular development server:

```bash
npm start
```

Or using Angular CLI directly:

```bash
ng serve --open
```

The application will automatically open at `http://localhost:4200`

### 4. Build for Production

To create an optimized production build:

```bash
npm run build:prod
```

Output will be in the `dist/cut-optimizer` directory.

## Project Structure Overview

```
cut-optimizer/
├── src/
│   ├── app/                           # Application source code
│   │   ├── components/                # Reusable UI components
│   │   │   ├── left-panel/           # Parts and stocks input panel
│   │   │   ├── viewport/             # 3D/2D visualization viewport
│   │   │   └── right-panel/          # Solutions and statistics panel
│   │   ├── models/                    # TypeScript interfaces and types
│   │   ├── services/                  # Business logic and utilities
│   │   │   ├── csv-parser.service.ts # CSV file parsing
│   │   │   ├── optimization.service.ts # Optimization logic
│   │   │   └── visualization.service.ts # Visualization rendering
│   │   ├── app.component.ts           # Root component
│   │   ├── app.component.html         # Root template
│   │   └── app.component.scss         # Root styles
│   ├── environments/                  # Environment-specific configs
│   ├── assets/                        # Static assets and sample data
│   ├── index.html                     # HTML entry point
│   ├── main.ts                        # Application bootstrap
│   └── styles.scss                    # Global styles
├── angular.json                       # Angular CLI configuration
├── tsconfig.json                      # TypeScript configuration
├── tsconfig.app.json                  # App-specific TS config
├── package.json                       # Dependencies and scripts
└── README.md                          # Project documentation
```

## Common Commands

### Development

```bash
# Start development server
npm start

# Run unit tests
npm test

# Lint code
npm run lint
```

### Production

```bash
# Build for production
npm run build:prod

# Serve production build locally (requires http-server)
npx http-server dist/cut-optimizer -p 8080
```

## Troubleshooting

### npm install fails

**Issue**: `npm install` command not found or fails
- **Solution**: Ensure Node.js is properly installed and added to PATH
- Restart your terminal/IDE after installing Node.js

### Port 4200 already in use

**Issue**: `ng serve` fails because port 4200 is already in use
- **Solution**: Use a different port: `ng serve --port 4300`

### Module not found errors

**Issue**: TypeScript complains about missing modules
- **Solution**: 
  - Delete `node_modules` folder and `package-lock.json`
  - Run `npm install` again
  - Clear Angular cache: `ng cache clean`

### Build fails with SCSS errors

**Issue**: Compilation fails due to SCSS syntax errors
- **Solution**: 
  - Check SCSS syntax in `.scss` files
  - Ensure all imports use correct paths
  - Check for circular imports

## Next Steps

After installation, you can:

1. **Import Sample Data**
   - Use the "Upload CSV" buttons to import sample parts and stocks
   - Sample files are available in `src/assets/`

2. **Run Optimization**
   - Click "Start Optimization" to test the optimization algorithm
   - View results in the right panel

3. **Explore the Codebase**
   - Review the component structure in `src/app/components/`
   - Check the data models in `src/app/models/`
   - Examine services in `src/app/services/`

4. **Customize**
   - Modify settings in left panel
   - Add custom CSS in `src/styles.scss`
   - Extend services with additional functionality

## Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Edit files in `src/app/`
   - Changes hot-reload automatically in dev server

3. **Test Changes**
   ```bash
   npm test
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

5. **Push to Repository**
   ```bash
   git push origin feature/your-feature-name
   ```

## Support and Resources

- **Angular Documentation**: https://angular.io/docs
- **ag-grid Documentation**: https://www.ag-grid.com/documentation/
- **dockview Documentation**: https://www.npmjs.com/package/dockview
- **Three.js Documentation**: https://threejs.org/docs/

## Performance Tips

- Use `ng serve --open` for faster builds during development
- Enable Angular DevTools browser extension for debugging
- Use production build (`npm run build:prod`) for final deployment
- Monitor bundle size with `ng build --stats-json`

