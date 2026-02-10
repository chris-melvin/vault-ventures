import { ROULETTE_RED_NUMBERS, ROULETTE_PAYOUTS, type RouletteBet, type RouletteBetType } from '@shared/types';
import { formatCents } from '../../lib/constants';

interface Props {
  bets: RouletteBet[];
  onPlaceBet: (bet: RouletteBet) => void;
  winningNumber: number | null;
  disabled: boolean;
  chipValue: number;
}

function getNumberColor(num: number): string {
  if (num === 0) return 'bg-green-700';
  if (ROULETTE_RED_NUMBERS.includes(num)) return 'bg-red-700';
  return 'bg-gray-900';
}

function getBetAmount(bets: RouletteBet[], type: RouletteBetType, numbers: number[]): number {
  const key = `${type}:${numbers.join(',')}`;
  return bets
    .filter((b) => `${b.type}:${b.numbers.join(',')}` === key)
    .reduce((s, b) => s + b.amount_cents, 0);
}

function NumberCell({
  num,
  bets,
  winningNumber,
  disabled,
  onPlace,
}: {
  num: number;
  bets: RouletteBet[];
  winningNumber: number | null;
  disabled: boolean;
  onPlace: () => void;
}) {
  const amount = getBetAmount(bets, 'straight', [num]);
  const isWinner = winningNumber === num;

  return (
    <button
      onClick={onPlace}
      disabled={disabled}
      className={`
        ${getNumberColor(num)} relative rounded text-center py-2 text-sm font-bold text-white cursor-pointer
        transition-all border
        ${isWinner ? 'border-casino-gold shadow-[0_0_12px_rgba(212,175,55,0.5)] ring-2 ring-casino-gold' : 'border-transparent hover:border-white/30'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {num}
      {amount > 0 && (
        <div className="absolute -top-1 -right-1 bg-casino-gold text-black text-[8px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
          $
        </div>
      )}
    </button>
  );
}

function OutsideBet({
  label,
  type,
  numbers,
  bets,
  winningNumber,
  disabled,
  onPlace,
}: {
  label: string;
  type: RouletteBetType;
  numbers: number[];
  bets: RouletteBet[];
  winningNumber: number | null;
  disabled: boolean;
  onPlace: () => void;
}) {
  const amount = getBetAmount(bets, type, numbers);
  const isWinner = winningNumber !== null && numbers.includes(winningNumber);

  return (
    <button
      onClick={onPlace}
      disabled={disabled}
      className={`
        relative rounded border px-2 py-2 text-center text-xs font-bold text-white cursor-pointer transition-all
        ${isWinner ? 'border-casino-gold bg-casino-gold/20 shadow-[0_0_8px_rgba(212,175,55,0.4)]' :
          amount > 0 ? 'border-casino-gold/50 bg-white/10' : 'border-white/15 bg-white/5 hover:bg-white/10'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {label}
      {amount > 0 && (
        <div className="text-[9px] text-casino-gold mt-0.5">{formatCents(amount)}</div>
      )}
    </button>
  );
}

export default function RouletteBettingTable({ bets, onPlaceBet, winningNumber, disabled, chipValue }: Props) {
  const numbers1to36 = Array.from({ length: 36 }, (_, i) => i + 1);
  const row3 = numbers1to36.filter((n) => n % 3 === 0);
  const row2 = numbers1to36.filter((n) => n % 3 === 2);
  const row1 = numbers1to36.filter((n) => n % 3 === 1);

  const makeBet = (type: RouletteBetType, numbers: number[]) => {
    onPlaceBet({ type, numbers, amount_cents: chipValue });
  };

  const dozen = (n: 1 | 2 | 3) => {
    const start = (n - 1) * 12 + 1;
    return Array.from({ length: 12 }, (_, i) => start + i);
  };

  const column = (col: 1 | 2 | 3) => numbers1to36.filter((n) => n % 3 === (col % 3 === 0 ? 0 : col));

  const redNums = ROULETTE_RED_NUMBERS;
  const blackNums = numbers1to36.filter((n) => !redNums.includes(n));
  const oddNums = numbers1to36.filter((n) => n % 2 === 1);
  const evenNums = numbers1to36.filter((n) => n % 2 === 0);
  const lowNums = numbers1to36.filter((n) => n <= 18);
  const highNums = numbers1to36.filter((n) => n > 18);

  return (
    <div className="w-full space-y-2">
      {/* Main number grid */}
      <div className="grid grid-cols-13 gap-0.5">
        {/* Zero */}
        <div className="row-span-3">
          <NumberCell num={0} bets={bets} winningNumber={winningNumber} disabled={disabled} onPlace={() => makeBet('straight', [0])} />
        </div>
        {/* Row 3 (top) */}
        {row3.map((n) => (
          <NumberCell key={n} num={n} bets={bets} winningNumber={winningNumber} disabled={disabled} onPlace={() => makeBet('straight', [n])} />
        ))}
        {/* Row 2 */}
        {row2.map((n) => (
          <NumberCell key={n} num={n} bets={bets} winningNumber={winningNumber} disabled={disabled} onPlace={() => makeBet('straight', [n])} />
        ))}
        {/* Row 1 */}
        {row1.map((n) => (
          <NumberCell key={n} num={n} bets={bets} winningNumber={winningNumber} disabled={disabled} onPlace={() => makeBet('straight', [n])} />
        ))}
      </div>

      {/* Dozens */}
      <div className="grid grid-cols-3 gap-1">
        <OutsideBet label="1st 12" type="dozen_1" numbers={dozen(1)} bets={bets} winningNumber={winningNumber} disabled={disabled} onPlace={() => makeBet('dozen_1', dozen(1))} />
        <OutsideBet label="2nd 12" type="dozen_2" numbers={dozen(2)} bets={bets} winningNumber={winningNumber} disabled={disabled} onPlace={() => makeBet('dozen_2', dozen(2))} />
        <OutsideBet label="3rd 12" type="dozen_3" numbers={dozen(3)} bets={bets} winningNumber={winningNumber} disabled={disabled} onPlace={() => makeBet('dozen_3', dozen(3))} />
      </div>

      {/* Columns */}
      <div className="grid grid-cols-3 gap-1">
        <OutsideBet label="Col 1" type="column_1" numbers={column(1)} bets={bets} winningNumber={winningNumber} disabled={disabled} onPlace={() => makeBet('column_1', column(1))} />
        <OutsideBet label="Col 2" type="column_2" numbers={column(2)} bets={bets} winningNumber={winningNumber} disabled={disabled} onPlace={() => makeBet('column_2', column(2))} />
        <OutsideBet label="Col 3" type="column_3" numbers={column(3)} bets={bets} winningNumber={winningNumber} disabled={disabled} onPlace={() => makeBet('column_3', column(3))} />
      </div>

      {/* Even-money bets */}
      <div className="grid grid-cols-6 gap-1">
        <OutsideBet label="1-18" type="low" numbers={lowNums} bets={bets} winningNumber={winningNumber} disabled={disabled} onPlace={() => makeBet('low', lowNums)} />
        <OutsideBet label="Even" type="even" numbers={evenNums} bets={bets} winningNumber={winningNumber} disabled={disabled} onPlace={() => makeBet('even', evenNums)} />
        <OutsideBet label="Red" type="red" numbers={redNums} bets={bets} winningNumber={winningNumber} disabled={disabled} onPlace={() => makeBet('red', redNums)} />
        <OutsideBet label="Black" type="black" numbers={blackNums} bets={bets} winningNumber={winningNumber} disabled={disabled} onPlace={() => makeBet('black', blackNums)} />
        <OutsideBet label="Odd" type="odd" numbers={oddNums} bets={bets} winningNumber={winningNumber} disabled={disabled} onPlace={() => makeBet('odd', oddNums)} />
        <OutsideBet label="19-36" type="high" numbers={highNums} bets={bets} winningNumber={winningNumber} disabled={disabled} onPlace={() => makeBet('high', highNums)} />
      </div>
    </div>
  );
}
