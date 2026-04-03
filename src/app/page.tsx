'use client';

import { useEffect, useState, useCallback } from 'react';
import liff from '@line/liff';
import TraceForm from '@/components/TraceForm';
import TraceList from '@/components/TraceList';
import {
  getStoredCohorts,
  addStoredCohort,
  getActiveCohortId,
  clearAllCohorts,
} from '@/lib/auth';

type Tab = 'write' | 'read';
type Screen = 'cohort' | 'main';

interface StoredCohort {
  id: string;
  name: string;
  code: string;
  passcode: string;
}

export default function Home() {
  const [liffReady, setLiffReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('cohort');
  const [cameFromMain, setCameFromMain] = useState(false);
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [cohortName, setCohortName] = useState<string>('');
  const [storedCohorts, setStoredCohorts] = useState<StoredCohort[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('read');
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
        const cohorts = getStoredCohorts();
        setStoredCohorts(cohorts);

        if (cohorts.length > 0) {
          const activeId = getActiveCohortId();
          const active = activeId ? cohorts.find(c => c.id === activeId) : cohorts[0];
          if (active) {
            setCohortId(active.id);
            setCohortName(active.name);
            setScreen('main');
          }
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
      const newCohort = {
        id: data.id,
        name: data.name,
        code: data.code,
        passcode: passcode.trim(),
      };

      addStoredCohort(newCohort);
      setStoredCohorts(getStoredCohorts());
      setCohortId(data.id);
      setCohortName(data.name);
      setScreen('main');
      setPasscode('');
      setCameFromMain(false);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '認証に失敗しました');
    } finally {
      setIsAuthenticating(false);
    }
  }, [passcode]);

  const handleLogout = useCallback(() => {
    clearAllCohorts();
    setStoredCohorts([]);
    setCohortId(null);
    setCohortName('');
    setPasscode('');
    setScreen('cohort');
    setMenuOpen(false);
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

          {cameFromMain && (
            <button
              className="back-button"
              onClick={() => {
                setCameFromMain(false);
                setScreen('main');
              }}
            >
              戻る
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="app-header">
        <div className="header-row">
          <div>
            <h1 className="app-title">Daily Alchemy</h1>
            <p className="app-subtitle">
              {cohortName ? `${cohortName} の痕跡` : '日々の痕跡を、静かに置く'}
            </p>
          </div>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="menu-dropdown">
            <button className="menu-item menu-item-add" onClick={() => {
              setMenuOpen(false);
              setCameFromMain(true);
              setScreen('cohort');
            }}>
              新しい期に参加する
            </button>
            <button className="menu-item menu-item-logout" onClick={handleLogout}>
              参加中の期を解除
            </button>
          </div>
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
