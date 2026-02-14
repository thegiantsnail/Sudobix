import { create } from 'zustand';
import * as THREE from 'three';
import { CubieState, Axis, Direction, CubeStore, FaceAxis, FacePlane } from './types';
import { CUBE_ORDER, HALF_ORDER, FACE_PLANES, getFaceInfo } from './constants';

const generateInitialState = (): CubieState[] => {
  const cubies: CubieState[] = [];
  let idCounter = 0;
  for (let x = -HALF_ORDER; x <= HALF_ORDER; x++) {
    for (let y = -HALF_ORDER; y <= HALF_ORDER; y++) {
      for (let z = -HALF_ORDER; z <= HALF_ORDER; z++) {
        cubies.push({
          id: idCounter++,
          position: new THREE.Vector3(x, y, z),
          quaternion: new THREE.Quaternion(),
          initialPosition: new THREE.Vector3(x, y, z),
        });
      }
    }
  }
  return cubies;
};

// --- Sudobix State System Utilities ---

// 1. Get the digit on a specific face of a cubie, given its current global context
const getDigit = (cubie: CubieState, axis: FaceAxis, val: number): number => {
    // Global normal for the face we are inspecting
    const globalNormal = new THREE.Vector3(
        axis === 'x' ? Math.sign(val) : 0,
        axis === 'y' ? Math.sign(val) : 0,
        axis === 'z' ? Math.sign(val) : 0
    );
    // Transform global normal to local cubie space to find which sticker is facing out
    const localNormal = globalNormal.clone().applyQuaternion(cubie.quaternion.clone().invert());
    // Get info using the initial position (sticker placement) and the current local normal
    const info = getFaceInfo(cubie.initialPosition, localNormal);
    return info ? info.number : 0;
}

// 2. Extract a 9x9 grid from a face plane
const extractFaceGrid = (cubies: CubieState[], axis: FaceAxis, value: number): number[][] => {
  const axes =
    axis === 'x' ? ['y','z'] :
    axis === 'y' ? ['x','z'] :
                   ['x','y'];

  // Filter cubies currently on this face
  const faceCubies = cubies
    .filter(c => Math.round(c.position[axis]) === value)
    .sort((a,b)=>{
      // Spatial sort to organize into a grid (Column-major logic based on coordinate system)
      // This order is arbitrary as long as it's consistent, because canonicalGrid handles rotation.
      const posA0 = Math.round(a.position[axes[0] as keyof THREE.Vector3]);
      const posB0 = Math.round(b.position[axes[0] as keyof THREE.Vector3]);
      if(posA0 !== posB0) return posA0 - posB0;
      
      const posA1 = Math.round(a.position[axes[1] as keyof THREE.Vector3]);
      const posB1 = Math.round(b.position[axes[1] as keyof THREE.Vector3]);
      return posA1 - posB1;
    });

  const grid: number[][] = [];
  for(let r=0; r<9; r++){
    // Map the sorted linear array into 9x9
    grid[r] = faceCubies.slice(r*9, (r+1)*9).map(c => getDigit(c, axis, value));
  }
  return grid;
}

// 3. Grid helpers
const rotate90 = (grid: number[][]) => {
  const n = 9;
  const out = Array.from({length:n}, () => Array(n).fill(0));
  for(let r=0; r<n; r++)
    for(let c=0; c<n; c++)
      out[c][n-1-r] = grid[r][c];
  return out;
}

const serialize = (grid: number[][]) => grid.flat().join('');

const canonicalGrid = (grid: number[][]) => {
  const r1 = rotate90(grid);
  const r2 = rotate90(r1);
  const r3 = rotate90(r2);

  return [grid, r1, r2, r3]
    .map(serialize)
    .sort()[0]; // Lexicographically first string is canonical
}

// 4. Build Sudobix Encoding for current orientation
const buildSudobixEncoding = (cubies: CubieState[]) => {
  const faces = FACE_PLANES.map(p => {
    const g = extractFaceGrid(cubies, p.axis, p.value);
    return canonicalGrid(g);
  });
  return faces.join('');
}

// 5. Apply virtual rotation for canonical checking
const applyVirtualRotation = (cubies: CubieState[], q: THREE.Quaternion): CubieState[] => {
    return cubies.map(c => {
        const newPos = c.position.clone().applyQuaternion(q);
        newPos.round(); // Align to integer grid
        const newQuat = c.quaternion.clone().premultiply(q);
        return { ...c, position: newPos, quaternion: newQuat };
    });
}

// 6. Canonical Sudobix State (Symmetry Invariant)
const canonicalSudobixState = (cubies: CubieState[]): string => {
    // We check basic rotational symmetries to find the true "identity" of the cube state
    const symmetries: THREE.Quaternion[] = [
        new THREE.Quaternion(), // Identity
        // 90 degree rotations around axes
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), Math.PI/2),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), Math.PI/2),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), Math.PI/2),
        // 120 degree diagonal (x->y->z)
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,1,1).normalize(), -2*Math.PI/3),
        // 240 degree diagonal (x->z->y)
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,1,1).normalize(), 2*Math.PI/3),
    ];

    const encodings = symmetries.map(q => {
        const rotatedCubies = applyVirtualRotation(cubies, q);
        return buildSudobixEncoding(rotatedCubies);
    });

    return encodings.sort()[0];
}

