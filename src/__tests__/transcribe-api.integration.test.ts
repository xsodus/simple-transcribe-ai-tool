import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/transcribe/route';
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

import OpenAI from 'openai';
import { textCleaningService } from '../lib/textCleaningService';

describe('Transcribe API Integration Tests', () => {
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockTextCleaningService: jest.Mocked<typeof textCleaningService>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };

    // Create mock OpenAI instance
    mockOpenAI = {
      audio: {
        transcriptions: {
          create: jest.fn(),
        },
      },
    } as any;

    // Mock OpenAI constructor
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI);

    // Mock text cleaning service
    mockTextCleaningService = textCleaningService as jest.Mocked<typeof textCleaningService>;
    mockTextCleaningService.cleanText = jest.fn();

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
      expect(mockTextCleaningService.cleanText).toHaveBeenCalledWith(
        originalText,
        mockOpenAI
      );
    });

    it('should handle large audio files with long transcriptions', async () => {
      // Setup environment
      process.env.OPENAI_API_KEY = 'test-api-key';

      const longOriginalText = 'This is a very long transcription. '.repeat(100);
      const longCleanedText = 'This is a very long, cleaned transcription. '.repeat(80);

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
    it('should use Azure OpenAI when properly configured', async () => {
      // Setup Azure OpenAI environment
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

      // Verify Azure OpenAI client was created with correct configuration
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'test-azure-key',
        baseURL: 'https://test-resource.openai.azure.com/openai/deployments/gpt-4o-transcribe-deployment',
        defaultQuery: { 'api-version': '2024-06-01' },
        defaultHeaders: { 'api-key': 'test-azure-key' },
      });
    });

    it('should use public OpenAI when Azure config is incomplete', async () => {
      // Partial Azure config (missing deployment)
      process.env.AZURE_OPENAI_ENDPOINT = 'https://test-resource.openai.azure.com';
      process.env.AZURE_OPENAI_API_KEY = 'test-azure-key';
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

      // Verify public OpenAI client was created
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'test-public-key',
      });
    });

    it('should use default API version when not specified for Azure', async () => {
      // Azure config without API version
      process.env.AZURE_OPENAI_ENDPOINT = 'https://test-resource.openai.azure.com';
      process.env.AZURE_OPENAI_API_KEY = 'test-azure-key';
      process.env.AZURE_OPENAI_DEPLOYMENT = 'gpt-4o-transcribe-deployment';
      delete process.env.AZURE_OPENAI_API_VERSION;
      delete process.env.OPENAI_API_KEY;

      const originalText = 'test transcription';
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

      await POST(request);

      // Verify default API version was used
      expect(OpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultQuery: { 'api-version': '2024-06-01' },
        })
      );
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

    it('should return error when API keys are missing', async () => {
      // Remove all API keys
      delete process.env.OPENAI_API_KEY;
      delete process.env.AZURE_OPENAI_ENDPOINT;
      delete process.env.AZURE_OPENAI_API_KEY;
      delete process.env.AZURE_OPENAI_DEPLOYMENT;

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
      expect(responseData.error).toBe('Server missing OPENAI_API_KEY or Azure OpenAI env vars');
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
      expect(responseData.error).toBe('Server error');
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
      expect(responseData.text).toBe(emptyText);
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