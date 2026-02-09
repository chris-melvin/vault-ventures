import type { UTHAction, UTHPhase } from '@shared/types';
import { formatCents } from '../../lib/constants';

export function actionLabel(action: UTHAction, anteCents: number): string {
  switch (action) {
    case 'bet4x': return `BET 4X (${formatCents(anteCents * 4)})`;
    case 'bet3x': return `BET 3X (${formatCents(anteCents * 3)})`;
    case 'bet2x': return `BET 2X (${formatCents(anteCents * 2)})`;
    case 'bet1x': return `BET 1X (${formatCents(anteCents)})`;
    case 'check': return 'CHECK';
    case 'fold': return 'FOLD';
  }
}

export function phaseLabel(phase: UTHPhase): string {
  switch (phase) {
    case 'preflop': return 'Pre-Flop';
    case 'flop': return 'Flop';
    case 'river': return 'Turn & River';
    case 'showdown': return 'Showdown';
  }
}
