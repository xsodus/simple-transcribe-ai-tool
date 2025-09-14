import OpenAI from "openai";
import { OpenAPIFactory } from "./openAPIFactory";

/**
 * Interface for the text cleaning service
 */
export interface TextCleaningService {
  cleanText(rawText: string): Promise<string>;
}

/**
 * Result of text cleaning operation
 */
export enum CleaningResult {
  SUCCESS = "success",
  TIMEOUT = "timeout",
  API_ERROR = "api_error",
  FALLBACK = "fallback",
}

/**
 * Configuration options for text cleaning
 */
export interface TextCleaningOptions {
  timeout?: number; // timeout in milliseconds, default 30000
  maxRetries?: number; // max retry attempts, default 1
}

/**
 * Response from text cleaning operation
 */
export interface TextCleaningResponse {
  cleanedText: string;
  result: CleaningResult;
  originalText?: string;
  error?: string;
}

/**
 * Standardized prompt template for GPT-5 text cleaning
 */
const CLEANING_PROMPT = `Please clean and improve the following transcribed text. Make it more readable by:
- Fixing grammar and punctuation
- Removing filler words (um, uh, like, you know)
- Removing repetitions and false starts
- Creating proper paragraph breaks
- Ensuring consistent capitalization

Preserve the original meaning and don't add any new information. Return only the cleaned text.

Text to clean:
`;

/**
 * Text cleaning service implementation
 */
export class TextCleaningServiceImpl implements TextCleaningService {
  private readonly client: OpenAI;
  private readonly options: Required<TextCleaningOptions>;

  constructor(client: OpenAI, options: TextCleaningOptions = {}) {
    this.client = client;
    this.options = {
      timeout: options.timeout ?? 30000,
      maxRetries: options.maxRetries ?? 1,
    };
  }

  /**
   * Clean the provided raw text using GPT-5
   * @param rawText - The raw transcribed text to clean
   * @param client - Configured OpenAI client instance
   * @returns Promise resolving to cleaned text
   * @throws Error if cleaning fails and no fallback is desired
   */
  async cleanText(rawText: string): Promise<string> {
    if (!rawText || rawText.trim().length === 0) {
      const error = new Error("Raw text cannot be empty");
      console.error("Text cleaning validation failed:", error.message);
      throw error;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        console.log(
          `Text cleaning attempt ${attempt + 1}/${this.options.maxRetries + 1}`
        );
        const cleanedText = await this.performCleaning(rawText, this.client);
        if (attempt > 0) {
          console.log(
            `Text cleaning succeeded on retry attempt ${attempt + 1}`
          );
        }
        return cleanedText;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(
          `Text cleaning attempt ${attempt + 1} failed:`,
          lastError.message
        );

        if (attempt < this.options.maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000;
          console.log(`Retrying text cleaning in ${delayMs}ms...`);
          // Wait before retry (exponential backoff)
          await this.delay(delayMs);
        }
      }
    }

    console.error(
      "Text cleaning failed after all retry attempts:",
      lastError?.message
    );
    throw (
      lastError || new Error("Text cleaning failed after all retry attempts")
    );
  }

  /**
   * Clean text with detailed response including result status
   * @param rawText - The raw transcribed text to clean
   * @param client - Configured OpenAI client instance
   * @returns Promise resolving to detailed cleaning response
   */
  async cleanTextWithDetails(rawText: string): Promise<TextCleaningResponse> {
    try {
      const cleanedText = await this.cleanText(rawText);
      console.log("Text cleaning completed successfully");
      return {
        cleanedText,
        result: CleaningResult.SUCCESS,
        originalText: rawText,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Determine the type of error for appropriate result status
      let result = CleaningResult.API_ERROR;
      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("TIMEOUT")
      ) {
        result = CleaningResult.TIMEOUT;
        console.error("Text cleaning failed due to timeout:", errorMessage);
      } else {
        console.error("Text cleaning failed with API error:", errorMessage);
      }

      // Log fallback behavior
      console.warn(
        "Falling back to original transcription text due to cleaning failure"
      );

      return {
        cleanedText: rawText, // fallback to original text
        result,
        originalText: rawText,
        error: errorMessage,
      };
    }
  }

  /**
   * Perform the actual text cleaning operation
   * @private
   */
  private async performCleaning(
    rawText: string,
    client: OpenAI
  ): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(
        `Text cleaning timeout triggered after ${this.options.timeout}ms`
      );
      controller.abort();
    }, this.options.timeout);

    try {
      console.log("Sending text cleaning request to GPT-5...");
      const response = await client.chat.completions.create(
        {
          model: "gpt-5", // Use GPT-5 for text cleaning as specified in requirements
          messages: [
            {
              role: "user",
              content: `${CLEANING_PROMPT}\n\n${rawText}`,
            },
          ],
          temperature: 0.1, // Low temperature for consistent cleaning
          max_tokens: Math.max(1000, rawText.length * 2), // Ensure enough tokens for response
        },
        {
          signal: controller.signal,
        }
      );

      const cleanedText = response.choices[0]?.message?.content?.trim();

      if (!cleanedText) {
        const error = new Error("No cleaned text received from GPT-5");
        console.error("GPT-5 response parsing failed:", error.message);
        throw error;
      }

      console.log("GPT-5 text cleaning request completed successfully");
      return cleanedText;
    } catch (error) {
      if (controller.signal.aborted) {
        const timeoutError = new Error(
          `Text cleaning timeout after ${this.options.timeout}ms`
        );
        console.error(
          "Text cleaning operation timed out:",
          timeoutError.message
        );
        throw timeoutError;
      }

      // Log the specific API error
      if (error instanceof Error) {
        console.error("OpenAI API error during text cleaning:", error.message);
      } else {
        console.error("Unknown error during text cleaning:", String(error));
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Utility method for delays
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create a text cleaning service instance
 */
export function createTextCleaningService(
  options?: TextCleaningOptions
): TextCleaningService {
  const client = OpenAPIFactory.createLLMInstance();
  return new TextCleaningServiceImpl(client, options);
}


