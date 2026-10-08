import { useEffect, useMemo } from 'react';

// Revoking is deferred a tick so StrictMode's mount → unmount → mount check
// (which reuses the memoised URL) doesn't revoke a URL that is still shown.
const pendingRevokes = new Map<string, ReturnType<typeof setTimeout>>();

/** Object URL for a blob, revoked automatically when the blob changes or unmounts. */
export function useObjectUrl(blob: Blob | null | undefined) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => {
    if (!url) return;
    clearTimeout(pendingRevokes.get(url));
    pendingRevokes.delete(url);
    return () => {
      pendingRevokes.set(
        url,
        setTimeout(() => {
          URL.revokeObjectURL(url);
          pendingRevokes.delete(url);
        }),
      );
    };
  }, [url]);
  return url;
}
