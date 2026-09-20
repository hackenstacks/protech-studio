import { useState, useRef, useCallback, useEffect } from 'react';

export const getFileName = (type) => {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `${type}_${date}_${time}.webm`;
};

export const formatDuration = (ms) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const MIME_PRIORITY = {
  audio: ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'],
  video: ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'],
};

const getBestMime = (type) => {
  const list = type === 'audio' ? MIME_PRIORITY.audio : MIME_PRIORITY.video;
  return list.find(m => MediaRecorder.isTypeSupported(m)) || '';
};

export function useMediaRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordings, setRecordings] = useState([]);
  const [error, setError] = useState(null);
  const [activeStream, setActiveStream] = useState(null);
  const [devices, setDevices] = useState({ audio: [], video: [] });
  const [isLoadingStream, setIsLoadingStream] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const pauseStartRef = useRef(null);
  const totalPausedRef = useRef(0);

  const loadDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        audio: all.filter(d => d.kind === 'audioinput'),
        video: all.filter(d => d.kind === 'videoinput'),
      });
    } catch (e) {
      console.warn('Device enumeration failed:', e);
    }
  }, []);

  useEffect(() => {
    loadDevices();
    navigator.mediaDevices?.addEventListener('devicechange', loadDevices);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', loadDevices);
  }, [loadDevices]);

  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setActiveStream(null);
  }, []);

  const startPreview = useCallback(async (mode, deviceIds = {}, quality = {}) => {
    setError(null);
    setIsLoadingStream(true);
    stopCurrentStream();

    try {
      let stream;

      if (mode === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always', frameRate: quality.frameRate || 30 },
          audio: true,
        });
      } else {
        const constraints = {};
        if (mode !== 'video') {
          constraints.audio = deviceIds.audio
            ? { deviceId: { exact: deviceIds.audio }, echoCancellation: true, noiseSuppression: true, sampleRate: quality.sampleRate || 48000 }
            : { echoCancellation: true, noiseSuppression: true };
        }
        if (mode !== 'audio') {
          constraints.video = deviceIds.video
            ? { deviceId: { exact: deviceIds.video }, width: quality.width, height: quality.height, frameRate: quality.frameRate || 30 }
            : { width: quality.width || 1280, height: quality.height || 720, frameRate: quality.frameRate || 30 };
        }
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      streamRef.current = stream;
      setActiveStream(stream);

      // Re-enumerate now that we have permission
      loadDevices();
      return stream;
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Permission denied — allow camera/mic access in browser settings'
        : err.name === 'NotFoundError'
          ? 'No camera/microphone found'
          : err.message;
      setError(msg);
      return null;
    } finally {
      setIsLoadingStream(false);
    }
  }, [stopCurrentStream, loadDevices]);

  const startRecording = useCallback((stream, mode, quality = {}) => {
    if (!stream || isRecording) return false;
    try {
      const isAudio = mode === 'audio';
      const mime = getBestMime(isAudio ? 'audio' : 'video');
      const options = { mimeType: mime };
      if (!isAudio && quality.videoBitrate) options.videoBitsPerSecond = quality.videoBitrate;
      if (quality.audioBitrate) options.audioBitsPerSecond = quality.audioBitrate;

      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      totalPausedRef.current = 0;
      pauseStartRef.current = null;

      mr.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || 'video/webm' });
        const url = URL.createObjectURL(blob);
        const recorded = Date.now() - startTimeRef.current - totalPausedRef.current;
        setRecordings(prev => [{
          id: Date.now(),
          name: getFileName(mode),
          url,
          blob,
          type: mode,
          size: blob.size,
          duration: recorded,
          mimeType: mime,
          date: new Date().toISOString(),
        }, ...prev]);
      };

      mr.start(500);
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        setDuration(Date.now() - startTimeRef.current - totalPausedRef.current);
      }, 200);

      return true;
    } catch (err) {
      setError('Recording failed: ' + err.message);
      return false;
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecording) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      if (pauseStartRef.current) {
        totalPausedRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = null;
      }
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      pauseStartRef.current = Date.now();
      setIsPaused(true);
    }
  }, [isRecording, isPaused]);

  const deleteRecording = useCallback((id) => {
    setRecordings(prev => {
      const rec = prev.find(r => r.id === id);
      if (rec) URL.revokeObjectURL(rec.url);
      return prev.filter(r => r.id !== id);
    });
  }, []);

  const downloadRecording = useCallback((rec) => {
    const a = document.createElement('a');
    a.href = rec.url;
    a.download = rec.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return {
    isRecording, isPaused, duration, recordings, error, activeStream, devices, isLoadingStream,
    startPreview, startRecording, stopRecording, pauseRecording,
    deleteRecording, downloadRecording, stopPreview: stopCurrentStream,
    formattedDuration: formatDuration(duration),
    setError,
  };
}
