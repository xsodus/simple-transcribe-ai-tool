"use client";
import { useState, useCallback, useEffect } from 'react';
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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFileSelect = useCallback((f: File | null) => {
    if (!f) {
      setFile(null);
      setFileName('');
      return;
    }
    setFile(f);
    setFileName(f.name);
    setError('');
    setTranscript('');
  }, [setFile, setFileName]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      if (!f.type.startsWith('audio/')) {
        setError('Unsupported file type. Please drop an audio file.');
        return;
      }
      handleFileSelect(f);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragActive) setIsDragActive(true);
  }, [isDragActive]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only deactivate if leaving the drop zone (not entering children)
    if ((e.target as HTMLElement).id === 'drop-zone') {
      setIsDragActive(false);
    }
  }, []);

  // Reset copied state whenever transcript changes
  useEffect(() => {
    if (copied) setCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  const handleCopyTranscript = useCallback(async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      // Fallback: create a temporary textarea (in very old browsers)
      try {
        const ta = document.createElement('textarea');
        ta.value = transcript;
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '0';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        // Swallow silently; not critical functionality
      }
    }
  }, [transcript]);

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
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                />
                <Stack spacing={2}>
                  <Paper
                    id="drop-zone"
                    variant="outlined"
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('audio-upload')?.click()}
                    sx={{
                      p: 4,
                      textAlign: 'center',
                      borderStyle: 'dashed',
                      cursor: 'pointer',
                      transition: 'background-color .15s, border-color .15s',
                      outline: 'none',
                      borderColor: isDragActive ? 'primary.main' : 'divider',
                      backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                    aria-label="Drag and drop audio file or click to select"
                  >
                    <Stack spacing={1} alignItems="center">
                      <UploadFileIcon color={isDragActive ? 'primary' : 'action'} fontSize="large" />
                      <Typography variant="subtitle1" fontWeight={500}>
                        {isDragActive ? 'Drop the file here' : 'Drag & drop an audio file here'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        or click to browse
                      </Typography>
                      {fileName && (
                        <Chip sx={{ mt: 1 }} color="primary" variant="outlined" label={fileName} onDelete={() => handleFileSelect(null)} />
                      )}
                    </Stack>
                  </Paper>
                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-start">
                    <label htmlFor="audio-upload">
                      <Button variant="contained" component="span" startIcon={<UploadFileIcon />}>Choose Audio</Button>
                    </label>
                    {fileName && (
                      <Tooltip title="Clear">
                        <IconButton color="secondary" onClick={() => handleFileSelect(null)}>
                          <RestartAltIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
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
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>Transcript</Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'} placement="top" arrow>
                  <span>
                    <IconButton
                      aria-label="Copy transcript to clipboard"
                      onClick={handleCopyTranscript}
                      size="small"
                      color={copied ? 'success' : 'default'}
                    >
                      {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
              <Paper
                variant="outlined"
                sx={{ p: 2, maxHeight: 360, overflowY: 'auto', background: 'linear-gradient(180deg,#fff,#f8f9fb)' }}
              >
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
