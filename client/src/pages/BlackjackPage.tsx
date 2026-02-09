import GameShell from '../components/layout/GameShell';
import BlackjackGame from '../components/blackjack/BlackjackGame';

export default function BlackjackPage() {
  return (
    <GameShell title="Blackjack">
      <BlackjackGame />
    </GameShell>
  );
}
