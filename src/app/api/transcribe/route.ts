import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createTextCleaningService } from "@/lib/textCleaningService";
import type { 
  TranscriptionSuccessResponse, 
  TranscriptionFallbackResponse,
  TranscriptionErrorResponse 
} from "@/lib/types";
import { OpenAPIFactory } from '@/lib/openAPIFactory'

export const runtime = "nodejs";
export const maxDuration = 60; // seconds (Vercel edge note; adjust as needed)

const textCleaningService = createTextCleaningService()
const client = OpenAPIFactory.createAudioInstance()

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      const errorResponse: TranscriptionErrorResponse = { error: "No file uploaded" };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Model name per user request: gpt-4o-transcribe
    const transcriptionParams: OpenAI.Audio.Transcriptions.TranscriptionCreateParams =
      {
        file,
        model: "gpt-4o-transcribe",
        // Optionally: language: 'en',
        // temperature: 0,
      };
    const transcription = await client.audio.transcriptions.create(
      transcriptionParams
    );

    const originalText =
      (transcription as any).text || JSON.stringify(transcription);

    // Clean the transcribed text using GPT-5
    try {
      console.log("Starting text cleaning process...");
      const cleanedText = await textCleaningService.cleanText(
        originalText
      );

      console.log("Text cleaning completed successfully");
      const successResponse: TranscriptionSuccessResponse = {
        text: cleanedText,
        originalText: originalText,
      };
      return NextResponse.json(successResponse);
    } catch (cleaningError) {
      // Fallback to original text if cleaning fails
      console.warn(
        "Text cleaning failed, returning original text:",
        cleaningError instanceof Error ? cleaningError.message : "Unknown error"
      );
      const fallbackResponse: TranscriptionFallbackResponse = {
        text: originalText,
        cleaningError:
          cleaningError instanceof Error
            ? cleaningError.message
            : "Text cleaning failed",
      };
      return NextResponse.json(fallbackResponse);
    }
  } catch (err: any) {
    console.error("Transcription error", err);
    const errorResponse: TranscriptionErrorResponse = { 
      error: err.message || "Server error" 
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
