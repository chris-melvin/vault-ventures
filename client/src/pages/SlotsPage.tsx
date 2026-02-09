import GameShell from '../components/layout/GameShell';
import SlotsGame from '../components/slots/SlotsGame';

export default function SlotsPage() {
  return (
    <GameShell title="Slot Machine">
      <SlotsGame />
    </GameShell>
  );
}
