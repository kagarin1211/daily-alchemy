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
  is_visible: boolean;
  cohorts: { name: string } | null;
}

interface MeditationAudio {
  id: string;
  title: string;
  audioUrl: string;
  downloadUrl: string;
}

type Section = 'cohorts' | 'posts' | 'meditation' | 'digest';

interface DigestMessage {
  id: string;
  category: string;
  message: string;
  is_active: boolean;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  morning_posts: '朝・投稿あり',
  morning_no_posts: '朝・投稿なし',
  evening_posts: '夜・投稿あり',
  evening_no_posts: '夜・投稿なし',
};

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
  const [activeSection, setActiveSection] = useState<Section>('cohorts');
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [audios, setAudios] = useState<MeditationAudio[]>([]);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioMessage, setAudioMessage] = useState<string | null>(null);
  const [digestMessages, setDigestMessages] = useState<DigestMessage[]>([]);
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestMessage, setDigestMessage] = useState<string | null>(null);
  const [newDigestCategory, setNewDigestCategory] = useState('morning_posts');
  const [newDigestMessage, setNewDigestMessage] = useState('');
  const [editingDigestId, setEditingDigestId] = useState<string | null>(null);
  const [editingDigestText, setEditingDigestText] = useState('');
  const [editingDigestCategory, setEditingDigestCategory] = useState('');

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

  const handleToggleVisibility = useCallback(async (postId: string, currentVisible: boolean) => {
    try {
      const res = await fetch('/api/admin/posts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`,
        },
        body: JSON.stringify({ post_id: postId, is_visible: !currentVisible }),
      });

      if (!res.ok) {
        throw new Error('更新に失敗しました');
      }

      await fetchPosts(selectedCohortId || undefined);
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新に失敗しました');
    }
  }, [password, fetchPosts, selectedCohortId]);

  const handleDeletePost = useCallback(async (postId: string) => {
    if (!confirm('この投稿をデータベースから完全に削除しますか？\nこの操作は元に戻せません。')) return;

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

  const handleDeleteCohort = useCallback(async (cohortId: string) => {
    if (!confirm('このCohortを完全に削除しますか？\nこの操作は元に戻せません。')) return;

    try {
      const res = await fetch('/api/admin/cohorts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`,
        },
        body: JSON.stringify({ cohort_id: cohortId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '削除に失敗しました');
      }

      await fetchCohorts();
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました\n\nこのCohortに関連する投稿があるため削除できない場合があります。\nまず投稿を削除または他のCohortに移動してから再試行してください。');
    }
  }, [password, fetchCohorts]);

  const fetchAudios = useCallback(async () => {
    setAudioLoading(true);
    try {
      const res = await fetch('/api/admin/meditation-audios', {
        headers: { 'Authorization': `Bearer ${password}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAudios(data.audios || []);
      }
    } catch (err) {
      console.error('Fetch audios error:', err);
    } finally {
      setAudioLoading(false);
    }
  }, [password]);

  const handleSaveAudios = useCallback(async () => {
    setAudioLoading(true);
    setAudioMessage(null);
    try {
      const res = await fetch('/api/admin/meditation-audios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`,
        },
        body: JSON.stringify({ audios }),
      });

      if (!res.ok) {
        throw new Error('保存に失敗しました');
      }

      setAudioMessage('保存しました');
    } catch (err) {
      setAudioMessage(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setAudioLoading(false);
    }
  }, [audios, password]);

  const handleAddAudio = useCallback(() => {
    setAudios([...audios, {
      id: crypto.randomUUID(),
      title: '',
      audioUrl: '',
      downloadUrl: '',
    }]);
  }, [audios]);

  const handleRemoveAudio = useCallback((id: string) => {
    setAudios(audios.filter(a => a.id !== id));
  }, [audios]);

  const handleUpdateAudio = useCallback((id: string, field: keyof MeditationAudio, value: string) => {
    setAudios(audios.map(a => a.id === id ? { ...a, [field]: value } : a));
  }, [audios]);

  const fetchDigestMessages = useCallback(async () => {
    setDigestLoading(true);
    try {
      const res = await fetch('/api/admin/digest-messages', {
        headers: { 'Authorization': `Bearer ${password}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDigestMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Fetch digest messages error:', err);
    } finally {
      setDigestLoading(false);
    }
  }, [password]);

  const handleAddDigestMessage = useCallback(async () => {
    if (!newDigestMessage.trim()) return;
    setDigestLoading(true);
    setDigestMessage(null);
    try {
      const res = await fetch('/api/admin/digest-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`,
        },
        body: JSON.stringify({ category: newDigestCategory, message: newDigestMessage }),
      });
      if (!res.ok) throw new Error('追加に失敗しました');
      setNewDigestMessage('');
      await fetchDigestMessages();
    } catch (err) {
      setDigestMessage(err instanceof Error ? err.message : '追加に失敗しました');
    } finally {
      setDigestLoading(false);
    }
  }, [newDigestCategory, newDigestMessage, password, fetchDigestMessages]);

  const handleToggleDigestMessage = useCallback(async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/admin/digest-messages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`,
        },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });
      if (!res.ok) throw new Error('更新に失敗しました');
      await fetchDigestMessages();
    } catch (err) {
      setDigestMessage(err instanceof Error ? err.message : '更新に失敗しました');
    }
  }, [password, fetchDigestMessages]);

  const handleStartEditDigest = useCallback((msg: DigestMessage) => {
    setEditingDigestId(msg.id);
    setEditingDigestText(msg.message);
    setEditingDigestCategory(msg.category);
  }, []);

  const handleCancelEditDigest = useCallback(() => {
    setEditingDigestId(null);
    setEditingDigestText('');
    setEditingDigestCategory('');
  }, []);

  const handleSaveEditDigest = useCallback(async () => {
    if (!editingDigestId || !editingDigestText.trim()) return;
    setDigestLoading(true);
    setDigestMessage(null);
    try {
      const res = await fetch('/api/admin/digest-messages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`,
        },
        body: JSON.stringify({
          id: editingDigestId,
          message: editingDigestText,
          category: editingDigestCategory,
        }),
      });
      if (!res.ok) throw new Error('更新に失敗しました');
      handleCancelEditDigest();
      await fetchDigestMessages();
    } catch (err) {
      setDigestMessage(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setDigestLoading(false);
    }
  }, [editingDigestId, editingDigestText, editingDigestCategory, password, fetchDigestMessages, handleCancelEditDigest]);

  const handleDeleteDigestMessage = useCallback(async (id: string) => {
    if (!confirm('このメッセージを削除しますか？')) return;
    try {
      const res = await fetch('/api/admin/digest-messages', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`,
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('削除に失敗しました');
      await fetchDigestMessages();
    } catch (err) {
      setDigestMessage(err instanceof Error ? err.message : '削除に失敗しました');
    }
  }, [password, fetchDigestMessages]);

  const handleSectionChange = useCallback((section: Section) => {
    setActiveSection(section);
    if (section === 'posts') {
      fetchPosts(selectedCohortId || undefined);
    }
    if (section === 'meditation') {
      fetchAudios();
    }
    if (section === 'digest') {
      fetchDigestMessages();
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
        <button
          className={`tab-button ${activeSection === 'meditation' ? 'active' : ''}`}
          onClick={() => handleSectionChange('meditation')}
        >
          音声ダウンロード設定
        </button>
        <button
          className={`tab-button ${activeSection === 'digest' ? 'active' : ''}`}
          onClick={() => handleSectionChange('digest')}
        >
          ダイジェストメッセージ
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
                参加用コード（例: 202604）
              </label>
              <input
                type="text"
                id="newCode"
                className="form-text-input"
                placeholder="202604"
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
                  参加用コード: <strong>{createdCohort.code}</strong>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{cohort.name}</div>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                          参加用コード: {cohort.code}
                        </div>
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                          {cohort.is_active ? '有効' : '無効'}
                        </div>
                      </div>
                      <button
                        style={{
                          padding: '4px 10px',
                          fontSize: 12,
                          border: '1px solid #c44',
                          borderRadius: 4,
                          background: '#fff',
                          color: '#c44',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        onClick={() => handleDeleteCohort(cohort.id)}
                      >
                        削除
                      </button>
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
                    background: post.is_visible ? '#fff' : '#f9f7f4',
                    opacity: post.is_visible ? 1 : 0.7,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          background: post.is_visible ? '#e8f5e9' : '#fff3e0',
                          color: post.is_visible ? '#2e7d32' : '#e65100',
                        }}
                      >
                        {post.is_visible ? '表示中' : '非表示'}
                      </span>
                      {post.cohorts?.name || '不明'} | {post.display_name || '匿名'} | {formatDate(post.created_at)}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        style={{
                          padding: '4px 8px',
                          fontSize: 11,
                          border: '1px solid #888',
                          borderRadius: 4,
                          background: '#fff',
                          color: '#555',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleToggleVisibility(post.id, post.is_visible)}
                      >
                        {post.is_visible ? '非表示にする' : '再表示'}
                      </button>
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
                        削除
                      </button>
                    </div>
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

      {activeSection === 'meditation' && (
        <div className="form-card">
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>音声リスト設定</h3>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
            複数の誘導瞑想音声を登録できます。音声はスワイプで切り替えられます。
          </p>

          {audioLoading && <p style={{ fontSize: 13, color: '#888', textAlign: 'center' }}>読み込み中...</p>}

          {audios.map((audio, index) => (
            <div
              key={audio.id}
              style={{
                padding: 16,
                border: '1px solid #e8e4dd',
                borderRadius: 8,
                marginBottom: 12,
                background: '#faf9f7',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#888' }}>音声 {index + 1}</span>
                <button
                  onClick={() => handleRemoveAudio(audio.id)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    border: '1px solid #c44',
                    borderRadius: 4,
                    background: '#fff',
                    color: '#c44',
                    cursor: 'pointer',
                  }}
                >
                  削除
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">タイトル</label>
                <input
                  type="text"
                  className="form-text-input"
                  placeholder="ヨガニドラ"
                  value={audio.title}
                  onChange={(e) => handleUpdateAudio(audio.id, 'title', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">音声ファイルURL（再生用）</label>
                <input
                  type="text"
                  className="form-text-input"
                  placeholder="/audio/meditation-0403.m4a"
                  value={audio.audioUrl}
                  onChange={(e) => handleUpdateAudio(audio.id, 'audioUrl', e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">ダウンロードURL（ギガファイル便など）</label>
                <input
                  type="text"
                  className="form-text-input"
                  placeholder="https://example.com/download"
                  value={audio.downloadUrl}
                  onChange={(e) => handleUpdateAudio(audio.id, 'downloadUrl', e.target.value)}
                />
              </div>
            </div>
          ))}

          <button
            className="submit-button"
            onClick={handleAddAudio}
            style={{ background: '#9aaa8a', marginBottom: 8 }}
          >
            音声を追加
          </button>

          <button
            className="submit-button"
            onClick={handleSaveAudios}
            disabled={audioLoading}
          >
            {audioLoading ? '保存中...' : '保存'}
          </button>

          {audioMessage && (
            <div style={{
              marginTop: 12,
              fontSize: 13,
              color: audioMessage.includes('失敗') ? '#c44' : '#2e7d32',
              textAlign: 'center',
            }}>
              {audioMessage}
            </div>
          )}
        </div>
      )}

      {activeSection === 'digest' && (
        <div className="form-card">
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>ダイジェストメッセージ設定</h3>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
            朝7時と夜22:30に送信するメッセージを管理します。カテゴリごとにメッセージを追加・編集できます。
          </p>

          <div style={{ marginBottom: 20, padding: 16, border: '1px solid #e8e4dd', borderRadius: 8, background: '#faf9f7' }}>
            <h4 style={{ fontSize: 14, marginBottom: 12 }}>新しいメッセージを追加</h4>
            <div className="form-group">
              <label className="form-label">カテゴリ</label>
              <select
                className="form-text-input"
                value={newDigestCategory}
                onChange={(e) => setNewDigestCategory(e.target.value)}
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">メッセージ</label>
              <textarea
                className="form-text-input"
                rows={2}
                placeholder="メッセージを入力"
                value={newDigestMessage}
                onChange={(e) => setNewDigestMessage(e.target.value)}
              />
            </div>
            <button
              className="submit-button"
              onClick={handleAddDigestMessage}
              disabled={digestLoading}
              style={{ width: 'auto', padding: '8px 20px' }}
            >
              追加
            </button>
          </div>

          {digestLoading && <p style={{ fontSize: 13, color: '#888', textAlign: 'center' }}>読み込み中...</p>}

          {digestMessage && (
            <div style={{
              marginBottom: 12,
              fontSize: 13,
              color: digestMessage.includes('失敗') ? '#c44' : '#2e7d32',
              textAlign: 'center',
            }}>
              {digestMessage}
            </div>
          )}

          {Object.entries(CATEGORY_LABELS).map(([categoryKey, categoryLabel]) => {
            const messages = digestMessages.filter(m => m.category === categoryKey);
            if (messages.length === 0) return null;
            return (
              <div key={categoryKey} style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 14, marginBottom: 8, color: '#888' }}>{categoryLabel} ({messages.length}件)</h4>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      padding: 12,
                      border: '1px solid #e8e4dd',
                      borderRadius: 8,
                      marginBottom: 8,
                      background: msg.is_active ? '#fff' : '#f5f5f5',
                      opacity: msg.is_active ? 1 : 0.6,
                    }}
                  >
                    {editingDigestId === msg.id ? (
                      <div>
                        <div className="form-group" style={{ marginBottom: 8 }}>
                          <label className="form-label" style={{ fontSize: 11 }}>カテゴリ</label>
                          <select
                            className="form-text-input"
                            style={{ fontSize: 13, padding: '6px 8px' }}
                            value={editingDigestCategory}
                            onChange={(e) => setEditingDigestCategory(e.target.value)}
                          >
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 8 }}>
                          <label className="form-label" style={{ fontSize: 11 }}>メッセージ</label>
                          <textarea
                            className="form-text-input"
                            style={{ fontSize: 14, padding: '6px 8px' }}
                            rows={2}
                            value={editingDigestText}
                            onChange={(e) => setEditingDigestText(e.target.value)}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            style={{
                              padding: '4px 8px',
                              fontSize: 11,
                              border: '1px solid #2e7d32',
                              borderRadius: 4,
                              background: '#fff',
                              color: '#2e7d32',
                              cursor: 'pointer',
                            }}
                            onClick={handleSaveEditDigest}
                          >
                            保存
                          </button>
                          <button
                            style={{
                              padding: '4px 8px',
                              fontSize: 11,
                              border: '1px solid #888',
                              borderRadius: 4,
                              background: '#fff',
                              color: '#555',
                              cursor: 'pointer',
                            }}
                            onClick={handleCancelEditDigest}
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1, fontSize: 14, lineHeight: 1.6 }}>
                          {msg.message}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button
                            style={{
                              padding: '4px 8px',
                              fontSize: 11,
                              border: '1px solid #2e7d32',
                              borderRadius: 4,
                              background: '#fff',
                              color: '#2e7d32',
                              cursor: 'pointer',
                            }}
                            onClick={() => handleStartEditDigest(msg)}
                          >
                            編集
                          </button>
                          <button
                            style={{
                              padding: '4px 8px',
                              fontSize: 11,
                              border: '1px solid #888',
                              borderRadius: 4,
                              background: '#fff',
                              color: '#555',
                              cursor: 'pointer',
                            }}
                            onClick={() => handleToggleDigestMessage(msg.id, msg.is_active)}
                          >
                            {msg.is_active ? '無効にする' : '有効にする'}
                          </button>
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
                            onClick={() => handleDeleteDigestMessage(msg.id)}
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
