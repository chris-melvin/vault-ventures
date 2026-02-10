import GameShell from '../components/layout/GameShell';
import PinballGame from '../components/pinball/PinballGame';

export default function PinballPage() {
  return (
    <GameShell title="Pinball Slots">
      <PinballGame />
    </GameShell>
  );
}
