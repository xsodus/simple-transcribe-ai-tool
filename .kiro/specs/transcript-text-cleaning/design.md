# Design Document

## Overview

This design extends the existing transcription API to include automatic text cleaning using GPT-5. The feature will be integrated directly into the current `/api/transcribe` endpoint, maintaining the same request/response pattern while adding text cleaning as a post-processing step after transcription.

## Architecture

The text cleaning feature will follow the existing architecture pattern:

1. **Current Flow**: File Upload → Transcription (GPT-4o) → Return Raw Text
2. **Enhanced Flow**: File Upload → Transcription (GPT-4o) → Text Cleaning (GPT-5) → Return Cleaned Text

The implementation will reuse the existing OpenAI client configuration and error handling patterns to maintain consistency with the current codebase.

## Components and Interfaces

### Text Cleaning Service

A new service function that handles the GPT-5 text cleaning:

```typescript
interface TextCleaningService {
  cleanText(rawText: string, client: OpenAI): Promise<string>;
}
```

**Responsibilities:**
- Accept raw transcribed text and configured OpenAI client
- Send text to GPT-5 with appropriate cleaning prompt
- Return cleaned text or throw error for fallback handling

### Enhanced API Response

The existing response format will be updated to include the cleaned text:

```typescript
interface TranscriptionResponse {
  text: string; // cleaned text (or original if cleaning fails)
  originalText?: string; // original transcription (only if cleaning succeeded)
}
```

### GPT-5 Integration

The text cleaning will use the same client configuration as transcription:
- Reuse existing Azure OpenAI or public OpenAI configuration
- Use GPT-5 model for text cleaning operations
- Apply consistent error handling and timeout management

## Data Models

### Cleaning Prompt Template

A standardized prompt for GPT-5 text cleaning:

```typescript
const CLEANING_PROMPT = `
Please clean and improve the following transcribed text. Make it more readable by:
- Fixing grammar and punctuation
- Removing filler words (um, uh, like, you know)
- Removing repetitions and false starts
- Creating proper paragraph breaks
- Ensuring consistent capitalization

Preserve the original meaning and don't add any new information. Return only the cleaned text.

Text to clean:
`;
```

### Error Handling States

```typescript
enum CleaningResult {
  SUCCESS = 'success',
  TIMEOUT = 'timeout', 
  API_ERROR = 'api_error',
  FALLBACK = 'fallback'
}
```

## Error Handling

The text cleaning feature will implement graceful degradation:

1. **Cleaning Success**: Return cleaned text as primary response
2. **Cleaning Failure**: Log error and return original transcription
3. **Timeout**: Cancel cleaning request and return original transcription
4. **API Unavailable**: Skip cleaning and return original transcription

Error handling will follow the existing pattern in the transcription API, ensuring the service remains reliable even when text cleaning encounters issues.

## Testing Strategy

### Unit Tests
- Test text cleaning service with various input scenarios
- Test error handling and fallback mechanisms
- Test prompt formatting and response parsing

### Integration Tests  
- Test end-to-end flow from file upload to cleaned text response
- Test Azure OpenAI and public OpenAI configurations
- Test timeout and error scenarios

### Manual Testing
- Upload various audio files with different speech patterns
- Verify cleaning quality and meaning preservation
- Test with different accents, speaking speeds, and audio quality

The testing approach will leverage the existing Next.js testing patterns and can be implemented using Jest or similar testing frameworks already compatible with the project structure.