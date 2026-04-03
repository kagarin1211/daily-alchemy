'use client';

import { useState, useCallback } from 'react';

interface Cohort {
  id: string;
  created_at: string;
  name: string;
  code: string;
  passcode: string;
  is_active: boolean;
}

interface Post {
  id: string;
  created_at: string;
  content_text: string | null;
  display_name: string | null;
  image_url: string | null;
  cohort_id: string;
  cohorts: { name: string } | null;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [createdCohort, setCreatedCohort] = useState<Cohort | null>(null);
  const [activeSection, setActiveSection] = useState<'cohorts' | 'posts'>('cohorts');
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');

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

  const fetchPosts = useCallback(async (cohortId?: string) => {
    try {
      const params = new URLSearchParams();
      if (cohortId) params.set('cohort_id', cohortId);
      params.set('limit', '100');

      const res = await fetch(`/api/admin/posts?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${password}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Fetch posts error:', err);
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

  const handleDeletePost = useCallback(async (postId: string) => {
    if (!confirm('この投稿を非表示にしますか？')) return;

    try {
      const res = await fetch('/api/admin/posts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`,
        },
        body: JSON.stringify({ post_id: postId }),
      });

      if (!res.ok) {
        throw new Error('削除に失敗しました');
      }

      await fetchPosts(selectedCohortId || undefined);
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました');
    }
  }, [password, fetchPosts, selectedCohortId]);

  const handleSectionChange = useCallback((section: 'cohorts' | 'posts') => {
    setActiveSection(section);
    if (section === 'posts') {
      fetchPosts(selectedCohortId || undefined);
    }
  }, [fetchPosts, selectedCohortId]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  };

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
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>管理者ページ</h2>

      <nav className="tab-nav" style={{ marginBottom: 20 }}>
        <button
          className={`tab-button ${activeSection === 'cohorts' ? 'active' : ''}`}
          onClick={() => handleSectionChange('cohorts')}
        >
          Cohort 管理
        </button>
        <button
          className={`tab-button ${activeSection === 'posts' ? 'active' : ''}`}
          onClick={() => handleSectionChange('posts')}
        >
          投稿管理
        </button>
      </nav>

      {activeSection === 'cohorts' && (
        <>
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
        </>
      )}

      {activeSection === 'posts' && (
        <div className="form-card">
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>投稿一覧</h3>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" htmlFor="cohortFilter">
              Cohort で絞り込み
            </label>
            <select
              id="cohortFilter"
              className="form-text-input"
              value={selectedCohortId}
              onChange={(e) => {
                setSelectedCohortId(e.target.value);
                fetchPosts(e.target.value || undefined);
              }}
            >
              <option value="">すべて</option>
              {cohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>{cohort.name}</option>
              ))}
            </select>
          </div>

          {posts.length === 0 ? (
            <p style={{ color: '#888', fontSize: 14 }}>投稿がありません</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {posts.map((post) => (
                <div
                  key={post.id}
                  style={{
                    padding: 12,
                    border: '1px solid #e8e4dd',
                    borderRadius: 8,
                    background: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      {post.cohorts?.name || '不明'} | {post.display_name || '匿名'} | {formatDate(post.created_at)}
                    </div>
                    <button
                      style={{
                        padding: '4px 8px',
                        fontSize: 11,
                        border: '1px solid #c44',
                        borderRadius: 4,
                        background: '#fff',
                        color: '#c44',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleDeletePost(post.id)}
                    >
                      非表示
                    </button>
                  </div>
                  {post.content_text && (
                    <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>
                      {post.content_text}
                    </div>
                  )}
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt=""
                      style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 4 }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
