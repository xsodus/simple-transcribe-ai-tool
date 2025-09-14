# Technology Stack

## Framework & Runtime
- **Next.js 14** with App Router architecture
- **TypeScript 5.5.4** for type safety
- **React 18.3.1** for UI components
- **Node.js 20.11.1+** runtime requirement

## Key Dependencies
- **OpenAI SDK 4.55.0** - Official client for OpenAI/Azure OpenAI APIs
- **Material-UI (MUI) 5.15.20** - Component library with Emotion styling
- **Axios 1.11.0** - HTTP client for API requests

## Development Tools
- **Jest 30.1.3** with ts-jest for testing
- **ESLint** with Next.js configuration
- **TypeScript** with strict mode enabled

## Build System & Commands

### Development
```bash
npm run dev          # Start development server on localhost:3000
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # Run ESLint checks
```

### Testing
```bash
npm test             # Run Jest test suite
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage reports
```

## Configuration Notes
- Uses App Router with `src/app` directory structure
- TypeScript path mapping: `@/*` maps to `src/*`
- Jest configured for Node.js environment with ts-jest preset
- Coverage collection excludes test files and React components
- Maximum API route duration: 60 seconds (configurable for deployment platform)

## Environment Variables
Supports dual OpenAI provider configuration - Azure OpenAI takes precedence when all required vars are present, otherwise falls back to public OpenAI.