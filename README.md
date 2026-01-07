# R3E Adaptive AI v2

A React TypeScript application for configuring and monitoring adaptive AI parameters in RaceRoom Racing Experience.

## Features

- Interactive dashboard for AI parameter adjustment
- Real-time parameter visualization
- TypeScript support for type safety

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

Build for production:
```bash
npm run build
```

### Preview

Preview the production build:
```bash
npm run preview
```

## Project Structure

- `src/App.tsx` - Main application component
- `src/components/AIDashboard.tsx` - AI parameters dashboard
- `src/main.tsx` - Application entry point

## Technologies Used

- React 18
- TypeScript
- Vite
- ESLint
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
