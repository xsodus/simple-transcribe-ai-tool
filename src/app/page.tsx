"use client";
import { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  LinearProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Stack,
  TextField,
  Chip
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

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
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4 }}>
        <Stack spacing={4}>
          <Box>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Audio to Text
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Upload an audio file (mp3, wav, m4a, etc.) and get an instant AI transcription.
            </Typography>
          </Box>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={3}>
              <Box>
                <input
                  id="audio-upload"
                  hidden
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                    setFileName(f ? f.name : '');
                  }}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <label htmlFor="audio-upload">
                    <Button variant="contained" component="span" startIcon={<UploadFileIcon />}>Choose Audio</Button>
                  </label>
                  {fileName && <Chip color="primary" variant="outlined" label={fileName} onDelete={() => { setFile(null); setFileName(''); }} />}
                  {fileName && (
                    <Tooltip title="Clear">
                      <IconButton color="secondary" onClick={() => { setFile(null); setFileName(''); setTranscript(''); setError(''); }}>
                        <RestartAltIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  type="submit"
                  disabled={!file || loading}
                  variant="contained"
                  size="large"
                >
                  {loading ? 'Transcribing…' : 'Transcribe'}
                </Button>
              </Stack>
              {loading && <LinearProgress />}
              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </Box>
          {transcript && (
            <Box>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>Transcript</Typography>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 360, overflowY: 'auto', background: 'linear-gradient(180deg,#fff,#f8f9fb)' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {transcript}
                </Typography>
              </Paper>
            </Box>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
