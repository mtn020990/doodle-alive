'use strict';

// Live camera with a paper guide that snaps by itself once the phone is held still.
// The server then finds the sheet, flattens it and whitens shadows (backend drawing_tools.py).
// Camera.open(onPhoto) shows the view; onPhoto(file) gets a JPEG File. Needs HTTPS (or localhost).
window.Camera = (() => {
  const CHECK_MS = 200;
  const STEADY_CHECKS = 8; // ~1.6 s of holding still
  const MOVE_LIMIT = 6; // mean pixel change (0-255) still counted as "steady"
  const MIN_LIGHT = 70; // mean brightness: below this, ask for more light

  let stream = null;
  let timer = null;
  let onPhoto = null;
  const el = (id) => document.getElementById(id);

  async function open(callback) {
    onPhoto = callback;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('This browser has no live camera here. Use "Take a photo" instead.');
    }
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } },
      audio: false,
    });
    el('cameraVideo').srcObject = stream;
    el('camera').hidden = false;
    hint('Fit the paper inside the frame');
    watchForSteady();
  }

  function close() {
    clearInterval(timer);
    timer = null;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    el('camera').hidden = true;
  }

  function hint(text) {
    el('cameraHint').textContent = text;
  }

  // Compare tiny greyscale frames: when they stop changing, the phone is steady.
  function watchForSteady() {
    const video = el('cameraVideo');
    const probe = document.createElement('canvas');
    probe.width = 64;
    probe.height = 48;
    const pctx = probe.getContext('2d', { willReadFrequently: true });
    let previous = null;
    let steady = 0;
    clearInterval(timer);
    timer = setInterval(() => {
      if (!video.videoWidth) return;
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
        return hint('A bit more light, please 💡');
      }
      steady = moved < MOVE_LIMIT ? steady + 1 : 0;
      if (steady === 0) return hint('Fit the paper inside the frame and hold still');
      const left = STEADY_CHECKS - steady;
      if (left > 0) return hint(`Hold still… ${Math.ceil((left * CHECK_MS) / 500)}`);
      snap();
    }, CHECK_MS);
  }

  function snap() {
    const video = el('cameraVideo');
    if (!video.videoWidth) return;
    clearInterval(timer);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    hint('📸 Got it!');
    canvas.toBlob((blob) => {
      close();
      if (blob && onPhoto) onPhoto(new File([blob], 'camera.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  }

  return { open, close, snap };
})();
