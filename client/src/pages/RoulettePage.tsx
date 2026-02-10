import GameShell from '../components/layout/GameShell';
import RouletteGame from '../components/roulette/RouletteGame';

export default function RoulettePage() {
  return (
    <GameShell title="Roulette">
      <RouletteGame />
    </GameShell>
  );
}
