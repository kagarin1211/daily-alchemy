'use client';

import { useState, useCallback, useRef } from 'react';
import liff from '@line/liff';
import { hashLineUserId } from '@/lib/crypto';
import { compressImage } from '@/lib/image';

type DisplayMode = 'anonymous' | 'nickname' | 'nameless';

interface FormData {
  practiceText: string;
  feelingText: string;
  nextStepText: string;
  displayMode: DisplayMode;
  nickname: string;
  imageUrl: string | null;
}

export default function TraceForm() {
  const [formData, setFormData] = useState<FormData>({
    practiceText: '',
    feelingText: '',
    nextStepText: '',
    displayMode: 'anonymous',
    nickname: '',
    imageUrl: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (field: keyof FormData, value: string | null) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        setError('画像ファイルを選択してください');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('画像サイズは10MB以下にしてください');
        return;
      }

      try {
        setIsUploading(true);
        setError(null);

        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);

        const compressedBlob = await compressImage(file, 800, 0.7);
        const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });

        const uploadFormData = new FormData();
        uploadFormData.append('file', compressedFile);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || '画像のアップロードに失敗しました');
        }

        const data = await res.json();
        handleChange('imageUrl', data.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : '画像のアップロードに失敗しました');
        setImagePreview(null);
      } finally {
        setIsUploading(false);
      }
    },
    [handleChange]
  );

  const handleRemoveImage = useCallback(() => {
    setImagePreview(null);
    handleChange('imageUrl', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleChange]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setError(null);

      try {
        let authorHash = '';
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          authorHash = hashLineUserId(profile.userId);
        } else {
          authorHash = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        }

        const body = {
          practice_text: formData.practiceText.trim() || null,
          feeling_text: formData.feelingText.trim() || null,
          next_step_text: formData.nextStepText.trim() || null,
          display_mode: formData.displayMode,
          nickname: formData.displayMode === 'nickname' ? formData.nickname.trim() || null : null,
          author_hash: authorHash,
          image_url: formData.imageUrl,
        };

        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || '投稿に失敗しました');
        }

        setIsSubmitted(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData]
  );

  const handleReset = useCallback(() => {
    setFormData({
      practiceText: '',
      feelingText: '',
      nextStepText: '',
      displayMode: 'anonymous',
      nickname: '',
      imageUrl: null,
    });
    setIsSubmitted(false);
    setError(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  if (isSubmitted) {
    return (
      <div className="form-card">
        <div className="success-state">
          <div className="success-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <p className="success-text">置けました</p>
          <p className="success-subtext">今日の痕跡、静かに届きました</p>
          <button className="submit-button" style={{ marginTop: 24 }} onClick={handleReset}>
            もう一度置く
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-card">
        <div className="form-group">
          <label className="form-label" htmlFor="practice">
            今日やった実践
          </label>
          <textarea
            id="practice"
            className="form-textarea"
            placeholder="例: 朝の呼吸を10分、丁寧に過ごそうと意識した"
            value={formData.practiceText}
            onChange={(e) => handleChange('practiceText', e.target.value)}
            maxLength={500}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="feeling">
            今のひとこと
          </label>
          <textarea
            id="feeling"
            className="form-textarea"
            placeholder="例: なんとなく静かな気分"
            value={formData.feelingText}
            onChange={(e) => handleChange('feelingText', e.target.value)}
            maxLength={300}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="nextstep">
            明日の一歩
          </label>
          <textarea
            id="nextstep"
            className="form-textarea"
            placeholder="例: 5分だけでも座ってみる"
            value={formData.nextStepText}
            onChange={(e) => handleChange('nextStepText', e.target.value)}
            maxLength={300}
          />
        </div>

        <div className="form-group">
          <span className="form-label">写真（任意）</span>
          {!imagePreview ? (
            <button
              type="button"
              className="image-select-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? 'アップロード中...' : '写真を選ぶ'}
            </button>
          ) : (
            <div className="image-preview-container">
              <img src={imagePreview} alt="プレビュー" className="image-preview" />
              <button
                type="button"
                className="image-remove-button"
                onClick={handleRemoveImage}
              >
                削除
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageSelect}
          />
        </div>

        <div className="form-group">
          <span className="form-label">名前</span>
          <div className="display-mode-group">
            <div className="display-mode-option">
              <input
                type="radio"
                id="mode-anonymous"
                name="displayMode"
                value="anonymous"
                checked={formData.displayMode === 'anonymous'}
                onChange={() => handleChange('displayMode', 'anonymous')}
              />
              <label htmlFor="mode-anonymous">匿名</label>
            </div>
            <div className="display-mode-option">
              <input
                type="radio"
                id="mode-nickname"
                name="displayMode"
                value="nickname"
                checked={formData.displayMode === 'nickname'}
                onChange={() => handleChange('displayMode', 'nickname')}
              />
              <label htmlFor="mode-nickname">ニックネーム</label>
            </div>
            {formData.displayMode === 'nickname' && (
              <input
                type="text"
                className="nickname-input"
                placeholder="ニックネーム"
                value={formData.nickname}
                onChange={(e) => handleChange('nickname', e.target.value)}
                maxLength={20}
              />
            )}
            <div className="display-mode-option">
              <input
                type="radio"
                id="mode-nameless"
                name="displayMode"
                value="nameless"
                checked={formData.displayMode === 'nameless'}
                onChange={() => handleChange('displayMode', 'nameless')}
              />
              <label htmlFor="mode-nameless">無記名</label>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ color: '#c44', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        className="submit-button"
        disabled={
          isSubmitting ||
          isUploading ||
          (!formData.practiceText.trim() &&
            !formData.feelingText.trim() &&
            !formData.nextStepText.trim() &&
            !formData.imageUrl)
        }
      >
        {isSubmitting ? '置いています...' : '置いておく'}
      </button>
    </form>
  );
}
