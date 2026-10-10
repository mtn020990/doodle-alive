import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { canvasToBlob } from '@/shared/lib/image';

const CHECK_MS = 200;
const STEADY_CHECKS = 8; // ~1.6 s of holding still
const MOVE_LIMIT = 6; // mean pixel change (0-255) still counted as "steady"
const MIN_LIGHT = 70; // mean brightness: below this, ask for more light

export type CameraHint =
  | { kind: 'starting' }
  | { kind: 'fit' }
  | { kind: 'light' }
  | { kind: 'hold'; seconds: number }
  | { kind: 'got' }
  | { kind: 'error'; message: string };

/** Only HTTPS pages (or localhost) get a live camera. */
export const liveCameraSupported = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

/**
 * Live camera that snaps by itself once the phone is held still: compares tiny
 * greyscale frames, and when they stop changing for ~1.6 s, takes the photo.
 * The server then finds the sheet, flattens it and whitens shadows.
 */
export function useSteadyCamera(onPhoto: (photo: File) => void, open: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hint, setHint] = useState<CameraHint>({ kind: 'starting' });
  const done = useRef(false);
  const captureId = useRef(0);
  const onPhotoRef = useRef(onPhoto);
  useEffect(() => {
    onPhotoRef.current = onPhoto;
  });

  useLayoutEffect(() => {
    done.current = !open;
    captureId.current += 1;
    return () => {
      done.current = true;
      captureId.current += 1;
    };
  }, [open]);

  const snap = useCallback(() => {
    const video = videoRef.current;
    if (!open || !video?.videoWidth || done.current) return;
    done.current = true;
    const currentCapture = ++captureId.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    setHint({ kind: 'got' });
    canvasToBlob(canvas, 'image/jpeg', 0.92)
      .then((blob) => {
        if (currentCapture === captureId.current) {
          onPhotoRef.current(new File([blob], 'camera.jpg', { type: 'image/jpeg' }));
        }
      })
      .catch(() => {
        // Encoding failed (e.g. low memory on a phone): let the person try again.
        if (currentCapture === captureId.current) {
          done.current = false;
          setHint({ kind: 'fit' });
        }
      });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
          audio: false,
        });
      } catch (err) {
        if (!cancelled) setHint({ kind: 'error', message: (err as Error).message });
        return;
      }
      if (cancelled) return stream.getTracks().forEach((track) => track.stop());
      const video = videoRef.current!;
      video.srcObject = stream;
      setHint({ kind: 'fit' });

      const probe = document.createElement('canvas');
      probe.width = 64;
      probe.height = 48;
      const pctx = probe.getContext('2d', { willReadFrequently: true })!;
      let previous: Float32Array | null = null;
      let steady = 0;
      timer = setInterval(() => {
        if (!video.videoWidth || done.current) return;
        pctx.drawImage(video, 0, 0, probe.width, probe.height);
        const { data } = pctx.getImageData(0, 0, probe.width, probe.height);
        const grey = new Float32Array(probe.width * probe.height);
        let light = 0;
        for (let i = 0; i < grey.length; i += 1) {
          grey[i] = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
          light += grey[i];
        }
        light /= grey.length;
        let moved = 255;
        if (previous) {
          moved = 0;
          for (let i = 0; i < grey.length; i += 1) moved += Math.abs(grey[i] - previous[i]);
          moved /= grey.length;
        }
        previous = grey;

        if (light < MIN_LIGHT) {
          steady = 0;
          return setHint({ kind: 'light' });
        }
        steady = moved < MOVE_LIMIT ? steady + 1 : 0;
        if (steady === 0) return setHint({ kind: 'fit' });
        const left = STEADY_CHECKS - steady;
        if (left > 0) return setHint({ kind: 'hold', seconds: Math.ceil((left * CHECK_MS) / 500) });
        snap();
      }, CHECK_MS);
    })();

    return () => {
      cancelled = true;
      clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open, snap]);

  return { videoRef, hint, snap };
}
