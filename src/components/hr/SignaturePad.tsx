import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

export function SignaturePad({
  canvasRef,
  onChange,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onChange: (dataUrl: string | null) => void;
}) {
  const drawing = useRef(false);

  const getPos = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onChange(null);
    }
  };

  return (
    <div className="space-y-1">
      <div className="border rounded-md bg-white">
        <canvas
          ref={canvasRef}
          width={460}
          height={140}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
      <Button type="button" size="sm" variant="ghost" onClick={clear}>
        <Eraser className="h-3.5 w-3.5 mr-1.5" /> Clear
      </Button>
    </div>
  );
}
