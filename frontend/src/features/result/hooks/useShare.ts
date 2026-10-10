import { useState } from 'react';

type ShareState = 'idle' | 'busy' | 'copied' | 'failed';

const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText;

/**
 * Shares a link using the native share sheet, or copies it to the clipboard.
 * Both APIs need HTTPS or localhost, so on a plain-HTTP LAN address `supported`
 * is false and the button is hidden.
 */
export function useShare(url: string) {
  const [state, setState] = useState<ShareState>('idle');
  const absolute = new URL(url, window.location.href).href;

  const share = async (title: string) => {
    setState('busy');
    try {
      if (canNativeShare) {
        await navigator.share({ url: absolute, title });
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
