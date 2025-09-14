import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import OpenAI from 'openai';
import {
  TextCleaningServiceImpl,
  createTextCleaningService,
  textCleaningService,
  CleaningResult,
  type TextCleaningService,
  type TextCleaningOptions,
  type TextCleaningResponse,
} from '../lib/textCleaningService';

// Mock OpenAI
jest.mock('openai');

describe('TextCleaningService', () => {
  let mockOpenAI: jest.Mocked<OpenAI>;
  let service: TextCleaningService;

  beforeEach(() => {
    // Create a mock OpenAI instance
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    } as any;

    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset console mocks
    (console.log as jest.Mock).mockClear();
    (console.warn as jest.Mock).mockClear();
    (console.error as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Factory Functions', () => {
    it('should create service instance with createTextCleaningService', () => {
      const service = createTextCleaningService();
      expect(service).toBeInstanceOf(TextCleaningServiceImpl);
    });

    it('should create service with custom options', () => {
      const options: TextCleaningOptions = {
        timeout: 5000,
        maxRetries: 2,
      };
      const service = createTextCleaningService(options);
      expect(service).toBeInstanceOf(TextCleaningServiceImpl);
    });

    it('should provide default service instance', () => {
      expect(textCleaningService).toBeInstanceOf(TextCleaningServiceImpl);
    });
  });

  describe('Successful Text Cleaning Scenarios', () => {
    beforeEach(() => {
      service = new TextCleaningServiceImpl();
    });

    it('should successfully clean text with proper formatting', async () => {
      const rawText = 'um, hello there, uh, this is a test, you know?';
      const cleanedText = 'Hello there, this is a test.';

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: cleanedText,
            },
          },
        ],
      } as any);

      const result = await service.cleanText(rawText, mockOpenAI);

      expect(result).toBe(cleanedText);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5',
          messages: [
            {
              role: 'user',
              content: expect.stringContaining(rawText),
            },
          ],
          temperature: 0.1,
          max_tokens: expect.any(Number),
        }),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should handle text with repetitions and false starts', async () => {
      const rawText = 'I was, I was going to the, to the store yesterday';
      const cleanedText = 'I was going to the store yesterday.';

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: cleanedText,
            },
          },
        ],
      } as any);

      const result = await service.cleanText(rawText, mockOpenAI);
      expect(result).toBe(cleanedText);
    });

    it('should preserve meaning while fixing grammar', async () => {
      const rawText = 'the meeting was really good we discussed many things';
      const cleanedText = 'The meeting was really good. We discussed many things.';

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: cleanedText,
            },
          },
        ],
      } as any);

      const result = await service.cleanText(rawText, mockOpenAI);
      expect(result).toBe(cleanedText);
    });

    it('should handle long text with appropriate token calculation', async () => {
      const longText = 'a'.repeat(2000);
      const cleanedLongText = 'A long text that has been cleaned.';

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: cleanedLongText,
            },
          },
        ],
      } as any);

      await service.cleanText(longText, mockOpenAI);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: Math.max(1000, longText.length * 2),
        }),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling and Fallback Mechanisms', () => {
    beforeEach(() => {
      service = new TextCleaningServiceImpl();
    });

    it('should throw error for empty text input', async () => {
      await expect(service.cleanText('', mockOpenAI)).rejects.toThrow(
        'Raw text cannot be empty'
      );
      await expect(service.cleanText('   ', mockOpenAI)).rejects.toThrow(
        'Raw text cannot be empty'
      );
    });

    it('should handle OpenAI API errors', async () => {
      const rawText = 'test text';
      const apiError = new Error('API rate limit exceeded');

      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      await expect(service.cleanText(rawText, mockOpenAI)).rejects.toThrow(
        'API rate limit exceeded'
      );
    });

    it('should handle timeout errors by checking AbortController usage', async () => {
      const rawText = 'test text';
      const service = new TextCleaningServiceImpl({ timeout: 100 });

      // Verify that AbortController is used in the API call
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'cleaned text' } }],
      } as any);

      await service.cleanText(rawText, mockOpenAI);

      // Verify that the API call includes an AbortSignal
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should handle empty response from GPT-5', async () => {
      const rawText = 'test text';
      const service = new TextCleaningServiceImpl({ timeout: 30000 }); // Use long timeout

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: '',
            },
          },
        ],
      } as any);

      await expect(service.cleanText(rawText, mockOpenAI)).rejects.toThrow(
        'No cleaned text received from GPT-5'
      );
    });

    it('should handle missing response content', async () => {
      const rawText = 'test text';
      const service = new TextCleaningServiceImpl({ timeout: 30000 }); // Use long timeout

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {},
          },
        ],
      } as any);

      await expect(service.cleanText(rawText, mockOpenAI)).rejects.toThrow(
        'No cleaned text received from GPT-5'
      );
    });

    it('should retry on failure with exponential backoff', async () => {
      const rawText = 'test text';
      const service = new TextCleaningServiceImpl({ maxRetries: 2 });
      const apiError = new Error('Temporary API error');

      // Mock first two calls to fail, third to succeed
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(apiError)
        .mockRejectedValueOnce(apiError)
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'cleaned text' } }],
        } as any);

      // Mock delay to speed up test
      const originalDelay = (service as any).delay;
      (service as any).delay = jest.fn().mockResolvedValue(undefined);

      const result = await service.cleanText(rawText, mockOpenAI);

      expect(result).toBe('cleaned text');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
      expect((service as any).delay).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries exceeded', async () => {
      const rawText = 'test text';
      const service = new TextCleaningServiceImpl({ maxRetries: 1, timeout: 30000 }); // Use long timeout
      const apiError = new Error('Persistent API error');

      // Mock delay to speed up test
      (service as any).delay = jest.fn().mockResolvedValue(undefined);

      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      await expect(service.cleanText(rawText, mockOpenAI)).rejects.toThrow(
        'Persistent API error'
      );
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('Detailed Response with cleanTextWithDetails', () => {
    beforeEach(() => {
      service = new TextCleaningServiceImpl();
    });

    it('should return success response with cleaned text', async () => {
      const rawText = 'um, test text';
      const cleanedText = 'Test text.';

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: cleanedText } }],
      } as any);

      const response = await (service as TextCleaningServiceImpl).cleanTextWithDetails(
        rawText,
        mockOpenAI
      );

      expect(response).toEqual({
        cleanedText,
        result: CleaningResult.SUCCESS,
        originalText: rawText,
      });
    });

    it('should return fallback response on API error', async () => {
      const rawText = 'test text';
      const service = new TextCleaningServiceImpl({ timeout: 30000 }); // Use long timeout
      const apiError = new Error('API error occurred');

      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      const response = await (service as TextCleaningServiceImpl).cleanTextWithDetails(
        rawText,
        mockOpenAI
      );

      expect(response).toEqual({
        cleanedText: rawText, // fallback to original
        result: CleaningResult.API_ERROR,
        originalText: rawText,
        error: 'API error occurred',
      });
    });

    it('should return timeout response when timeout error message is detected', async () => {
      const rawText = 'test text';
      const service = new TextCleaningServiceImpl({ timeout: 100 });

      // Mock an error that looks like a timeout error
      const timeoutError = new Error('Text cleaning timeout after 100ms');
      mockOpenAI.chat.completions.create.mockRejectedValue(timeoutError);

      const response = await (service as TextCleaningServiceImpl).cleanTextWithDetails(
        rawText,
        mockOpenAI
      );

      expect(response.result).toBe(CleaningResult.TIMEOUT);
      expect(response.cleanedText).toBe(rawText);
      expect(response.error).toContain('timeout');
    });
  });

  describe('Prompt Formatting and Response Parsing', () => {
    beforeEach(() => {
      service = new TextCleaningServiceImpl();
    });

    it('should format prompt correctly with cleaning instructions', async () => {
      const rawText = 'test input text';
      const expectedPromptStart = 'Please clean and improve the following transcribed text';

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'cleaned text' } }],
      } as any);

      await service.cleanText(rawText, mockOpenAI);

      const callArgs = (mockOpenAI.chat.completions.create as jest.Mock).mock.calls[0][0];
      const promptContent = callArgs.messages[0].content;

      expect(promptContent).toContain(expectedPromptStart);
      expect(promptContent).toContain('Fixing grammar and punctuation');
      expect(promptContent).toContain('Removing filler words');
      expect(promptContent).toContain('Creating proper paragraph breaks');
      expect(promptContent).toContain(rawText);
    });

    it('should parse response content correctly', async () => {
      const rawText = 'test text';
      const cleanedText = '  Cleaned and formatted text.  ';
      const expectedTrimmed = 'Cleaned and formatted text.';

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: cleanedText } }],
      } as any);

      const result = await service.cleanText(rawText, mockOpenAI);

      expect(result).toBe(expectedTrimmed);
    });

    it('should use correct model and parameters', async () => {
      const rawText = 'test text';
      const service = new TextCleaningServiceImpl({ timeout: 30000 }); // Use long timeout

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'cleaned' } }],
      } as any);

      await service.cleanText(rawText, mockOpenAI);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5',
          temperature: 0.1,
          max_tokens: expect.any(Number),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.any(String),
            }),
          ]),
        }),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe('Configuration Options', () => {
    it('should use custom timeout option in configuration', () => {
      const customTimeout = 5000;
      const service = new TextCleaningServiceImpl({ timeout: customTimeout });
      const options = (service as any).options;

      expect(options.timeout).toBe(customTimeout);
    });

    it('should use custom maxRetries option', async () => {
      const customRetries = 3;
      const service = new TextCleaningServiceImpl({ maxRetries: customRetries });
      const rawText = 'test text';
      const apiError = new Error('API error');

      // Mock delay to speed up test
      (service as any).delay = jest.fn().mockResolvedValue(undefined);

      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      await expect(service.cleanText(rawText, mockOpenAI)).rejects.toThrow();
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(customRetries + 1);
    });

    it('should use default options when none provided', () => {
      const service = new TextCleaningServiceImpl();
      const options = (service as any).options;

      expect(options.timeout).toBe(30000);
      expect(options.maxRetries).toBe(1);
    });
  });
});