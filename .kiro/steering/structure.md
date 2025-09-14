# Project Structure

## Directory Organization

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── transcribe/    # Transcription endpoint
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Home page component
├── components/            # Reusable React components
│   └── AppThemeProvider.tsx
├── lib/                   # Shared utilities and services
│   ├── index.ts           # Library exports
│   ├── openAPIFactory.ts  # OpenAI client factory
│   ├── textCleaningService.ts # GPT-5 text cleaning
│   ├── theme.ts           # MUI theme configuration
│   └── types.ts           # TypeScript type definitions
└── __tests__/             # Test files
    ├── setup.ts           # Jest test setup
    ├── textCleaningService.test.ts
    └── transcribe-api.integration.test.ts
```

## Architectural Patterns

### API Layer
- **Single API Route**: `/api/transcribe` handles all transcription requests
- **Factory Pattern**: `OpenAPIFactory` manages OpenAI client instantiation
- **Service Layer**: `textCleaningService` encapsulates text processing logic

### Type Safety
- **Centralized Types**: All interfaces defined in `src/lib/types.ts`
- **Response Types**: Structured response interfaces with type guards
- **Error Handling**: Typed error responses with fallback mechanisms

### Testing Strategy
- **Unit Tests**: Service layer components (textCleaningService)
- **Integration Tests**: API route end-to-end testing
- **Coverage**: Excludes UI components, focuses on business logic

## File Naming Conventions
- **Components**: PascalCase (e.g., `AppThemeProvider.tsx`)
- **Services**: camelCase (e.g., `textCleaningService.ts`)
- **Types**: camelCase with `.ts` extension
- **Tests**: Match source file name with `.test.ts` suffix

## Import Patterns
- Use `@/` path alias for all internal imports
- Prefer named exports over default exports for utilities
- Group imports: external libraries first, then internal modules