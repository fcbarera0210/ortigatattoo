import { useCallback, useRef, useState } from 'react';
import { convertHeicToJpgIfNeeded, optimizeImage, uploadGalleryImage } from '../../lib/image-upload';
import { toast } from '../../lib/toast';

type UploadStep = 'receiving' | 'heic' | 'optimizing' | 'uploading' | 'done';

const UPLOAD_STEP_LABELS: Record<UploadStep, string> = {
  receiving: 'Recibiendo imagen',
  heic: 'Transformando HEIC a JPG',
  optimizing: 'Optimizando imagen',
  uploading: 'Subiendo a la nube',
  done: 'Listo',
};

type ImageUploaderProps = {
  businessSlug: string;
  disabled?: boolean;
  kind?: 'gallery' | 'flash' | 'reference';
  onUploaded: (url: string) => void | Promise<void>;
};

export function ImageUploader({
  businessSlug,
  disabled = false,
  kind = 'gallery',
  onUploaded,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<UploadStep>('receiving');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isHeicFile = useCallback(
    (f: File) =>
      /\.(heic|heif)$/i.test(f.name) ||
      ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'].includes(f.type),
    [],
  );

  const handleUpload = useCallback(
    async (file: File) => {
      if (disabled) return;

      const isImage = file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name);
      if (!isImage) {
        toast.error('Selecciona una imagen (JPG, PNG, WebP o HEIC).');
        return;
      }

      setUploading(true);
      setUploadStep('receiving');
      setUploadProgress(5);

      try {
        let forOptimization: File;
        if (isHeicFile(file)) {
          setUploadStep('heic');
          setUploadProgress(15);
          forOptimization = await convertHeicToJpgIfNeeded(file);
          setUploadProgress(35);
        } else {
          forOptimization = file;
          setUploadProgress(30);
        }

        setUploadStep('optimizing');
        setUploadProgress(40);
        const optimized = await optimizeImage(forOptimization);
        setUploadProgress(65);

        setUploadStep('uploading');
        setUploadProgress(70);
        const url = await uploadGalleryImage(optimized, businessSlug, kind);

        setUploadProgress(100);
        setUploadStep('done');
        await onUploaded(url);
      } catch (e) {
        console.error(e);
        toast.error(e instanceof Error ? e.message : 'Error al subir la imagen');
      } finally {
        setUploading(false);
        setUploadProgress(0);
        setUploadStep('receiving');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [businessSlug, disabled, kind, isHeicFile, onUploaded],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div>
      <span className="text-sm font-medium">Subir foto</span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        className={`mt-2 cursor-pointer rounded-md border-2 border-dashed p-6 text-center transition ${
          disabled
            ? 'cursor-not-allowed border-border/50 opacity-50'
            : dragOver
              ? 'border-ink bg-surface-light'
              : 'border-border hover:border-ink/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
        />
        {uploading ? (
          <div className="mx-auto max-w-sm text-left">
            <p className="text-sm font-medium">{UPLOAD_STEP_LABELS[uploadStep]}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
              <div className="h-full bg-ink transition-all duration-500" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted">{uploadProgress}%</p>
          </div>
        ) : (
          <p className="text-sm text-muted">
            {disabled
              ? 'Límite alcanzado'
              : 'Arrastrá una imagen o hacé clic para seleccionar (JPG, PNG, WebP, HEIC)'}
          </p>
        )}
      </div>
    </div>
  );
}
