'use client';

import { useEffect, useState, useCallback } from 'react';
import liff from '@line/liff';
import TraceForm from '@/components/TraceForm';
import TraceList from '@/components/TraceList';
import { getCohortFromStorage, setCohortToStorage, clearCohortStorage } from '@/lib/auth';

type Tab = 'write' | 'read';
type Screen = 'cohort' | 'main';

export default function Home() {
  const [liffReady, setLiffReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('cohort');
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [cohortName, setCohortName] = useState<string>('');
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
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
        const { id } = getCohortFromStorage();
        if (id) {
          setCohortId(id);
          setScreen('main');
        }
      })
      .catch((err: Error) => {
        console.error('LIFF init error:', err);
        setLiffError('LIFF の初期化に失敗しました');
      });
  }, []);

  const handleCohortAuth = useCallback(async () => {
    if (!passcode.trim()) {
      setAuthError('パスコードを入力してください');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/auth/cohort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '認証に失敗しました');
      }

      const data = await res.json();
      setCohortId(data.id);
      setCohortName(data.name);
      setCohortToStorage(data.id, passcode.trim());
      setScreen('main');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '認証に失敗しました');
    } finally {
      setIsAuthenticating(false);
    }
  }, [passcode]);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);

  const handleLogout = useCallback(() => {
    clearCohortStorage();
    setCohortId(null);
    setCohortName('');
    setPasscode('');
    setScreen('cohort');
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

  if (screen === 'cohort') {
    return (
      <div className="container">
        <header className="app-header">
          <h1 className="app-title">Daily Alchemy</h1>
          <p className="app-subtitle">日々の痕跡を、静かに置く</p>
        </header>

        <div className="form-card">
          <div className="form-group">
            <label className="form-label" htmlFor="passcode">
              参加用パスコード
            </label>
            <input
              type="text"
              id="passcode"
              className="form-text-input"
              placeholder="運営から配布されたパスコード"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCohortAuth()}
            />
          </div>

          {authError && (
            <div style={{ color: '#c44', fontSize: 13, marginBottom: 12 }}>{authError}</div>
          )}

          <button
            className="submit-button"
            onClick={handleCohortAuth}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? '確認中...' : '参加する'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="app-header">
        <h1 className="app-title">Daily Alchemy</h1>
        <p className="app-subtitle">
          {cohortName ? `${cohortName} の痕跡` : '日々の痕跡を、静かに置く'}
        </p>
        {cohortName && (
          <button className="logout-button" onClick={handleLogout}>
            別の期に参加する
          </button>
        )}
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
        {activeTab === 'write' ? (
          <TraceForm cohortId={cohortId} />
        ) : (
          <TraceList cohortId={cohortId} />
        )}
      </main>
    </div>
  );
}
