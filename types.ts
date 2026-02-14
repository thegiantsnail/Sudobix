import * as THREE from 'three';

export type Axis = 'x' | 'y' | 'z';
export type Direction = 1 | -1; // 1 = Clockwise, -1 = Counter-Clockwise

export interface CubieState {
  id: number;
  position: THREE.Vector3; // Logical integer position (-4 to 4)
  quaternion: THREE.Quaternion; // Current rotation
  initialPosition: THREE.Vector3; // Used to determine sticker colors
}

export interface AnimationState {
  axis: Axis;
  layer: number; // -4 to 4
  direction: Direction;
  progress: number; // 0 to 1
  active: boolean;
}

export type FaceAxis = 'x' | 'y' | 'z';

export interface FacePlane {
  axis: FaceAxis;
  value: number;
}

export interface SudobixState {
  encoding: string;     // 486 chars
  canonical: string;    // minimal symmetry form
}

export interface CubeStore {
  cubies: CubieState[];
  isAnimating: boolean;
  activeSlice: { axis: Axis; layer: number } | null;
  animationQueue: Omit<AnimationState, 'progress' | 'active'>[];
  sudobixState: SudobixState | null;
  faceValidity: Record<string, boolean>;
  
  // Actions
  selectSlice: (axis: Axis, layer: number) => void;
  rotateSlice: (axis: Axis, layer: number, direction: Direction) => void;
  queueRotation: (axis: Axis, layer: number, direction: Direction) => void;
  reset: () => void;
  shuffle: () => void;
  computeSudobix: () => void;
  checkValidity: () => void;
  
  // Internal
  completeAnimation: () => void;
  setAnimating: (animating: boolean) => void;
}