'use client';

import { useState, useCallback, useRef } from 'react';
import liff from '@line/liff';
import { hashLineUserId } from '@/lib/crypto';
import { compressImage } from '@/lib/image';

interface FormData {
  contentText: string;
  displayName: string;
  imageUrl: string | null;
}

export default function TraceForm() {
  const [formData, setFormData] = useState<FormData>({
    contentText: '',
    displayName: '',
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
          content_text: formData.contentText.trim() || null,
          display_name: formData.displayName.trim() || null,
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
      contentText: '',
      displayName: '',
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
          <label className="form-label" htmlFor="content">
            今日の痕跡
          </label>
          <textarea
            id="content"
            className="form-textarea form-textarea-large"
            placeholder="今日の実践、思ったこと、気づいたこと..."
            value={formData.contentText}
            onChange={(e) => handleChange('contentText', e.target.value)}
            maxLength={2000}
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
          <label className="form-label" htmlFor="displayName">
            名前（無記入は匿名）
          </label>
          <input
            type="text"
            id="displayName"
            className="form-text-input"
            placeholder="ニックネームなど"
            value={formData.displayName}
            onChange={(e) => handleChange('displayName', e.target.value)}
            maxLength={20}
          />
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
          (!formData.contentText.trim() && !formData.imageUrl)
        }
      >
        {isSubmitting ? '置いています...' : '置いておく'}
      </button>
    </form>
  );
}
