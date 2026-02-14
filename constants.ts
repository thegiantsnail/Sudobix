import * as THREE from 'three';

// Cube Dimensions
export const CUBE_ORDER = 9;
export const HALF_ORDER = Math.floor(CUBE_ORDER / 2); // 4
export const CUBE_SPACING = 1.02; // Small gap between cubies
export const ANIMATION_SPEED = 0.5; // Seconds per 90 degree turn

// Colors
export const COLORS = {
  base: '#1a1a1a', // Plastic color
  highlight: '#444444',
  stickers: {
    right: '#b90000', // Red (x=4)
    left: '#ff5900',  // Orange (x=-4)
    top: '#ffffff',   // White (y=4)
    bottom: '#ffd500',// Yellow (y=-4)
    front: '#009b48', // Green (z=4)
    back: '#0045ad',  // Blue (z=-4)
  }
};

export const FACE_PLANES: { axis: 'x' | 'y' | 'z'; value: number }[] = [
  { axis: 'z', value:  HALF_ORDER }, // front
  { axis: 'x', value:  HALF_ORDER }, // right
  { axis: 'z', value: -HALF_ORDER }, // back
  { axis: 'x', value: -HALF_ORDER }, // left
  { axis: 'y', value:  HALF_ORDER }, // top
  { axis: 'y', value: -HALF_ORDER }, // bottom
];

// Sudoku Logic
const generateSudokuGrid = (shift: number): number[][] => {
  const grid: number[][] = [];
  for (let r = 0; r < 9; r++) {
    const row: number[] = [];
    for (let c = 0; c < 9; c++) {
      // Base valid pattern: (r*3 + floor(r/3) + c) % 9
      const baseVal = (r * 3 + Math.floor(r / 3) + c) % 9;
      // Permute numbers based on shift to ensure unique grids per face
      const val = (baseVal + shift) % 9 + 1;
      row.push(val);
    }
    grid.push(row);
  }
  return grid;
};

// Generate 6 unique grids
const SUDOKU_GRIDS = {
  right: generateSudokuGrid(0),
  left: generateSudokuGrid(1),
  top: generateSudokuGrid(2),
  bottom: generateSudokuGrid(3),
  front: generateSudokuGrid(4),
  back: generateSudokuGrid(5),
};

export interface BorderSpec {
  color: string;
  ratio: number;
}

export interface BorderConfig {
  top?: BorderSpec;
  bottom?: BorderSpec;
  left?: BorderSpec;
  right?: BorderSpec;
}

export interface FaceInfo {
  name: keyof typeof COLORS.stickers;
  color: string;
  number: number;
  borders: BorderConfig;
}

// Helper to calculate ratio based on distance from center
const getRatio = (val: number, limit: number): number => {
  // Max border size is 25% of the sticker
  // Scale linearly: Edge (val=4) -> 0.25, Center (val=0) -> 0
  return (Math.abs(val) / limit) * 0.25;
};

