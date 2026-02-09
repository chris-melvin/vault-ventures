import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { WHEEL_SEGMENTS, WHEEL_SEGMENT_COUNT, getSymbolConfig } from '@shared/types';

export interface WheelCanvasHandle {
  draw(angle: number): void;
}

interface WheelCanvasProps {
  size: number;
}

const WheelCanvas = forwardRef<WheelCanvasHandle, WheelCanvasProps>(({ size }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  // Pre-render wheel segments to offscreen canvas
  useEffect(() => {
    const offscreen = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    offscreen.width = size * dpr;
    offscreen.height = size * dpr;
    const ctx = offscreen.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 8;
    const segAngle = (Math.PI * 2) / WHEEL_SEGMENT_COUNT;

    // Draw segments
    for (let i = 0; i < WHEEL_SEGMENT_COUNT; i++) {
      const startAngle = i * segAngle - Math.PI / 2;
      const endAngle = startAngle + segAngle;
      const symbol = WHEEL_SEGMENTS[i];
      const config = getSymbolConfig(symbol);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = config.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Labels: payout number + small emoji
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + segAngle / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Payout label
      ctx.fillStyle = config.labelColor;
      const payoutLabel = config.payout === 1 ? '1' : `${config.payout}`;
      ctx.font = `bold ${config.payout >= 23 ? 12 : 10}px sans-serif`;
      ctx.fillText(payoutLabel, radius * 0.75, 0);

      // Emoji (smaller, closer to center)
      ctx.font = `${8}px sans-serif`;
      ctx.fillText(config.emoji, radius * 0.55, 0);

      ctx.restore();
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0f';
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center text
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SOLAIRE', cx, cy);

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Pegs
    for (let i = 0; i < WHEEL_SEGMENT_COUNT; i++) {
      const pegAngle = i * segAngle - Math.PI / 2;
      const px = cx + Math.cos(pegAngle) * (radius - 3);
      const py = cy + Math.sin(pegAngle) * (radius - 3);
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#d4af37';
      ctx.fill();
    }

    offscreenRef.current = offscreen;

    // Initial draw at angle 0
    drawToCanvas(0);
  }, [size]);

  function drawToCanvas(angle: number) {
    const canvas = canvasRef.current;
    const offscreen = offscreenRef.current;
    if (!canvas || !offscreen) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(offscreen, 0, 0);
    ctx.restore();
  }

  // Expose draw method so the parent can call it directly from rAF
  useImperativeHandle(ref, () => ({
    draw(angle: number) {
      drawToCanvas(angle);
    },
  }));

  const dpr = window.devicePixelRatio || 1;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        width={size * dpr}
        height={size * dpr}
        style={{ width: size, height: size }}
      />
      {/* Pointer */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: -4 }}
      >
        <div
          className="w-0 h-0"
          style={{
            borderLeft: '14px solid transparent',
            borderRight: '14px solid transparent',
            borderTop: '24px solid #d4af37',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          }}
        />
      </div>
    </div>
  );
});

WheelCanvas.displayName = 'WheelCanvas';
export default WheelCanvas;
