/**
 * TypeScript interfaces for the enhanced transcription API responses
 */

/**
 * Base response interface for transcription API
 */
export interface BaseTranscriptionResponse {
  text: string;
}

/**
 * Successful transcription response with cleaned text
 */
export interface TranscriptionSuccessResponse extends BaseTranscriptionResponse {
  text: string; // cleaned text (primary response)
  originalText: string; // original transcription before cleaning
}

/**
 * Transcription response when cleaning fails (fallback)
 */
export interface TranscriptionFallbackResponse extends BaseTranscriptionResponse {
  text: string; // original transcription (fallback)
  cleaningError: string; // error message from cleaning failure
}

/**
 * Error response for transcription API
 */
export interface TranscriptionErrorResponse {
  error: string;
}

/**
 * Union type for all possible transcription API responses
 */
export type TranscriptionResponse = 
  | TranscriptionSuccessResponse 
  | TranscriptionFallbackResponse 
  | TranscriptionErrorResponse;

/**
 * Type guard to check if response is a success response
 */
export function isTranscriptionSuccessResponse(
  response: TranscriptionResponse
): response is TranscriptionSuccessResponse {
  return 'originalText' in response && !('error' in response) && !('cleaningError' in response);
}

/**
 * Type guard to check if response is a fallback response
 */
export function isTranscriptionFallbackResponse(
  response: TranscriptionResponse
): response is TranscriptionFallbackResponse {
  return 'cleaningError' in response && !('error' in response);
}

/**
 * Type guard to check if response is an error response
 */
export function isTranscriptionErrorResponse(
  response: TranscriptionResponse
): response is TranscriptionErrorResponse {
  return 'error' in response;
}

/**
 * Request interface for transcription API
 */
export interface TranscriptionRequest {
  file: File;
}

/**
 * Configuration for transcription processing
 */
export interface TranscriptionConfig {
  useAzure: boolean;
  model: string;
  timeout?: number;
  enableCleaning?: boolean;
}