// Helper to check if a face should have a sticker and return details
export const getFaceInfo = (initialPos: THREE.Vector3, faceNormal: THREE.Vector3): FaceInfo | null => {
  const limit = HALF_ORDER;
  // Map -4..4 to 0..8
  const x = initialPos.x + limit;
  const y = initialPos.y + limit;
  const z = initialPos.z + limit;

  // Use logical coordinates for boundary checks
  const px = initialPos.x;
  const py = initialPos.y;
  const pz = initialPos.z;

  const borders: BorderConfig = {};

  // Right (x+)
  if (faceNormal.x > 0.5 && px === limit) {
    if (py > 0) borders.top = { color: COLORS.stickers.top, ratio: getRatio(py, limit) };
    if (py < 0) borders.bottom = { color: COLORS.stickers.bottom, ratio: getRatio(py, limit) };
    if (pz > 0) borders.left = { color: COLORS.stickers.front, ratio: getRatio(pz, limit) }; // Visual Left is Front (z+)
    if (pz < 0) borders.right = { color: COLORS.stickers.back, ratio: getRatio(pz, limit) }; // Visual Right is Back (z-)

    return { 
      name: 'right', 
      color: COLORS.stickers.right,
      number: SUDOKU_GRIDS.right[8 - y][z],
      borders
    };
  }
  // Left (x-)
  if (faceNormal.x < -0.5 && px === -limit) {
    if (py > 0) borders.top = { color: COLORS.stickers.top, ratio: getRatio(py, limit) };
    if (py < 0) borders.bottom = { color: COLORS.stickers.bottom, ratio: getRatio(py, limit) };
    if (pz < 0) borders.left = { color: COLORS.stickers.back, ratio: getRatio(pz, limit) }; // Visual Left is Back (z-)
    if (pz > 0) borders.right = { color: COLORS.stickers.front, ratio: getRatio(pz, limit) }; // Visual Right is Front (z+)

    return { 
      name: 'left', 
      color: COLORS.stickers.left,
      number: SUDOKU_GRIDS.left[8 - y][8 - z],
      borders
    };
  }
  // Top (y+)
  if (faceNormal.y > 0.5 && py === limit) {
    if (pz < 0) borders.top = { color: COLORS.stickers.back, ratio: getRatio(pz, limit) }; // Visual Up is Back
    if (pz > 0) borders.bottom = { color: COLORS.stickers.front, ratio: getRatio(pz, limit) }; // Visual Down is Front
    if (px < 0) borders.left = { color: COLORS.stickers.left, ratio: getRatio(px, limit) };
    if (px > 0) borders.right = { color: COLORS.stickers.right, ratio: getRatio(px, limit) };

    return { 
      name: 'top', 
      color: COLORS.stickers.top,
      number: SUDOKU_GRIDS.top[z][x],
      borders
    };
  }
  // Bottom (y-)
  if (faceNormal.y < -0.5 && py === -limit) {
    if (pz > 0) borders.top = { color: COLORS.stickers.front, ratio: getRatio(pz, limit) }; // Visual Up is Front
    if (pz < 0) borders.bottom = { color: COLORS.stickers.back, ratio: getRatio(pz, limit) }; // Visual Down is Back
    if (px < 0) borders.left = { color: COLORS.stickers.left, ratio: getRatio(px, limit) };
    if (px > 0) borders.right = { color: COLORS.stickers.right, ratio: getRatio(px, limit) };

    return { 
      name: 'bottom', 
      color: COLORS.stickers.bottom,
      number: SUDOKU_GRIDS.bottom[8 - z][x],
      borders
    };
  }
  // Front (z+)
  if (faceNormal.z > 0.5 && pz === limit) {
    if (py > 0) borders.top = { color: COLORS.stickers.top, ratio: getRatio(py, limit) };
    if (py < 0) borders.bottom = { color: COLORS.stickers.bottom, ratio: getRatio(py, limit) };
    if (px < 0) borders.left = { color: COLORS.stickers.left, ratio: getRatio(px, limit) };
    if (px > 0) borders.right = { color: COLORS.stickers.right, ratio: getRatio(px, limit) };

    return { 
      name: 'front', 
      color: COLORS.stickers.front,
      number: SUDOKU_GRIDS.front[8 - y][x],
      borders
    };
  }
  // Back (z-)
  if (faceNormal.z < -0.5 && pz === -limit) {
    if (py > 0) borders.top = { color: COLORS.stickers.top, ratio: getRatio(py, limit) };
    if (py < 0) borders.bottom = { color: COLORS.stickers.bottom, ratio: getRatio(py, limit) };
    if (px > 0) borders.left = { color: COLORS.stickers.right, ratio: getRatio(px, limit) }; // Visual Left is Right (x+)
    if (px < 0) borders.right = { color: COLORS.stickers.left, ratio: getRatio(px, limit) }; // Visual Right is Left (x-)

    return { 
      name: 'back', 
      color: COLORS.stickers.back,
      number: SUDOKU_GRIDS.back[8 - y][8 - x],
      borders
    };
  }
  
  return null;
};

// Deprecated but kept for compatibility if needed (replaced usage preferred)
export const getStickerColor = (initialPos: THREE.Vector3, faceNormal: THREE.Vector3): string | null => {
  const info = getFaceInfo(initialPos, faceNormal);
  return info ? info.color : null;
};