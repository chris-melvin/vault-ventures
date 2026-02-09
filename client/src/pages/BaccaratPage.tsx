import GameShell from '../components/layout/GameShell';
import BaccaratGame from '../components/baccarat/BaccaratGame';

export default function BaccaratPage() {
  return (
    <GameShell title="Baccarat">
      <BaccaratGame />
    </GameShell>
  );
}