// 7. Validate Sudoku Grid
const validateSudoku = (grid: number[][]): boolean => {
    // Check rows
    for(let r=0; r<9; r++) {
      const s = new Set(grid[r]);
      if(s.size !== 9 || s.has(0)) return false;
    }
    // Check cols
    for(let c=0; c<9; c++) {
      const col = [];
      for(let r=0; r<9; r++) col.push(grid[r][c]);
      const s = new Set(col);
      if(s.size !== 9 || s.has(0)) return false;
    }
    // Check 3x3 boxes
    for(let br=0; br<3; br++){
      for(let bc=0; bc<3; bc++){
          const box = [];
          for(let i=0; i<3; i++)
              for(let j=0; j<3; j++)
                  box.push(grid[br*3+i][bc*3+j]);
          const s = new Set(box);
          if(s.size !== 9 || s.has(0)) return false;
      }
    }
    return true;
}


// --- Store Implementation ---

export const useCubeStore = create<CubeStore>((set, get) => ({
  cubies: generateInitialState(),
  isAnimating: false,
  activeSlice: { axis: 'y', layer: 0 },
  animationQueue: [],
  sudobixState: null,
  faceValidity: {},

  selectSlice: (axis, layer) => set({ activeSlice: { axis, layer } }),

  rotateSlice: (axis, layer, direction) => {
    // FIX: Always queue the rotation. The loop in RubiksCube.tsx will pick it up.
    get().queueRotation(axis, layer, direction);
  },

  queueRotation: (axis, layer, direction) => {
     set((state) => ({
       animationQueue: [...state.animationQueue, { axis, layer, direction }]
     }));
  },

  setAnimating: (animating) => set({ isAnimating: animating }),

  completeAnimation: () => {
    set((state) => {
      const finishedAnim = state.animationQueue[0];
      if (!finishedAnim) return { isAnimating: false };

      const { axis, layer, direction } = finishedAnim;
      const newCubies = state.cubies.map((cubie) => {
        let inLayer = false;
        if (axis === 'x' && Math.round(cubie.position.x) === layer) inLayer = true;
        if (axis === 'y' && Math.round(cubie.position.y) === layer) inLayer = true;
        if (axis === 'z' && Math.round(cubie.position.z) === layer) inLayer = true;

        if (!inLayer) return cubie;

        const pos = cubie.position.clone();
        const rot = cubie.quaternion.clone();
        const angle = -direction * (Math.PI / 2);

        const rotationAxis = new THREE.Vector3(
            axis === 'x' ? 1 : 0, 
            axis === 'y' ? 1 : 0, 
            axis === 'z' ? 1 : 0
        );
        
        pos.applyAxisAngle(rotationAxis, angle);
        pos.x = Math.round(pos.x);
        pos.y = Math.round(pos.y);
        pos.z = Math.round(pos.z);

        const q = new THREE.Quaternion();
        q.setFromAxisAngle(rotationAxis, angle);
        rot.premultiply(q);

        return { ...cubie, position: pos, quaternion: rot };
      });

      return {
        cubies: newCubies,
        animationQueue: state.animationQueue.slice(1),
        isAnimating: state.animationQueue.length > 1
      };
    });
    // Re-check validity after animation completes
    get().checkValidity();
  },

  reset: () => {
      set({ 
        cubies: generateInitialState(), 
        animationQueue: [], 
        isAnimating: false,
        sudobixState: null,
        faceValidity: {}
      });
      get().checkValidity();
  },

  shuffle: () => {
    const moves: {axis: Axis, layer: number, direction: Direction}[] = [];
    const axes: Axis[] = ['x', 'y', 'z'];
    let last = null;

    for (let i = 0; i < 40; i++) {
        let axis, layer, direction;
        do {
            axis = axes[Math.floor(Math.random() * axes.length)];
            layer = Math.floor(Math.random() * CUBE_ORDER) - HALF_ORDER;
            direction = Math.random() > 0.5 ? 1 : -1;
        } while (last && axis === last.axis && layer === last.layer && direction === -last.direction);
        
        moves.push({ axis, layer, direction });
        last = { axis, layer, direction };
    }
    set((state) => ({
        animationQueue: [...state.animationQueue, ...moves]
    }));
  },

  computeSudobix: () => {
      const { cubies } = get();
      const encoding = buildSudobixEncoding(cubies);
      const canonical = canonicalSudobixState(cubies);
      
      console.log("Sudobix Encoding:", encoding);
      console.log("Canonical State:", canonical);

      set({ sudobixState: { encoding, canonical } });
  },

  checkValidity: () => {
    const { cubies } = get();
    const validity: Record<string, boolean> = {};
    const names = ['Front', 'Right', 'Back', 'Left', 'Top', 'Bottom'];
    
    FACE_PLANES.forEach((plane, idx) => {
        const grid = extractFaceGrid(cubies, plane.axis, plane.value);
        validity[names[idx]] = validateSudoku(grid);
    });
    
    set({ faceValidity: validity });
  }
}));