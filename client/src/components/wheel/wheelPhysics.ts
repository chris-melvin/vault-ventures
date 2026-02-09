import { WHEEL_SEGMENT_COUNT } from '@shared/types';

const DEG_PER_SEGMENT = 360 / WHEEL_SEGMENT_COUNT;

// Quintic ease-out: fast start, long satisfying deceleration tail
function easeOutQuint(t: number): number {
  return 1 + (--t) * t * t * t * t;
}

export type SpinPhase = 'idle' | 'free-spin' | 'decelerating' | 'stopped';

export interface WheelPhysicsState {
  phase: SpinPhase;
  angle: number;               // cumulative angle (degrees)
  freeSpinVelocity: number;    // degrees per ms during free-spin
  decelStartAngle: number;     // angle when deceleration began
  decelTotalRotation: number;  // total degrees to travel during deceleration
  decelStartTime: number;      // performance.now() when deceleration began
  decelDuration: number;       // duration of deceleration in ms
  lastSegment: number;         // for peg detection
  onPegHit?: () => void;
  onSettled?: () => void;
}

const FREE_SPIN_SPEED = 0.72;    // degrees per ms (~720 deg/sec, ~12 deg/frame at 60fps)
const DECEL_DURATION = 4000;      // 4 seconds of deceleration
const MIN_EXTRA_SPINS = 4;
const MAX_EXTRA_SPINS = 6;

export function createWheelState(): WheelPhysicsState {
  return {
    phase: 'idle',
    angle: 0,
    freeSpinVelocity: FREE_SPIN_SPEED,
    decelStartAngle: 0,
    decelTotalRotation: 0,
    decelStartTime: 0,
    decelDuration: DECEL_DURATION,
    lastSegment: 0,
  };
}

export function startSpin(state: WheelPhysicsState): void {
  state.phase = 'free-spin';
  state.freeSpinVelocity = FREE_SPIN_SPEED;
}

export function setTarget(state: WheelPhysicsState, segmentIndex: number): void {
  // The pointer is fixed at top (0 deg). Segments are drawn clockwise.
  // To land segment i under the pointer: angle%360 = 360 - segmentCenter
  const segmentCenter = segmentIndex * DEG_PER_SEGMENT + DEG_PER_SEGMENT * 0.5;
  // Add small random offset within segment (10% padding from edges)
  const padding = DEG_PER_SEGMENT * 0.1;
  const randomOffset = (Math.random() - 0.5) * (DEG_PER_SEGMENT - 2 * padding);
  const targetRemainder = ((360 - segmentCenter - randomOffset) % 360 + 360) % 360;

  // Extra full spins for dramatic effect
  const extraSpins = MIN_EXTRA_SPINS + Math.floor(Math.random() * (MAX_EXTRA_SPINS - MIN_EXTRA_SPINS + 1));
  const currentNormalized = state.angle % 360;

  // Target angle = current base + extra spins + remainder to reach target
  let targetAngle = state.angle - currentNormalized + extraSpins * 360 + targetRemainder;
  // Ensure we always go forward at least 2 full spins from current position
  while (targetAngle <= state.angle + 720) {
    targetAngle += 360;
  }

  state.decelStartAngle = state.angle;
  state.decelTotalRotation = targetAngle - state.angle;
  state.decelStartTime = performance.now();
  state.decelDuration = DECEL_DURATION;
  state.phase = 'decelerating';
}

export function stepPhysics(state: WheelPhysicsState, now: number): void {
  if (state.phase === 'idle' || state.phase === 'stopped') return;

  const prevAngle = state.angle;

  if (state.phase === 'free-spin') {
    // Constant velocity rotation
    state.angle += state.freeSpinVelocity * 16; // ~16ms per frame
  } else if (state.phase === 'decelerating') {
    const elapsed = now - state.decelStartTime;
    const t = Math.min(elapsed / state.decelDuration, 1.0);
    const easedT = easeOutQuint(t);

    state.angle = state.decelStartAngle + easedT * state.decelTotalRotation;

    if (t >= 1.0) {
      state.angle = state.decelStartAngle + state.decelTotalRotation;
      state.phase = 'stopped';
      // Normalize angle to prevent float drift across many spins
      state.angle = state.angle % 360;
      state.onSettled?.();
      return;
    }
  }

  // Peg detection: fire when we cross a segment boundary
  const currentSegment = Math.floor(((state.angle % 360) + 360) % 360 / DEG_PER_SEGMENT);
  if (currentSegment !== state.lastSegment) {
    // Only fire pegs when moving fast enough to hear distinct clicks
    const angleDelta = state.angle - prevAngle;
    if (angleDelta > 0.3) {
      state.onPegHit?.();
    }
    state.lastSegment = currentSegment;
  }
}

export function getDisplayAngle(state: WheelPhysicsState): number {
  return ((state.angle % 360) + 360) % 360;
}

export function getPointerSegment(state: WheelPhysicsState): number {
  const display = ((360 - (state.angle % 360)) % 360 + 360) % 360;
  return Math.floor(display / DEG_PER_SEGMENT) % WHEEL_SEGMENT_COUNT;
}
