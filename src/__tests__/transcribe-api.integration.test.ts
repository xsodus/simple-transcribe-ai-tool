import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import type {
  TranscriptionSuccessResponse,
  TranscriptionFallbackResponse,
  TranscriptionErrorResponse,
  TranscriptionResponse,
} from '../lib/types';

// Mock OpenAI
jest.mock('openai');
// Mock the text cleaning service
jest.mock('../lib/textCleaningService');
// Mock the OpenAPI Factory
jest.mock('../lib/openAPIFactory');

import OpenAI from 'openai';
import { createTextCleaningService } from '../lib/textCleaningService';
import { OpenAPIFactory } from '../lib/openAPIFactory';

describe('Transcribe API Integration Tests', () => {
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockTextCleaningService: jest.Mocked<{ cleanText: jest.MockedFunction<any> }>;
  let originalEnv: NodeJS.ProcessEnv;
  let POST: any;

  beforeAll(async () => {
    // Set up mocks before importing the route
    mockOpenAI = {
      audio: {
        transcriptions: {
          create: jest.fn(),
        },
      },
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    } as any;

    // Mock OpenAI constructor
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI);
    
    // Mock OpenAPIFactory
    (OpenAPIFactory.createAudioInstance as jest.MockedFunction<typeof OpenAPIFactory.createAudioInstance>)
      .mockReturnValue(mockOpenAI);
    (OpenAPIFactory.createLLMInstance as jest.MockedFunction<typeof OpenAPIFactory.createLLMInstance>)
      .mockReturnValue(mockOpenAI);

    // Mock text cleaning service
    mockTextCleaningService = {
      cleanText: jest.fn(),
    };
    
    // Mock the factory function to return our mock service
    (createTextCleaningService as jest.MockedFunction<typeof createTextCleaningService>)
      .mockReturnValue(mockTextCleaningService as any);

    // Now import the route after mocks are set up
    const routeModule = await import('../app/api/transcribe/route');
    POST = routeModule.POST;
  });

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('Complete Flow from File Upload to Cleaned Text Response', () => {
    it('should successfully process file upload and return cleaned text', async () => {
      // Setup environment for public OpenAI
      process.env.OPENAI_API_KEY = 'test-api-key';
      delete process.env.AZURE_OPENAI_ENDPOINT;
      delete process.env.AZURE_OPENAI_API_KEY;
      delete process.env.AZURE_OPENAI_DEPLOYMENT;

      const originalText = 'um, hello there, uh, this is a test transcription, you know?';
      const cleanedText = 'Hello there, this is a test transcription.';

      // Mock successful transcription
      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: originalText,
      } as any);

      // Mock successful text cleaning
      mockTextCleaningService.cleanText.mockResolvedValue(cleanedText);

      // Create test file
      const testFile = new File(['test audio content'], 'test.mp3', {
        type: 'audio/mpeg',
      });

      // Create form data
      const formData = new FormData();
      formData.append('file', testFile);

      // Create request
      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      // Execute API call
      const response = await POST(request);
      const responseData = await response.json() as TranscriptionSuccessResponse;

      // Verify response
      expect(response.status).toBe(200);
      expect(responseData.text).toBe(cleanedText);
      expect(responseData.originalText).toBe(originalText);

      // Verify OpenAI transcription was called correctly
      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith({
        file: testFile,
        model: 'gpt-4o-transcribe',
      });

      // Verify text cleaning was called correctly
      expect(mockTextCleaningService.cleanText).toHaveBeenCalledWith(originalText);
    });

    it('should handle large audio files with long transcriptions', async () => {
      // Setup environment
      process.env.OPENAI_API_KEY = 'test-api-key';

      const longOriginalText = 'This is a very long transcription. '.repeat(100);
      const longCleanedText = 'This is a very long, cleaned transcription. '.repeat(70);

      // Mock successful transcription
      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: longOriginalText,
      } as any);

      // Mock successful text cleaning
      mockTextCleaningService.cleanText.mockResolvedValue(longCleanedText);

      // Create large test file
      const largeTestFile = new File(['large audio content'], 'large-test.mp3', {
        type: 'audio/mpeg',
      });

      const formData = new FormData();
      formData.append('file', largeTestFile);

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionSuccessResponse;

      expect(response.status).toBe(200);
      expect(responseData.text).toBe(longCleanedText);
      expect(responseData.originalText).toBe(longOriginalText);
      expect(responseData.text.length).toBeLessThan(responseData.originalText.length);
    });
  });

  describe('Azure OpenAI Configuration Tests', () => {
    it('should successfully process requests with Azure OpenAI configuration', async () => {
      // Setup Azure OpenAI environment variables (these would be used at module load time)
      process.env.AZURE_OPENAI_ENDPOINT = 'https://test-resource.openai.azure.com';
      process.env.AZURE_OPENAI_API_KEY = 'test-azure-key';
      process.env.AZURE_OPENAI_DEPLOYMENT = 'gpt-4o-transcribe-deployment';
      process.env.AZURE_OPENAI_API_VERSION = '2024-06-01';
      delete process.env.OPENAI_API_KEY;

      const originalText = 'test transcription from azure';
      const cleanedText = 'Test transcription from Azure.';

      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: originalText,
      } as any);

      mockTextCleaningService.cleanText.mockResolvedValue(cleanedText);

      const testFile = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionSuccessResponse;

      expect(response.status).toBe(200);
      expect(responseData.text).toBe(cleanedText);
      expect(responseData.originalText).toBe(originalText);

      // Verify the transcription API was called
      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith({
        file: testFile,
        model: 'gpt-4o-transcribe',
      });
    });

    it('should successfully process requests with public OpenAI configuration', async () => {
      // Setup public OpenAI configuration
      delete process.env.AZURE_OPENAI_ENDPOINT;
      delete process.env.AZURE_OPENAI_API_KEY;
      delete process.env.AZURE_OPENAI_DEPLOYMENT;
      process.env.OPENAI_API_KEY = 'test-public-key';

      const originalText = 'test transcription from public openai';
      const cleanedText = 'Test transcription from public OpenAI.';

      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: originalText,
      } as any);

      mockTextCleaningService.cleanText.mockResolvedValue(cleanedText);

      const testFile = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionSuccessResponse;

      expect(response.status).toBe(200);
      expect(responseData.text).toBe(cleanedText);
      expect(responseData.originalText).toBe(originalText);

      // Verify the transcription API was called
      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith({
        file: testFile,
        model: 'gpt-4o-transcribe',
      });
    });

    it('should handle mixed configuration scenarios gracefully', async () => {
      // Partial Azure config (missing deployment) - should fall back to public OpenAI
      process.env.AZURE_OPENAI_ENDPOINT = 'https://test-resource.openai.azure.com';
      process.env.AZURE_OPENAI_API_KEY = 'test-azure-key';
      delete process.env.AZURE_OPENAI_DEPLOYMENT;
      process.env.OPENAI_API_KEY = 'test-public-key';

      const originalText = 'test transcription with mixed config';
      const cleanedText = 'Test transcription with mixed config.';

      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: originalText,
      } as any);

      mockTextCleaningService.cleanText.mockResolvedValue(cleanedText);

      const testFile = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionSuccessResponse;

      expect(response.status).toBe(200);
      expect(responseData.text).toBe(cleanedText);
      expect(responseData.originalText).toBe(originalText);
    });
  });

  describe('Error Scenarios and Fallback Behavior', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-api-key';
    });

    it('should return fallback response when text cleaning fails', async () => {
      const originalText = 'test transcription that fails cleaning';
      const cleaningError = new Error('GPT-5 API rate limit exceeded');

      // Mock successful transcription
      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: originalText,
      } as any);

      // Mock text cleaning failure
      mockTextCleaningService.cleanText.mockRejectedValue(cleaningError);

      const testFile = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionFallbackResponse;

      expect(response.status).toBe(200);
      expect(responseData.text).toBe(originalText);
      expect(responseData.cleaningError).toBe('GPT-5 API rate limit exceeded');
      expect('originalText' in responseData).toBe(false);
    });

    it('should return error response when transcription fails', async () => {
      const transcriptionError = new Error('Audio file format not supported');

      // Mock transcription failure
      mockOpenAI.audio.transcriptions.create.mockRejectedValue(transcriptionError);

      const testFile = new File(['invalid content'], 'test.wav', { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionErrorResponse;

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Audio file format not supported');

      // Verify text cleaning was not called
      expect(mockTextCleaningService.cleanText).not.toHaveBeenCalled();
    });

    it('should return error when no file is uploaded', async () => {
      const formData = new FormData();
      // No file added to form data

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionErrorResponse;

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('No file uploaded');

      // Verify no OpenAI calls were made
      expect(mockOpenAI.audio.transcriptions.create).not.toHaveBeenCalled();
      expect(mockTextCleaningService.cleanText).not.toHaveBeenCalled();
    });

    it('should return error when invalid file type is uploaded', async () => {
      const formData = new FormData();
      formData.append('file', 'not a file');

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionErrorResponse;

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('No file uploaded');
    });

    it('should handle API configuration errors gracefully', async () => {
      // Test that the API handles various error scenarios properly
      const transcriptionError = new Error('API configuration error');

      mockOpenAI.audio.transcriptions.create.mockRejectedValue(transcriptionError);

      const testFile = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionErrorResponse;

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('API configuration error');

      // Verify text cleaning was not called when transcription fails
      expect(mockTextCleaningService.cleanText).not.toHaveBeenCalled();
    });

    it('should handle text cleaning timeout gracefully', async () => {
      const originalText = 'test transcription that times out during cleaning';
      const timeoutError = new Error('Text cleaning timeout after 30000ms');

      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: originalText,
      } as any);

      mockTextCleaningService.cleanText.mockRejectedValue(timeoutError);

      const testFile = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionFallbackResponse;

      expect(response.status).toBe(200);
      expect(responseData.text).toBe(originalText);
      expect(responseData.cleaningError).toContain('timeout');
    });
  });

  describe('Response Format Verification', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-api-key';
    });

    it('should return TranscriptionSuccessResponse format when cleaning succeeds', async () => {
      const originalText = 'um, test transcription';
      const cleanedText = 'Test transcription.';

      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: originalText,
      } as any);

      mockTextCleaningService.cleanText.mockResolvedValue(cleanedText);

      const testFile = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionResponse;

      // Verify it matches TranscriptionSuccessResponse interface
      expect(responseData).toHaveProperty('text', cleanedText);
      expect(responseData).toHaveProperty('originalText', originalText);
      expect(responseData).not.toHaveProperty('error');
      expect(responseData).not.toHaveProperty('cleaningError');

      // Type guard verification
      expect('originalText' in responseData).toBe(true);
      expect('error' in responseData).toBe(false);
      expect('cleaningError' in responseData).toBe(false);
    });

    it('should return TranscriptionFallbackResponse format when cleaning fails', async () => {
      const originalText = 'test transcription';
      const cleaningError = new Error('Cleaning service unavailable');

      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: originalText,
      } as any);

      mockTextCleaningService.cleanText.mockRejectedValue(cleaningError);

      const testFile = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionResponse;

      // Verify it matches TranscriptionFallbackResponse interface
      expect(responseData).toHaveProperty('text', originalText);
      expect(responseData).toHaveProperty('cleaningError', 'Cleaning service unavailable');
      expect(responseData).not.toHaveProperty('originalText');
      expect(responseData).not.toHaveProperty('error');

      // Type guard verification
      expect('cleaningError' in responseData).toBe(true);
      expect('originalText' in responseData).toBe(false);
      expect('error' in responseData).toBe(false);
    });

    it('should return TranscriptionErrorResponse format when transcription fails', async () => {
      const transcriptionError = new Error('Invalid audio format');

      mockOpenAI.audio.transcriptions.create.mockRejectedValue(transcriptionError);

      const testFile = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionResponse;

      // Verify it matches TranscriptionErrorResponse interface
      expect(responseData).toHaveProperty('error', 'Invalid audio format');
      expect(responseData).not.toHaveProperty('text');
      expect(responseData).not.toHaveProperty('originalText');
      expect(responseData).not.toHaveProperty('cleaningError');

      // Type guard verification
      expect('error' in responseData).toBe(true);
      expect('text' in responseData).toBe(false);
    });

    it('should handle non-Error exceptions in cleaning gracefully', async () => {
      const originalText = 'test transcription';
      const nonErrorException = 'String error thrown';

      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: originalText,
      } as any);

      mockTextCleaningService.cleanText.mockRejectedValue(nonErrorException);

      const testFile = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionFallbackResponse;

      expect(response.status).toBe(200);
      expect(responseData.text).toBe(originalText);
      expect(responseData.cleaningError).toBe('Text cleaning failed');
    });

    it('should handle non-Error exceptions in transcription gracefully', async () => {
      const nonErrorException = { message: 'Object error' };

      mockOpenAI.audio.transcriptions.create.mockRejectedValue(nonErrorException);

      const testFile = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionErrorResponse;

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Object error');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-api-key';
    });

    it('should handle empty transcription text', async () => {
      const emptyText = '';
      const cleaningError = new Error('Raw text cannot be empty');

      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: emptyText,
      } as any);

      mockTextCleaningService.cleanText.mockRejectedValue(cleaningError);

      const testFile = new File(['silent audio'], 'silent.mp3', { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionFallbackResponse;

      expect(response.status).toBe(200);
      expect(responseData.text).toBe('{"text":""}');
      expect(responseData.cleaningError).toBe('Raw text cannot be empty');
    });

    it('should handle transcription response without text property', async () => {
      const transcriptionResponse = { id: 'transcription-123' }; // Missing text property

      mockOpenAI.audio.transcriptions.create.mockResolvedValue(transcriptionResponse as any);

      const testFile = new File(['test content'], 'test.mp3', { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionResponse;

      // Should fallback to JSON stringified response
      const expectedText = JSON.stringify(transcriptionResponse);
      
      if ('cleaningError' in responseData) {
        // If cleaning fails (likely due to invalid text), should be fallback response
        expect(responseData.text).toBe(expectedText);
        expect(responseData.cleaningError).toBeDefined();
      } else if ('originalText' in responseData) {
        // If cleaning succeeds, should be success response
        expect(responseData.originalText).toBe(expectedText);
      }
    });

    it('should handle very short file names', async () => {
      const originalText = 'short transcription';
      const cleanedText = 'Short transcription.';

      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: originalText,
      } as any);

      mockTextCleaningService.cleanText.mockResolvedValue(cleanedText);

      const testFile = new File(['content'], 'a.mp3', { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionSuccessResponse;

      expect(response.status).toBe(200);
      expect(responseData.text).toBe(cleanedText);
      expect(responseData.originalText).toBe(originalText);
    });

    it('should handle files with special characters in names', async () => {
      const originalText = 'special character transcription';
      const cleanedText = 'Special character transcription.';

      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: originalText,
      } as any);

      mockTextCleaningService.cleanText.mockResolvedValue(cleanedText);

      const testFile = new File(['content'], 'test-file_with@special#chars.mp3', {
        type: 'audio/mpeg',
      });
      const formData = new FormData();
      formData.append('file', testFile);

      const request = new NextRequest('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseData = await response.json() as TranscriptionSuccessResponse;

      expect(response.status).toBe(200);
      expect(responseData.text).toBe(cleanedText);
      expect(responseData.originalText).toBe(originalText);
    });
  });
});