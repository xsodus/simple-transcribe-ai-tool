"use client";
import { useState } from 'react';

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTranscript('');
    if (!file) {
      setError('Please select an audio file first.');
      return;
    }
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to transcribe');
      }
      const data = await res.json();
      setTranscript(data.text || '');
    } catch (err: any) {
      setError(err.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Audio to Text</h1>
      <form onSubmit={handleSubmit} className="space-y-4 border rounded-md p-4 bg-white shadow">
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full"
        />
        <button
          disabled={!file || loading}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {loading ? 'Transcribing...' : 'Transcribe'}
        </button>
      </form>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {transcript && (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-medium mb-2">Transcript</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{transcript}</p>
        </div>
      )}
    </main>
  );
}
