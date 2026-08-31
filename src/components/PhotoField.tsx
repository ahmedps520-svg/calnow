import { useEffect, useRef, useState } from 'react';
import { photoUrl, savePhoto } from '../lib/photos';
import { useStore } from '../lib/store';
import { IconCamera } from './Icons';

export function PhotoField({
  photoId, onChange,
}: {
  photoId?: string;
  onChange: (id: string | undefined) => void;
}) {
  const { t } = useStore();
  const [url, setUrl] = useState<string>();
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    if (!photoId) {
      setUrl(undefined);
      return;
    }
    photoUrl(photoId).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [photoId]);

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await savePhoto(file));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field">
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => pick(e.target.files?.[0] ?? undefined)}
      />
      {url ? (
        <div className="photo-frame">
          <img src={url} alt="" />
          <div className="photo-actions">
            <button type="button" className="photo-pill" onClick={() => input.current?.click()}>
              {t('retakePhoto')}
            </button>
            <button type="button" className="photo-pill" onClick={() => onChange(undefined)}>
              {t('removePhoto')}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="photo-drop" onClick={() => input.current?.click()} disabled={busy}>
          <IconCamera size={26} />
          <span>{busy ? '…' : t('addPhoto')}</span>
          <span className="tiny faint">{t('photoHint')}</span>
          <span className="tiny faint">{t('photoStaysLocal')}</span>
        </button>
      )}
    </div>
  );
}
