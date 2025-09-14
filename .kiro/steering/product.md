# Product Overview

Simple Transcribe AI Tool is a Next.js web application that provides audio transcription services using OpenAI's GPT models. Users can upload audio files and receive cleaned, formatted transcripts.

## Core Features

- Single audio file upload with support for common formats (mp3, m4a, wav, ogg)
- Audio transcription using OpenAI's `gpt-4o-transcribe` model
- Intelligent text cleaning and formatting using GPT-5
- Dual provider support: Public OpenAI or Azure OpenAI
- Graceful fallback to original transcription if cleaning fails

## Key Value Propositions

- **Simplicity**: Minimal interface focused on core transcription functionality
- **Quality**: Two-stage processing (transcription + cleaning) for better output
- **Flexibility**: Supports both OpenAI and Azure OpenAI deployments
- **Reliability**: Fallback mechanisms ensure users always get results

## Target Use Cases

- Meeting transcription and cleanup
- Interview transcription
- Audio content processing
- Voice memo transcription
- Podcast/video content text extraction

The application prioritizes ease of use and reliable transcription quality over advanced features.