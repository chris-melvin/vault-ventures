import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ROULETTE_RED_NUMBERS } from '@shared/types';

// European wheel order
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

function getNumberColor(num: number): string {
  if (num === 0) return '#15803d';
  if (ROULETTE_RED_NUMBERS.includes(num)) return '#dc2626';
  return '#1a1a2e';
}

interface RouletteWheelProps {
  winningNumber: number | null;
  spinning: boolean;
  onSpinComplete?: () => void;
}

export default function RouletteWheel({ winningNumber, spinning, onSpinComplete }: RouletteWheelProps) {
  const [rotation, setRotation] = useState(0);
  const completeCalled = useRef(false);
  const size = 300;
  const center = size / 2;
  const outerRadius = size / 2 - 4;
  const innerRadius = outerRadius * 0.65;
  const segmentAngle = 360 / WHEEL_ORDER.length;

  useEffect(() => {
    if (winningNumber !== null && !completeCalled.current) {
      const index = WHEEL_ORDER.indexOf(winningNumber);
      const targetAngle = 360 - (index * segmentAngle + segmentAngle / 2);
      const fullSpins = 5 * 360;
      setRotation((prev) => prev + fullSpins + targetAngle - (prev % 360));
      completeCalled.current = true;
    }
  }, [winningNumber, segmentAngle]);

  useEffect(() => {
    if (winningNumber === null) {
      completeCalled.current = false;
    }
  }, [winningNumber]);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Pointer */}
      <div
        className="absolute z-10"
        style={{ top: 4, left: '50%', transform: 'translateX(-50%)' }}
      >
        <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[16px] border-l-transparent border-r-transparent border-t-casino-gold" />
      </div>

      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        animate={{ rotate: rotation }}
        transition={{
          duration: spinning ? 0.5 : 4,
          ease: spinning ? 'linear' : [0.2, 0.8, 0.3, 1],
        }}
        onAnimationComplete={() => {
          if (winningNumber !== null && onSpinComplete) {
            onSpinComplete();
          }
        }}
      >
        {/* Outer ring */}
        <circle cx={center} cy={center} r={outerRadius} fill="#2a2a3e" stroke="#8B6914" strokeWidth={2} />

        {/* Segments */}
        {WHEEL_ORDER.map((num, i) => {
          const startAngle = (i * segmentAngle - 90) * (Math.PI / 180);
          const endAngle = ((i + 1) * segmentAngle - 90) * (Math.PI / 180);
          const x1 = center + outerRadius * Math.cos(startAngle);
          const y1 = center + outerRadius * Math.sin(startAngle);
          const x2 = center + outerRadius * Math.cos(endAngle);
          const y2 = center + outerRadius * Math.sin(endAngle);
          const ix1 = center + innerRadius * Math.cos(startAngle);
          const iy1 = center + innerRadius * Math.sin(startAngle);
          const ix2 = center + innerRadius * Math.cos(endAngle);
          const iy2 = center + innerRadius * Math.sin(endAngle);

          const midAngle = ((i + 0.5) * segmentAngle - 90) * (Math.PI / 180);
          const labelRadius = (outerRadius + innerRadius) / 2;
          const lx = center + labelRadius * Math.cos(midAngle);
          const ly = center + labelRadius * Math.sin(midAngle);

          return (
            <g key={num}>
              <path
                d={`M ${ix1} ${iy1} L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 0 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 0 0 ${ix1} ${iy1}`}
                fill={getNumberColor(num)}
                stroke="#333"
                strokeWidth={0.5}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={9}
                fontWeight="bold"
                transform={`rotate(${(i + 0.5) * segmentAngle}, ${lx}, ${ly})`}
              >
                {num}
              </text>
            </g>
          );
        })}

        {/* Center */}
        <circle cx={center} cy={center} r={innerRadius - 2} fill="#1a1a2e" stroke="#555" strokeWidth={1} />
        <text x={center} y={center} textAnchor="middle" dominantBaseline="central" fill="#d4af37" fontSize={14} fontWeight="bold">
          {winningNumber !== null ? winningNumber : ''}
        </text>
      </motion.svg>
    </div>
  );
}
