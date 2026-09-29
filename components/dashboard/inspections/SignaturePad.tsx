'use client';

import React, { useRef, useState, useEffect } from 'react';
import { PenLine, RotateCcw, UploadCloud, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignaturePadProps {
  onSign: (signatureBase64: string | null) => void;
  initialSignature?: string | null;
  label?: string;
  className?: string;
}

export function SignaturePad({
  onSign,
  initialSignature = null,
  label = 'Signature',
  className,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!initialSignature);
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const [uploadedImage, setUploadedImage] = useState<string | null>(initialSignature);

  useEffect(() => {
    if (mode === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      }
    }
  }, [mode]);

  const getCoordinates = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
      | MouseEvent
      | TouchEvent
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ('clientX' in event) {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (mode !== 'draw') return;
    setIsDrawing(true);
    setIsEmpty(false);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (mode !== 'draw') return;
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing || mode !== 'draw') return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas) {
      // Create an offscreen canvas with white background to ensure clean PDF export
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        offCtx.fillStyle = '#ffffff';
        offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
        offCtx.drawImage(canvas, 0, 0);
        const dataUrl = offscreen.toDataURL('image/png');
        onSign(dataUrl);
      } else {
        const dataUrl = canvas.toDataURL('image/png');
        onSign(dataUrl);
      }
    }
  };

  const clearSignature = () => {
    setUploadedImage(null);
    setIsEmpty(true);
    onSign(null);

    if (mode === 'draw') {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setUploadedImage(base64String);
        setIsEmpty(false);
        onSign(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={cn('w-full flex flex-col gap-2.5', className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <PenLine className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            {label}
          </span>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setMode('draw');
                clearSignature();
              }}
              className={cn(
                'px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors',
                mode === 'draw'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              Draw
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('upload');
                clearSignature();
              }}
              className={cn(
                'px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider transition-colors',
                mode === 'upload'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              Upload
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={clearSignature}
          className="text-xs font-semibold text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 px-2.5 py-1 rounded-full cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" /> Clear
        </button>
      </div>

      <div className="relative w-full h-36 bg-white border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden group hover:border-teal-500 dark:hover:border-teal-400 transition-colors shadow-inner flex items-center justify-center">
        {mode === 'draw' ? (
          <>
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 select-none">
                <span className="text-sm font-semibold tracking-widest uppercase text-slate-500">
                  Sign here with mouse or finger
                </span>
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={800}
              height={280}
              style={{ width: '100%', height: '100%', touchAction: 'none' }}
              className="cursor-crosshair relative z-10"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center relative p-3">
            {uploadedImage ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={uploadedImage}
                  alt="Uploaded Signature"
                  className="max-h-24 max-w-full object-contain"
                />
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Signature loaded
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">Upload Signature Image</span>
                <span className="text-[10px] text-slate-400">PNG, JPG, or SVG</span>
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/png, image/jpeg, image/jpg, image/svg+xml"
              className="hidden"
            />
          </div>
        )}

        {/* Signature Baseline */}
        <div className="absolute bottom-5 left-6 right-6 h-[1px] bg-slate-200 dark:bg-slate-700 pointer-events-none" />
      </div>

      <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
        By signing, you acknowledge this is an authentic representation of your signature for this condition report.
      </p>
    </div>
  );
}
