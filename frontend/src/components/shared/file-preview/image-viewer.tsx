'use client';

import * as React from 'react';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageViewerProps {
  url: string;
  alt?: string;
}

/**
 * Image Viewer — lightbox voi zoom, pan, rotate.
 */
export function ImageViewer({ url, alt }: ImageViewerProps) {
  const [scale, setScale] = React.useState<number>(1);
  const [rotation, setRotation] = React.useState<number>(0);
  const [pos, setPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragState = React.useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  const zoomIn = () => setScale((s) => Math.min(5, +(s + 0.25).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(0.25, +(s - 0.25).toFixed(2)));
  const rotate = () => setRotation((r) => (r + 90) % 360);

  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    dragState.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.dragging) return;
    setPos({
      x: dragState.current.origX + (e.clientX - dragState.current.startX),
      y: dragState.current.origY + (e.clientY - dragState.current.startY),
    });
  };

  const onMouseUp = () => {
    dragState.current.dragging = false;
  };

  return (
    <div className="flex flex-col bg-black">
      {/* Controls */}
      <div className="flex items-center justify-between p-2 bg-gray-900 text-white">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            className="text-white hover:bg-gray-800"
            title="Thu nho"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs min-w-[42px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            className="text-white hover:bg-gray-800"
            title="Phong to"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={rotate}
          className="text-white hover:bg-gray-800"
          title="Xoay"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Image container */}
      <div
        className="relative flex-1 overflow-hidden flex items-center justify-center min-h-[50vh]"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: scale > 1 ? 'grab' : 'default' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt ?? ''}
          className="max-w-full max-h-[70vh] select-none"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: dragState.current.dragging ? 'none' : 'transform 0.1s',
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
