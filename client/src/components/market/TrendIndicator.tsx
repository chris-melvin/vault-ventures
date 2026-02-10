interface Props {
  percent: number;
  size?: 'sm' | 'md';
}

export default function TrendIndicator({ percent, size = 'sm' }: Props) {
  const isUp = percent > 0;
  const isFlat = percent === 0;
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-bold ${textSize} ${
        isFlat ? 'text-white/40' : isUp ? 'text-green-400' : 'text-red-400'
      }`}
    >
      {!isFlat && (
        <span className="text-[10px]">{isUp ? '\u25B2' : '\u25BC'}</span>
      )}
      {isFlat ? '--' : `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`}
    </span>
  );
}
