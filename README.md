# Simple Transcribe AI Tool

Next.js 14 (App Router + TypeScript) application that lets you upload a single audio file and returns a transcript using OpenAI's `gpt-4o-transcribe` model.

## Features

- Single audio file upload (`audio/*`)
- Backend API route (`/api/transcribe`) calls OpenAI
- Uses official `openai` Node SDK
- Minimal styling – easy to extend (no CSS framework dependency)

## Prerequisites

- Node.js 20.11.1+ (or 20+ recommended)
- An OpenAI API key with access to the transcription model

## Setup

1. Install dependencies:
	```bash
	npm install
	# or: pnpm install / yarn install
	```
2. Copy the environment file and add your key:
	```bash
	cp .env.example .env.local
	```
	Edit `.env.local`:
	```bash
	OPENAI_API_KEY=sk-your-real-key
	```
3. Run the dev server:
	```bash
	npm run dev
	```
4. Open http://localhost:3000

## Usage

1. Choose an audio file (e.g. `.mp3`, `.m4a`, `.wav`, `.ogg`).
2. Click **Transcribe**.
3. Wait for the server to process and display the transcript.

## Notes

- The API route is implemented in `src/app/api/transcribe/route.ts`.
- Increase `maxDuration` or adjust deployment platform settings if your audio files are long.
- Add file size/type validation as needed for production.

## Extending

Ideas to extend this project:

- Add language selection
- Support streaming partial transcripts
- Persist transcripts to a database
- Add authentication

## License

MIT
