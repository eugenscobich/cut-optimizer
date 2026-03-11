# AGENTS.md

## Scope
- This repo is a single Angular 21 standalone app rooted in `src/`; there are no backend services or feature libraries yet.
- The current UI is a shell/prototype for a panel-cutting optimizer described in `Cut Optimiser App.md`; that spec is forward-looking, while the code today is mostly layout and menu scaffolding.

## Big picture
- App bootstrap is `src/main.ts` using `bootstrapApplication(App, appConfig)`; keep new work aligned with standalone Angular APIs rather than NgModules.
- `src/app/app.config.ts` only wires global error listeners and `provideRouter(routes)`.
- `src/app/app.routes.ts` is currently empty, so all visible behavior lives in the root standalone component `src/app/app.ts`.
- `src/app/app.ts` uses Angular signals + `viewChild()` references to drive overlay menus from `@angular/aria/menu` and `@angular/cdk/overlay`.
- `src/app/app.html` is the main integration point: a large inline template for the top menu system plus an `angular-split` 3-column workspace shell.
- The center/left/right panels are placeholders only (`Parts AG Grid`, `Stocks AG Grid`, `Solutions AG Grid`, `canvas`); AG Grid, Three.js, and opencascade.js are mentioned in the spec but are not installed yet.

## Key files to read before editing
- `src/app/app.ts`: root component imports, signals, menu refs.
- `src/app/app.html`: existing menu/overlay structure and split-pane layout.
- `src/app/app.css`: component-level menu styling.
- `Cut Optimiser App.md`: intended domain models (`Part`, `Stock`, `Settings`, `Solution`) and planned optimizer/viewport features.
- `angular.json`, `package.json`, `tsconfig.json`: build/test targets, strictness, and scripts.

## Verified workflows
- Install deps with `npm install`.
- Dev server: `npm start` (`ng serve`, default dev configuration).
- Build: `npm run build` — verified successful; outputs to `dist/cut-optimizer`.
- Watch build: `npm run watch`.
- Tests: `npm test -- --watch=false` runs Vitest through Angular's unit-test builder.
- Current test status is failing: `src/app/app.spec.ts` still expects the removed starter `<h1>` and does not match the real template.

## Project-specific conventions
- Use standalone Angular patterns (`imports: [...]` in components, `bootstrapApplication`, provider-based app config).
- TypeScript is strict (`strict`, `noImplicitReturns`, `strictTemplates`, `strictInjectionParameters`); prefer explicit, template-safe state.
- Formatting is 2 spaces via `.editorconfig`; TS should use single quotes; Prettier width is 100 and HTML uses the Angular parser.
- Prefer extending the existing root shell in place unless you are intentionally introducing routed features/components.
- Keep examples grounded in the current UI shell: menu interactions are implemented with overlay-connected `ng-template` blocks, not a separate service layer.

## Known caveats for agents
- `README.md` is mostly Angular CLI boilerplate; prefer the verified scripts in `package.json` and actual targets in `angular.json`.
- The current `angular-split` percentages in `src/app/app.html` trigger runtime warnings (`Percent areas must total 100%`) during tests; preserve or fix intentionally, but do not ignore the warning if touching layout.
- `src/styles.css` is effectively empty; most styling currently lives in `src/app/app.css`.
- If you add planned integrations from the spec (AG Grid / Three.js / opencascade.js / dockview), treat them as new dependencies and document the wiring explicitly because they are not present yet.

