'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import liff from '@line/liff';

interface MeditationAudio {
  id: string;
  title: string;
  audioUrl: string;
  downloadUrl: string;
}

export default function MeditationPlayer() {
  const audioTitle = process.env.NEXT_PUBLIC_MEDITATION_AUDIO_TITLE || '誘導瞑想音声';
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audios, setAudios] = useState<MeditationAudio[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch('/api/meditation-audios')
      .then((res) => res.json())
      .then((data) => {
        if (data.audios && data.audios.length > 0) {
          setAudios(data.audios);
        }
      })
      .catch(() => {});
  }, []);

  const currentAudio = audios[currentIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsLoading(true);
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

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
  }, [currentIndex, audios]);

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
    if (!currentAudio?.downloadUrl) return;
    if (liff.isInClient()) {
      liff.openWindow({ url: currentAudio.downloadUrl, external: true });
    } else {
      window.open(currentAudio.downloadUrl, '_blank');
    }
  }, [currentAudio]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < audios.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, audios.length]);

  if (audios.length === 0) {
    return (
      <div className="meditation-player">
        <h2 className="meditation-title">{audioTitle}</h2>
        <p className="meditation-loading">準備中です</p>
      </div>
    );
  }

  return (
    <div className="meditation-player">
      <div className="meditation-selector">
        <button
          className="meditation-selector-btn"
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="15 18 9 12 15 6 15 18"></polygon>
          </svg>
        </button>

        <div className="meditation-selector-content">
          <h2 className="meditation-title">{currentAudio.title}</h2>
          {audios.length > 1 && (
            <p className="meditation-page-indicator">
              {currentIndex + 1} / {audios.length}
            </p>
          )}
        </div>

        <button
          className="meditation-selector-btn"
          onClick={handleNext}
          disabled={currentIndex === audios.length - 1}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="9 18 15 12 9 6 9 18"></polygon>
          </svg>
        </button>
      </div>

      {isLoading && <p className="meditation-loading">音声を読み込み中...</p>}
      {error && <p className="meditation-loading" style={{ color: '#c44' }}>{error}</p>}

      <audio ref={audioRef} src={currentAudio.audioUrl} preload="metadata" />

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
        <button
          className="meditation-action-btn"
          onClick={handleDownload}
          disabled={!currentAudio?.downloadUrl}
          style={{ opacity: currentAudio?.downloadUrl ? 1 : 0.5 }}
        >
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
