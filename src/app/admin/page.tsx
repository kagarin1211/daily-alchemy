'use client';

import { useState, useEffect, useCallback } from 'react';

interface Cohort {
  id: string;
  created_at: string;
  name: string;
  code: string;
  passcode: string;
  is_active: boolean;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [createdCohort, setCreatedCohort] = useState<Cohort | null>(null);

  const handleLogin = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cohorts', {
        headers: { 'Authorization': `Bearer ${password}` },
      });

      if (!res.ok) {
        throw new Error('パスワードが正しくありません');
      }

      const data = await res.json();
      setCohorts(data);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    }
  }, [password]);

  const fetchCohorts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cohorts', {
        headers: { 'Authorization': `Bearer ${password}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCohorts(data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, [password]);

  const handleCreateCohort = useCallback(async () => {
    if (!newName || !newCode) {
      setError('名前とコードを入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/cohorts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`,
        },
        body: JSON.stringify({ name: newName, code: newCode }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '作成に失敗しました');
      }

      const data = await res.json();
      setCreatedCohort(data);
      setNewName('');
      setNewCode('');
      await fetchCohorts();
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [newName, newCode, password, fetchCohorts]);

  if (!isAuthenticated) {
    return (
      <div className="container">
        <div className="form-card">
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>管理者ログイン</h2>
          <div className="form-group">
            <label className="form-label" htmlFor="adminPassword">
              パスワード
            </label>
            <input
              type="password"
              id="adminPassword"
              className="form-text-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          {error && (
            <div style={{ color: '#c44', fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}
          <button className="submit-button" onClick={handleLogin}>
            ログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>Cohort 管理</h2>

      <div className="form-card">
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>新しい Cohort を作成</h3>
        <div className="form-group">
          <label className="form-label" htmlFor="newName">
            名前（例: 2026年04月）
          </label>
          <input
            type="text"
            id="newName"
            className="form-text-input"
            placeholder="2026年04月"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="newCode">
            コード（例: 2026-04）
          </label>
          <input
            type="text"
            id="newCode"
            className="form-text-input"
            placeholder="2026-04"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
          />
        </div>
        <button
          className="submit-button"
          onClick={handleCreateCohort}
          disabled={loading}
        >
          {loading ? '作成中...' : '作成'}
        </button>

        {createdCohort && (
          <div style={{ marginTop: 16, padding: 12, background: '#f0f4e8', borderRadius: 8 }}>
            <p style={{ fontSize: 14, marginBottom: 4 }}>作成しました！</p>
            <p style={{ fontSize: 13, color: '#555' }}>
              参加用パスコード: <strong>{createdCohort.passcode}</strong>
            </p>
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: '#c44', fontSize: 13, textAlign: 'center', margin: 12 }}>
          {error}
        </div>
      )}

      <div className="form-card">
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>既存の Cohort 一覧</h3>
        {cohorts.length === 0 ? (
          <p style={{ color: '#888', fontSize: 14 }}>まだありません</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cohorts.map((cohort) => (
              <div
                key={cohort.id}
                style={{
                  padding: 12,
                  border: '1px solid #e8e4dd',
                  borderRadius: 8,
                  background: cohort.is_active ? '#fff' : '#f5f5f5',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500 }}>{cohort.name}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                  コード: {cohort.code} | パスコード: {cohort.passcode}
                </div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                  {cohort.is_active ? '有効' : '無効'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
