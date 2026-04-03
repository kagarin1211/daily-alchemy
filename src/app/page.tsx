'use client';

import { useEffect, useState, useCallback } from 'react';
import liff from '@line/liff';
import TraceForm from '@/components/TraceForm';
import TraceList from '@/components/TraceList';

type Tab = 'write' | 'read';

export default function Home() {
  const [liffReady, setLiffReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('write');
  const [liffError, setLiffError] = useState<string | null>(null);

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      setLiffError('LIFF ID が設定されていません');
      return;
    }

    liff
      .init({ liffId })
      .then(() => {
        setLiffReady(true);
      })
      .catch((err: Error) => {
        console.error('LIFF init error:', err);
        setLiffError('LIFF の初期化に失敗しました');
      });
  }, []);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);

  if (liffError) {
    return (
      <div className="container">
        <div className="error-state">
          <p>{liffError}</p>
          <p className="error-hint">LINE 内で開いているか確認してください</p>
        </div>
      </div>
    );
  }

  if (!liffReady) {
    return (
      <div className="container">
        <div className="loading-state">
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="app-header">
        <h1 className="app-title">Daily Alchemy</h1>
        <p className="app-subtitle">日々の痕跡を、静かに置く</p>
      </header>

      <nav className="tab-nav">
        <button
          className={`tab-button ${activeTab === 'write' ? 'active' : ''}`}
          onClick={() => handleTabChange('write')}
        >
          置く
        </button>
        <button
          className={`tab-button ${activeTab === 'read' ? 'active' : ''}`}
          onClick={() => handleTabChange('read')}
        >
          見る
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'write' ? <TraceForm /> : <TraceList />}
      </main>
    </div>
  );
}
