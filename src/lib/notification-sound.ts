// Real, synthesized notification chime — two short sine tones, no
// external audio file needed. Browsers block audio playback until
// the person has interacted with the page at least once; that's a
// real browser restriction, not a bug, so failures here are caught
// and ignored rather than surfaced as errors.

const MUTE_KEY = "lexora.notifications.muted";

export function isNotificationSoundMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === "true";
}

export function setNotificationSoundMuted(muted: boolean): void {
  localStorage.setItem(MUTE_KEY, String(muted));
}

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

export function playNotificationSound(): void {
  if (isNotificationSoundMuted()) return;

  const ctx = getContext();
  if (!ctx) return;

  const playTone = (
    freq: number,
    startAt: number,
    duration: number,
    peakGain: number,
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration);
  };

  const resumeAndPlay = () => {
    const now = ctx.currentTime;
    playTone(880, now, 0.18, 0.15);
    playTone(1318.5, now + 0.09, 0.22, 0.12);
  };

  if (ctx.state === "suspended") {
    // Autoplay was blocked — silently skip rather than throw. It
    // will start working after the user's next real interaction.
    ctx
      .resume()
      .then(resumeAndPlay)
      .catch(() => {});
  } else {
    resumeAndPlay();
  }
}
