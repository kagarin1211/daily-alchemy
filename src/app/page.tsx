'use client';

import { useEffect, useState, useCallback } from 'react';
import liff from '@line/liff';
import TraceForm from '@/components/TraceForm';
import TraceList from '@/components/TraceList';
import MeditationPlayer from '@/components/MeditationPlayer';
import {
  getStoredCohorts,
  addStoredCohort,
  getActiveCohortId,
  setActiveCohortId,
} from '@/lib/auth';
import { hashUserId } from '@/lib/utils';

type Tab = 'write' | 'read';
type Screen = 'cohort' | 'main' | 'meditation';

interface StoredCohort {
  id: string;
  name: string;
  code: string;
  passcode: string;
}

interface EditingTrace {
  id: string;
  content_text: string | null;
  display_name: string | null;
  image_url: string | null;
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
  const [authorHash, setAuthorHash] = useState<string | null>(null);
  const [editingTrace, setEditingTrace] = useState<EditingTrace | null>(null);

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      setLiffError('LIFF ID が設定されていません');
      return;
    }

    liff
      .init({ liffId })
      .then(async () => {
        setLiffReady(true);

        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          const hash = await hashUserId(profile.userId);
          setAuthorHash(hash);
        }

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

  const handleSwitchCohort = useCallback((cohort: StoredCohort) => {
    setActiveCohortId(cohort.id);
    setCohortId(cohort.id);
    setCohortName(cohort.name);
    setEditingTrace(null);
    setMenuOpen(false);
  }, []);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'write') {
      setEditingTrace(null);
    }
  }, []);

  const handleEdit = useCallback((trace: { id: string; content_text: string | null; display_name: string | null; image_url: string | null }) => {
    setEditingTrace({
      id: trace.id,
      content_text: trace.content_text,
      display_name: trace.display_name,
      image_url: trace.image_url,
    });
    setActiveTab('write');
  }, []);

  const handleDelete = useCallback(async (trace: { id: string }) => {
    if (!confirm('この痕跡を削除しますか？')) return;
    if (!authorHash) return;

    try {
      const res = await fetch('/api/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: trace.id, author_hash: authorHash }),
      });

      if (!res.ok) {
        throw new Error('削除に失敗しました');
      }

      setActiveTab('read');
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました');
    }
  }, [authorHash]);

  const openMeditation = useCallback(() => {
    setMenuOpen(false);
    setScreen('meditation');
  }, []);

  const closeMeditation = useCallback(() => {
    setScreen('main');
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
          <h1 className="app-title">空の祭壇</h1>
          <p className="app-subtitle">日々の痕跡を、静かに置く</p>
        </header>

        <div className="form-card">
          <div className="form-group">
            <label className="form-label" htmlFor="passcode">
              参加用コード
            </label>
            <input
              type="text"
              id="passcode"
              className="form-text-input"
              placeholder="運営から配布されたコード"
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

  if (screen === 'meditation') {
    return (
      <div className="container">
        <header className="app-header">
          <div className="header-row">
            <div>
              <h1 className="app-title">空の祭壇</h1>
              <p className="app-subtitle">誘導瞑想音声</p>
            </div>
            <button className="menu-button" onClick={closeMeditation}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>
        <MeditationPlayer />
      </div>
    );
  }

  return (
    <div className="container">
      <header className="app-header">
        <div className="header-row">
          <div>
            <h1 className="app-title">空の祭壇</h1>
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
            <div className="menu-title">参加中の期</div>
            {storedCohorts.map((cohort) => (
              <button
                key={cohort.id}
                className={`menu-item ${cohort.id === cohortId ? 'active' : ''}`}
                onClick={() => handleSwitchCohort(cohort)}
              >
                {cohort.name}
              </button>
            ))}
            <div className="menu-divider"></div>
            <button className="menu-item menu-item-meditation" onClick={openMeditation}>
              誘導瞑想音声
            </button>
            <button className="menu-item menu-item-add" onClick={() => {
              setMenuOpen(false);
              setCameFromMain(true);
              setScreen('cohort');
            }}>
              新しい期に参加する
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
          <TraceForm cohortId={cohortId} authorHash={authorHash} editingTrace={editingTrace} onEditComplete={() => { setEditingTrace(null); setActiveTab('read'); }} />
        ) : (
          <TraceList cohortId={cohortId} authorHash={authorHash} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </main>
    </div>
  );
}
