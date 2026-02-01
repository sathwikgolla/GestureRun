(() => {
  const videoEl = document.getElementById('camera');
  const debugCanvas = document.getElementById('debugCanvas');
  const debugCtx = debugCanvas.getContext('2d');

  const gestureEl = document.getElementById('gesture');
  const handStatusEl = document.getElementById('handStatus');

  // Gesture detection uses palm center landmark 9.
  // We compare normalized coordinates (0..1) between frames.
  // IMPORTANT: We only emit one gesture at a time using a cooldown.

  const settings = {
    maxHands: 1,
    modelComplexity: 0,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,

    // Throttle processing to reduce CPU usage / lag.
    maxFps: 20,

    // Movement threshold in normalized units (0..1)
    // Lower -> more sensitive; higher -> less accidental triggers.
    threshold: 0.045,

    // Cooldown to avoid repeated triggers while the hand keeps moving
    cooldownMs: 220,

    // Prefer horizontal gestures when both dx and dy are large
    axisBias: 1.1,

    // Disable debug drawing for performance
    debugDraw: false,
  };

  // Single-finger control: index fingertip (landmark 8)
  let smoothPoint = null;
  let prevPoint = null;
  let anchorPoint = null;
  let anchorTs = 0;
  let lastEmitTs = 0;
  let lastGesture = '—';
  let gestureFlashT = 0;
  let lastProcessedTs = 0;

  function setHandStatus(text) {
    handStatusEl.textContent = text;
  }

  function showGesture(g) {
    lastGesture = g;
    gestureEl.textContent = g;
    gestureFlashT = performance.now();
  }

  function emitGesture(g) {
    const now = performance.now();
    if (now - lastEmitTs < settings.cooldownMs) return;
    lastEmitTs = now;

    showGesture(g);

    if (window.GestureRunner && typeof window.GestureRunner.onGesture === 'function') {
      window.GestureRunner.onGesture(g, now);
    }

    if (anchorPoint) {
      anchorPoint.x = smoothPoint ? smoothPoint.x : anchorPoint.x;
      anchorPoint.y = smoothPoint ? smoothPoint.y : anchorPoint.y;
      anchorTs = now;
    }
  }

  function classifyMovement(dx, dy) {
    const t = settings.threshold;

    // axisBias: require the dominant axis to be noticeably larger
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);

    const horizontalStrong = ax > t && ax > ay * settings.axisBias;
    const verticalStrong = ay > t && ay > ax * settings.axisBias;

    if (horizontalStrong) {
      return dx > 0 ? 'RIGHT' : 'LEFT';
    }

    if (verticalStrong) {
      // Note: y increases downward in image coordinates
      return dy < 0 ? 'JUMP' : 'SLIDE';
    }

    // If not strongly biased, allow either axis to trigger
    if (dx > t) return 'RIGHT';
    if (dx < -t) return 'LEFT';
    if (dy < -t) return 'JUMP';
    if (dy > t) return 'SLIDE';

    return null;
  }

  function drawDebug(results) {
    if (!settings.debugDraw) return;

    debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);

    // Draw video frame
    debugCtx.save();
    debugCtx.drawImage(results.image, 0, 0, debugCanvas.width, debugCanvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length) {
      const landmarks = results.multiHandLandmarks[0];
      drawConnectors(debugCtx, landmarks, HAND_CONNECTIONS, {
        color: 'rgba(0, 255, 200, 0.65)',
        lineWidth: 2,
      });
      drawLandmarks(debugCtx, landmarks, {
        color: 'rgba(255, 255, 255, 0.9)',
        lineWidth: 1,
        radius: 2,
      });

      // Highlight index fingertip (landmark 8)
      const p = landmarks[8];
      debugCtx.fillStyle = 'rgba(255, 90, 90, 0.95)';
      debugCtx.beginPath();
      debugCtx.arc(p.x * debugCanvas.width, p.y * debugCanvas.height, 6, 0, Math.PI * 2);
      debugCtx.fill();
    }

    // Gesture text overlay
    const now = performance.now();
    const flash = now - gestureFlashT < 220;

    debugCtx.fillStyle = flash ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.72)';
    debugCtx.font = '700 16px ui-sans-serif, system-ui';
    debugCtx.textBaseline = 'top';
    debugCtx.fillText(`Gesture: ${lastGesture}`, 10, 10);

    debugCtx.restore();
  }

  async function initHands() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHandStatus('getUserMedia not supported in this browser');
      return;
    }

    setHandStatus('Loading hand tracker…');

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: settings.maxHands,
      modelComplexity: settings.modelComplexity,
      minDetectionConfidence: settings.minDetectionConfidence,
      minTrackingConfidence: settings.minTrackingConfidence,
    });

    hands.onResults((results) => {
      if (settings.debugDraw) drawDebug(results);

      const hasHand = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
      if (!hasHand) {
        setHandStatus('Show one hand (index finger)');
        smoothPoint = null;
        prevPoint = null;
        anchorPoint = null;
        anchorTs = 0;
        return;
      }

      setHandStatus('Hand detected (index finger)');

      const landmarks = results.multiHandLandmarks[0];
      const tip = landmarks[8];
      const raw = { x: tip.x, y: tip.y };

      if (!smoothPoint || !prevPoint) {
        smoothPoint = { x: raw.x, y: raw.y };
        prevPoint = { x: raw.x, y: raw.y };
        anchorPoint = { x: raw.x, y: raw.y };
        anchorTs = performance.now();
        return;
      }

      // Smooth fingertip position a bit to reduce jitter
      const alpha = 0.45;
      smoothPoint.x = smoothPoint.x + (raw.x - smoothPoint.x) * alpha;
      smoothPoint.y = smoothPoint.y + (raw.y - smoothPoint.y) * alpha;

      const dx = smoothPoint.x - prevPoint.x;
      const dy = smoothPoint.y - prevPoint.y;

      // Video preview is mirrored for a natural selfie feel.
      // Invert dx so "move hand LEFT" maps to "move runner LEFT".
      const dxMirrored = -dx;

      // Robust gesture detection: measure displacement from a rolling anchor.
      // This allows slower swipes to accumulate instead of requiring a large per-frame delta.
      const now = performance.now();
      if (!anchorPoint) {
        anchorPoint = { x: smoothPoint.x, y: smoothPoint.y };
        anchorTs = now;
      }

      const adx = smoothPoint.x - anchorPoint.x;
      const ady = smoothPoint.y - anchorPoint.y;
      const adxMirrored = -adx;

      const g = classifyMovement(adxMirrored, ady);
      if (g) {
        emitGesture(g);
      } else {
        // If there hasn't been a trigger for a bit, gently recenter the anchor to avoid drift.
        // This keeps gestures responsive without requiring the finger to return to a fixed spot.
        const idleMs = now - anchorTs;
        const recenter = idleMs > 250 ? 0.08 : 0.02;
        anchorPoint.x = anchorPoint.x + (smoothPoint.x - anchorPoint.x) * recenter;
        anchorPoint.y = anchorPoint.y + (smoothPoint.y - anchorPoint.y) * recenter;
      }

      prevPoint.x = smoothPoint.x;
      prevPoint.y = smoothPoint.y;
    });

    setHandStatus('Requesting camera permission…');

    const cam = new Camera(videoEl, {
      onFrame: async () => {
        const now = performance.now();
        const interval = 1000 / settings.maxFps;
        if (now - lastProcessedTs < interval) return;
        lastProcessedTs = now;

        await hands.send({ image: videoEl });
      },
      width: 424,
      height: 240,
    });

    try {
      await cam.start();
      setHandStatus('Tracking active');
    } catch (err) {
      console.error(err);
      setHandStatus('Camera blocked. Use HTTPS or localhost.');
    }
  }

  window.addEventListener('load', () => {
    initHands();
  });
})();
