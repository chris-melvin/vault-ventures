import GameShell from '../components/layout/GameShell';
import WheelGame from '../components/wheel/WheelGame';

export default function WheelPage() {
  return (
    <GameShell title="Money Wheel">
      <WheelGame />
    </GameShell>
  );
}
