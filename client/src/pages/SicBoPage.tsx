import GameShell from '../components/layout/GameShell';
import SicBoGame from '../components/sicbo/SicBoGame';

export default function SicBoPage() {
  return (
    <GameShell title="Sic Bo">
      <SicBoGame />
    </GameShell>
  );
}
