import { formatCents } from '../../lib/constants';
import type { UTHBetBreakdown } from '@shared/types';

interface UTHBetAreasProps {
  bets: UTHBetBreakdown;
}

const AREAS: { key: keyof UTHBetBreakdown; label: string; color: string }[] = [
  { key: 'ante_cents', label: 'ANTE', color: '#d4af37' },
  { key: 'blind_cents', label: 'BLIND', color: '#2980b9' },
  { key: 'play_cents', label: 'PLAY', color: '#27ae60' },
  { key: 'trips_cents', label: 'TRIPS', color: '#8e44ad' },
];

export default function UTHBetAreas({ bets }: UTHBetAreasProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      {AREAS.map(({ key, label, color }) => {
        const amount = bets[key];
        return (
          <div
            key={key}
            className="flex flex-col items-center"
            style={{ opacity: amount > 0 ? 1 : 0.3 }}
          >
            <div
              className="w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center text-[10px]"
              style={{
                borderColor: color,
                backgroundColor: amount > 0 ? `${color}20` : 'transparent',
              }}
            >
              <span className="font-bold text-white/70">{label}</span>
              {amount > 0 && (
                <span className="text-white/90 font-bold text-[9px]">{formatCents(amount)}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
