# R3E Toolbox - Copilot Instructions

## Scope & Architecture
- React + TypeScript SPA with three tools: AI Management, Fix Qualy Times, Build Results Database.
- Core flow is client-only file I/O → parse → transform → export; no backend.
- Entry points: [src/components/AIManagement.tsx](../src/components/AIManagement.tsx), [src/components/FixQualyTimes.tsx](../src/components/FixQualyTimes.tsx), [src/components/BuildResultsDatabase.tsx](../src/components/BuildResultsDatabase.tsx).

## AI Management data flow (XML)
- Parse `aiadaptation.xml` via [src/utils/xmlParser.ts](../src/utils/xmlParser.ts) using `fast-xml-parser`.
- Normalize array/object duality with `toArray()` before iteration.
- Fit times in [src/utils/databaseProcessor.ts](../src/utils/databaseProcessor.ts) using `fitLinear()` from [src/utils/fitting.ts](../src/utils/fitting.ts); reject non‑monotonic curves and deviations over `CFG.testMaxTimePct`.
- Export via [src/utils/xmlBuilder.ts](../src/utils/xmlBuilder.ts); keep class/track ordering, mark fitted data with `numberOfSampledRaces = 0`.

## Fix Qualy Times flow (results files)
- Parser and patching logic live in [src/utils/raceResultParser.ts](../src/utils/raceResultParser.ts) and [src/components/FixQualyTimes.tsx](../src/components/FixQualyTimes.tsx).
- Validate race/qual session match, then patch `qualTimeMs` from qualification `bestLapTimeMs`.

## Build Results Database flow (standings)
- Parse result files with [src/utils/raceResultParser.ts](../src/utils/raceResultParser.ts).
- Generate HTML in [src/utils/htmlGenerator.ts](../src/utils/htmlGenerator.ts).
- Leaderboard assets are fetched/cached via [src/utils/leaderboardAssets.ts](../src/utils/leaderboardAssets.ts) and persisted with Zustand store in [src/store/leaderboardAssetsStore.ts](../src/store/leaderboardAssetsStore.ts).

## Project conventions
- Config lives in [src/config.ts](../src/config.ts); update config instead of hardcoding thresholds.
- Types are centralized in [src/types.ts](../src/types.ts) (keep interfaces in sync when changing parsers or generators).
- Time formatting: keep 4-decimal precision and trim trailing zeros via `formatNumber()`.

## Build & dev
- `npm run dev` (Vite), `npm run build`, `npm run lint`, `npm run preview` from [package.json](../package.json).

## Integration points
- Game metadata file: [r3e-data.json](../r3e-data.json) (IDs must match XML and result files).
- Asset cache uses localStorage via Zustand persist; use the store `clearAssets()` path when changing cache behavior.