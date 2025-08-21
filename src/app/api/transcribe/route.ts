import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60; // seconds (Vercel edge note; adjust as needed)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server missing OPENAI_API_KEY' }, { status: 500 });
    }
    const client = new OpenAI({ apiKey });

    // Model name per user request: gpt-4o-transcribe
    const transcription = await client.audio.transcriptions.create({
      file,
      model: 'gpt-4o-transcribe',
      // Optionally: language: 'en'
      // temperature: 0
    } as any);

    const text = (transcription as any).text || JSON.stringify(transcription);

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error('Transcription error', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
