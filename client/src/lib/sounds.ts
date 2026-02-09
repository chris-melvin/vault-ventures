import { useAudioStore } from '../stores/useAudioStore';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function getGain(): number {
  const { volume, muted } = useAudioStore.getState();
  return muted ? 0 : volume;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', gainVal?: number) {
  const vol = gainVal ?? getGain();
  if (vol === 0) return;

  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(vol * 0.3, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

export function playPegTick() {
  const vol = getGain();
  if (vol === 0) return;

  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = 'triangle';
  osc.frequency.value = 2000 + Math.random() * 500;
  gain.gain.setValueAtTime(vol * 0.08, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.03);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.04);
}

export function playChipPlace() {
  const vol = getGain();
  if (vol === 0) return;

  const ac = getCtx();
  // Short click noise
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = 'square';
  osc.frequency.value = 800;
  gain.gain.setValueAtTime(vol * 0.1, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.06);
}

export function playWinFanfare() {
  const vol = getGain();
  if (vol === 0) return;

  // Ascending arpeggio
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.3, 'sine', vol), i * 120);
  });
  // Final sustain chord
  setTimeout(() => {
    playTone(1047, 0.6, 'sine', vol);
    playTone(784, 0.6, 'sine', vol);
    playTone(523, 0.6, 'sine', vol);
  }, notes.length * 120);
}

export function playBigWinFanfare() {
  const vol = getGain();
  if (vol === 0) return;

  const notes = [523, 659, 784, 1047, 1319, 1568];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.35, 'sine', vol), i * 100);
  });
  setTimeout(() => {
    playTone(1568, 0.8, 'sine', vol);
    playTone(1047, 0.8, 'sine', vol);
    playTone(784, 0.8, 'sine', vol);
  }, notes.length * 100);
}

export function playLoseSound() {
  const vol = getGain();
  if (vol === 0) return;

  // Descending tone
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, ac.currentTime + 0.5);
  gain.gain.setValueAtTime(vol * 0.2, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.7);
}

export function playSpinStart() {
  const vol = getGain();
  if (vol === 0) return;

  // Whoosh-like ascending
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(100, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ac.currentTime + 0.3);
  gain.gain.setValueAtTime(vol * 0.08, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.4);
}
