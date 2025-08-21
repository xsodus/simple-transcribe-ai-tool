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

    // Public OpenAI key (fallback if Azure OpenAI not configured)
    const apiKey = process.env.OPENAI_API_KEY;

    // Azure OpenAI (Azure AI Foundry) environment variables
    // Expected:
    //  AZURE_OPENAI_ENDPOINT=https://<your-resource-name>.openai.azure.com
    //  AZURE_OPENAI_API_KEY=... (key for the Azure OpenAI resource)
    //  AZURE_OPENAI_DEPLOYMENT=gpt-4o-transcribe (deployment name you created)
    //  (optional) AZURE_OPENAI_API_VERSION=2024-06-01
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT; // deployment name (not the base model name)
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-06-01';

    const useAzure = !!(azureEndpoint && azureApiKey && azureDeployment);

    if (!useAzure && !apiKey) {
      return NextResponse.json({ error: 'Server missing OPENAI_API_KEY or Azure OpenAI env vars' }, { status: 500 });
    }

    // When using Azure OpenAI with the official openai SDK v4+, set baseURL to the deployment path and add api-version.
    const client = useAzure
      ? new OpenAI({
          apiKey: azureApiKey!,
          baseURL: `${azureEndpoint}/openai/deployments/${azureDeployment}`.replace(/\/$/, ''),
          defaultQuery: { 'api-version': azureApiVersion },
          // Azure still expects 'api-key' header; the SDK sends Authorization: Bearer by default, so we add explicit header.
          defaultHeaders: { 'api-key': azureApiKey! }
        })
      : new OpenAI({ apiKey: apiKey! });

    // Model name per user request: gpt-4o-transcribe
    const transcriptionParams: OpenAI.Audio.Transcriptions.TranscriptionCreateParams = {
      file,
      model: 'gpt-4o-transcribe',
      // Optionally: language: 'en',
      // temperature: 0,
    };
    const transcription = await client.audio.transcriptions.create(transcriptionParams);

    const text = (transcription as any).text || JSON.stringify(transcription);

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error('Transcription error', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
