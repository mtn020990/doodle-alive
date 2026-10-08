import { useEffect, useState } from 'react';

type ShareState = 'idle' | 'busy' | 'copied' | 'failed';

const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText;

/**
 * Shares the animation file when the browser supports it (most phones), else
 * the link, else copies the link. Both APIs need HTTPS or localhost, so on a
 * plain-HTTP LAN address `supported` is false and the button is hidden.
 *
 * The file is downloaded ahead of time: browsers (Safari especially) only allow
 * `navigator.share` right after the tap, not after a long download.
 */
export function useShare(url: string) {
  const [state, setState] = useState<ShareState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const absolute = new URL(url, window.location.href).href;

  useEffect(() => {
    if (!canNativeShare || !navigator.canShare) return;
    let alive = true;
    fetchAsFile(absolute).then((f) => {
      if (alive && f && navigator.canShare({ files: [f] })) setFile(f);
    });
    return () => {
      alive = false;
    };
  }, [absolute]);

  const share = async (title: string) => {
    setState('busy');
    try {
      if (canNativeShare) {
        await navigator.share(file ? { files: [file], title } : { url: absolute, title });
        setState('idle');
      } else {
        await navigator.clipboard.writeText(absolute);
        setState('copied');
      }
    } catch (err) {
      // The user closing the share sheet is not an error.
      setState(err instanceof DOMException && err.name === 'AbortError' ? 'idle' : 'failed');
    }
  };

  return { share, state, supported: canNativeShare || canCopy };
}

async function fetchAsFile(url: string): Promise<File | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const name = url.split('/').pop() || 'doodle-alive';
    return new File([blob], name, { type: blob.type });
  } catch {
    return null;
  }
}
