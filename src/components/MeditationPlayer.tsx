'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import liff from '@line/liff';

export default function MeditationPlayer() {
  const audioUrl = process.env.NEXT_PUBLIC_MEDITATION_AUDIO_URL || '';
  const audioTitle = process.env.NEXT_PUBLIC_MEDITATION_AUDIO_TITLE || '誘導瞑想音声';
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log('MeditationPlayer: audioUrl =', audioUrl);

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      setError(null);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsLoading(false);
      setError('音声の読み込みに失敗しました');
      console.error('Audio load error:', audio.error);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = useCallback(() => {
    if (!audioUrl) return;
    const fullUrl = `${window.location.origin}${audioUrl}`;
    if (liff.isInClient()) {
      liff.openWindow({ url: fullUrl, external: true });
    } else {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `${audioTitle}.m4a`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [audioUrl, audioTitle]);

  return (
    <div className="meditation-player">
      <div className="meditation-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="10 8 16 12 10 16 10 8"></polygon>
        </svg>
      </div>

      <h2 className="meditation-title">{audioTitle}</h2>

      {isLoading && <p className="meditation-loading">音声を読み込み中...</p>}
      {error && <p className="meditation-loading" style={{ color: '#c44' }}>{error}</p>}

      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="meditation-controls">
        <span className="meditation-time">{formatTime(currentTime)}</span>

        <input
          type="range"
          className="meditation-seekbar"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          disabled={isLoading}
        />

        <span className="meditation-time">{formatTime(duration)}</span>
      </div>

      <button
        className="meditation-play-btn"
        onClick={togglePlay}
        disabled={isLoading}
      >
        {isPlaying ? (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        )}
      </button>

      <div className="meditation-actions">
        <button className="meditation-action-btn" onClick={handleDownload}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          ダウンロード
        </button>
      </div>
    </div>
  );
}
