import { useRef, useEffect } from 'react';

export default function WaveformVisualizer({ analyser, isActive, mode = 'bars', color = '#00f3ff', height = 80 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      if (!analyser?.current || !isActive) {
        // Draw flat idle line
        ctx.strokeStyle = color + '40';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();
        return;
      }

      const node = analyser.current;
      const bufLen = node.frequencyBinCount;

      if (mode === 'bars') {
        const data = new Uint8Array(bufLen);
        node.getByteFrequencyData(data);
        const barW = W / bufLen * 2;
        let x = 0;
        for (let i = 0; i < bufLen; i++) {
          const barH = (data[i] / 255) * H;
          const alpha = 0.4 + (data[i] / 255) * 0.6;
          ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
          ctx.fillRect(x, H - barH, barW - 1, barH);
          x += barW;
        }
      } else {
        // Waveform mode
        const data = new Uint8Array(bufLen * 2);
        node.getByteTimeDomainData(data);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.beginPath();
        const sliceW = W / data.length;
        let x = 0;
        for (let i = 0; i < data.length; i++) {
          const v = data[i] / 128.0;
          const y = (v * H) / 2;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          x += sliceW;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, isActive, mode, color]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: `${height}px`, display: 'block' }}
      className="rounded"
    />
  );
}
