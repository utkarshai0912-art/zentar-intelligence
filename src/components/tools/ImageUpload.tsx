'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

interface ImageUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSizeMB?: number;
}

export function ImageUpload({
  value,
  onChange,
  accept = 'image/png,image/jpeg,image/webp',
  maxSizeMB = 5,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File too large. Max ${maxSizeMB}MB.`);
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    onChange(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    onChange(null);
    setPreview(null);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !value && document.getElementById('image-upload-input')?.click()}
      className={cn(
        'relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-all duration-200',
        dragOver
          ? 'border-brand-500 bg-brand-500/5'
          : value
          ? 'border-brand-500/50 bg-brand-500/5'
          : 'border-border hover:border-brand-400 hover:bg-surface-tertiary/50 dark:border-dark-border dark:hover:border-brand-500/50 dark:hover:bg-dark-surface-tertiary/50'
      )}
    >
      {preview ? (
        <div className="relative w-full max-w-xs">
          <img
            src={preview}
            alt="Upload preview"
            className="mx-auto max-h-48 rounded-lg object-contain"
          />
          <button
            onClick={(e) => { e.stopPropagation(); clear(); }}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-110"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 ring-1 ring-brand-500/20">
            {dragOver ? (
              <Upload className="h-6 w-6 text-brand-500" />
            ) : (
              <ImageIcon className="h-6 w-6 text-brand-500" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
              {dragOver ? 'Drop image here' : 'Drop an image or click to browse'}
            </p>
            <p className="mt-1 text-xs text-text-tertiary dark:text-dark-text-tertiary">
              PNG, JPG or WebP up to {maxSizeMB}MB
            </p>
          </div>
        </>
      )}

      <input
        id="image-upload-input"
        type="file"
        accept={accept}
        onChange={handleInput}
        className="hidden"
      />
    </div>
  );
}
