import GameShell from '../components/layout/GameShell';
import UTHGame from '../components/uth/UTHGame';

export default function UTHPage() {
  return (
    <GameShell title="Ultimate Texas Hold'em">
      <UTHGame />
    </GameShell>
  );
}
