import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export function createDeepgramAssistantStream({ onListening, onTranscript, onError, onStatus }) {
  let socket = null;
  let mediaRecorder = null;
  let mediaStream = null;
  let manuallyStopped = false;
  let audioChunkCount = 0;
  let started = false;
  let microphoneActive = false;
  let microphoneStarting = false;

  async function start() {
    if (started || socket?.connected || socket?.active) return;
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('[VOICE ERROR] Login is required before Twin Assistant can listen.');
      onError?.('Login is required before Twin Assistant can listen.');
      return;
    }

    manuallyStopped = false;
    started = true;
    onStatus?.('connecting');
    socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 4,
      reconnectionDelay: 800,
    });

    const handleListening = (payload) => {
      console.log('[VOICE] Deepgram listening:', Boolean(payload.active));
      onStatus?.(payload.active ? 'listening' : 'connecting');
      onListening?.(Boolean(payload.active));
      if (payload.active) {
        void startMicrophone();
      }
    };

    const handleTranscript = (payload) => {
      console.log('[VOICE] Deepgram transcript payload:', payload);
      onTranscript?.(payload);
    };

    const handleError = (payload) => {
      console.error('[VOICE ERROR] Deepgram authentication/stream error:', payload.message || payload);
      onError?.(payload.message || 'Deepgram assistant error.');
    };

    socket.on('voice:connected', () => {
      console.log('[VOICE] Deepgram connected');
      onStatus?.('listening');
      onListening?.(true);
      void startMicrophone();
    });
    socket.on('voice:disconnected', () => {
      console.error('[VOICE ERROR] Deepgram disconnected');
      if (!manuallyStopped) {
        onStatus?.('connecting');
      }
    });
    socket.on('voice:listening', handleListening);
    socket.on('voice:transcript', handleTranscript);
    socket.on('voice:error', handleError);
    socket.on('connect_error', (error) => {
      console.error('[VOICE ERROR] Deepgram socket connection error:', error.message);
      onStatus?.('error');
      onError?.('Unable to connect to voice service.');
    });
    socket.on('disconnect', (reason) => {
      console.error('[VOICE ERROR] Deepgram websocket disconnect:', reason);
      if (!manuallyStopped) {
        onStatus?.('connecting');
        onListening?.(false);
      }
    });
    socket.on('connect', async () => {
      console.log('[VOICE] Deepgram socket connected');
      onStatus?.('connecting');
      socket.emit('voice:start');
    });
  }

  async function startMicrophone() {
    if (microphoneStarting || microphoneActive || (mediaRecorder && mediaRecorder.state !== 'inactive')) return;
    if (!socket?.connected) return;

    try {
      microphoneStarting = true;
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);

      mediaRecorder.ondataavailable = async (event) => {
        if (!microphoneActive || !event.data?.size || !socket?.connected) return;
        const audioChunk = await event.data.arrayBuffer();
        socket.emit('voice:audio', audioChunk);
        audioChunkCount += 1;
        if (audioChunkCount <= 20 || audioChunkCount % 20 === 0) {
          console.log('[VOICE] Deepgram audio chunk sent');
        }
      };

      mediaRecorder.start(250);
      microphoneActive = true;
      console.log('[VOICE] Microphone capture started');
      onStatus?.('listening');
      onListening?.(true);
    } catch (error) {
      console.error('[VOICE ERROR] Microphone permission denied/unavailable:', error.message);
      onStatus?.('error');
      onError?.(`Microphone access failed: ${error.message}`);
    } finally {
      microphoneStarting = false;
    }
  }

  function pauseMicrophone() {
    if (!microphoneActive && !mediaRecorder && !mediaStream) return;

    microphoneActive = false;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaRecorder = null;
    mediaStream = null;
    microphoneStarting = false;
    console.log('[VOICE] Microphone capture paused');
    onListening?.(false);
  }

  async function resumeMicrophone() {
    if (manuallyStopped || microphoneActive) return;
    if (!socket?.connected) {
      onStatus?.('connecting');
      socket?.connect?.();
      return;
    }
    await startMicrophone();
  }

  function stop() {
    manuallyStopped = true;
    started = false;
    pauseMicrophone();
    socket?.emit('voice:stop');
    socket?.disconnect();

    mediaRecorder = null;
    mediaStream = null;
    socket = null;
    microphoneActive = false;
    microphoneStarting = false;
    onStatus?.('offline');
    onListening?.(false);
  }

  return { start, stop, pauseMicrophone, resumeMicrophone };
}

function pickMimeType() {
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  return '';
}
