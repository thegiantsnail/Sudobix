import * as THREE from 'three';
import { BorderConfig, COLORS } from './constants';

const textureCache: Record<string, THREE.CanvasTexture> = {};

// Text color logic
const getTextFillColor = (bgColorHex: string): string => {
  const hex = bgColorHex.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
};

export const getNumberTexture = (number: number, color: string, borders: BorderConfig = {}): THREE.Texture => {
  // Generate cache key including widths
  const fmt = (s: any) => s ? `${s.color}_${s.ratio.toFixed(3)}` : 'x';
  const borderKey = `${fmt(borders.top)}-${fmt(borders.bottom)}-${fmt(borders.left)}-${fmt(borders.right)}`;
  const key = `${color}-${number}-${borderKey}`;
  
  if (textureCache[key]) {
    return textureCache[key];
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128; 
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const size = 128;
  
  if (ctx) {
    // 1. Fill Background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);

    // Calculate insets in pixels
    const insetTop = (borders.top?.ratio || 0) * size;
    const insetBottom = (borders.bottom?.ratio || 0) * size;
    const insetLeft = (borders.left?.ratio || 0) * size;
    const insetRight = (borders.right?.ratio || 0) * size;

    // Define the inner rectangle (the area NOT covered by borders)
    const ix1 = insetLeft;
    const iy1 = insetTop;
    const ix2 = size - insetRight;
    const iy2 = size - insetBottom;

    // 2. Draw Borders
    // We draw 4 trapezoids. They naturally form mitered corners where they meet.

    if (borders.top && insetTop > 0) {
        ctx.fillStyle = borders.top.color;
        ctx.beginPath();
        ctx.moveTo(0, 0);          // Top-Left outer
        ctx.lineTo(size, 0);       // Top-Right outer
        ctx.lineTo(ix2, iy1);      // Top-Right inner
        ctx.lineTo(ix1, iy1);      // Top-Left inner
        ctx.closePath();
        ctx.fill();
    }

    if (borders.bottom && insetBottom > 0) {
        ctx.fillStyle = borders.bottom.color;
        ctx.beginPath();
        ctx.moveTo(0, size);       // Bottom-Left outer
        ctx.lineTo(size, size);    // Bottom-Right outer
        ctx.lineTo(ix2, iy2);      // Bottom-Right inner
        ctx.lineTo(ix1, iy2);      // Bottom-Left inner
        ctx.closePath();
        ctx.fill();
    }

    if (borders.left && insetLeft > 0) {
        ctx.fillStyle = borders.left.color;
        ctx.beginPath();
        ctx.moveTo(0, 0);          // Top-Left outer
        ctx.lineTo(0, size);       // Bottom-Left outer
        ctx.lineTo(ix1, iy2);      // Bottom-Left inner
        ctx.lineTo(ix1, iy1);      // Top-Left inner
        ctx.closePath();
        ctx.fill();
    }

    if (borders.right && insetRight > 0) {
        ctx.fillStyle = borders.right.color;
        ctx.beginPath();
        ctx.moveTo(size, 0);       // Top-Right outer
        ctx.lineTo(size, size);    // Bottom-Right outer
        ctx.lineTo(ix2, iy2);      // Bottom-Right inner
        ctx.lineTo(ix2, iy1);      // Top-Right inner
        ctx.closePath();
        ctx.fill();
    }

    // 3. Text
    ctx.font = 'bold 60px sans-serif'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = getTextFillColor(color);
    // Center text based on absolute center
    ctx.fillText(number.toString(), size / 2, size / 2 + 4); 
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  textureCache[key] = texture;
  return texture;
};