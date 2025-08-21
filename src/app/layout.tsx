import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Simple Transcribe AI Tool',
  description: 'Upload an audio file and get transcription using GPT-4o-transcribe.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
