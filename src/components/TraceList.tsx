'use client';

import { useEffect, useState, useCallback } from 'react';

interface Trace {
  id: string;
  created_at: string;
  practice_text: string | null;
  feeling_text: string | null;
  next_step_text: string | null;
  display_mode: string;
  nickname: string | null;
}

export default function TraceList() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTraces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/posts');
      if (!res.ok) {
        throw new Error('痕跡の取得に失敗しました');
      }
      const data = await res.json();
      setTraces(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTraces();
  }, [fetchTraces]);

  const getDisplayName = (trace: Trace): string => {
    switch (trace.display_mode) {
      case 'nickname':
        return trace.nickname || '匿名';
      case 'nameless':
        return '';
      case 'anonymous':
      default:
        return '匿名';
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hours}:${minutes}`;
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p>痕跡を読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
      </div>
    );
  }

  if (traces.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </div>
        <p className="empty-state-text">まだ痕跡はありません</p>
        <p className="empty-state-text" style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>
          まずは置いてみませんか
        </p>
      </div>
    );
  }

  return (
    <div className="trace-list">
      {traces.map((trace) => (
        <article key={trace.id} className="trace-card">
          <div className="trace-header">
            <span className="trace-author">{getDisplayName(trace)}</span>
            <time className="trace-date">{formatDate(trace.created_at)}</time>
          </div>
          <div className="trace-content">
            {trace.practice_text && (
              <div className="trace-item">
                <div className="trace-item-label">今日やった実践</div>
                <div>{trace.practice_text}</div>
              </div>
            )}
            {trace.feeling_text && (
              <div className="trace-item">
                <div className="trace-item-label">今のひとこと</div>
                <div>{trace.feeling_text}</div>
              </div>
            )}
            {trace.next_step_text && (
              <div className="trace-item">
                <div className="trace-item-label">明日の一歩</div>
                <div>{trace.next_step_text}</div>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
