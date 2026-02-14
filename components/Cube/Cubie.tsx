import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CubieState, Axis, Direction } from '../../types';
import { COLORS, CUBE_SPACING, getFaceInfo, HALF_ORDER } from '../../constants';
import { getNumberTexture } from '../../textureManager';

interface CubieProps {
  data: CubieState;
  activeAnimation: { axis: Axis; layer: number; progress: number; direction: Direction } | null;
}

// Reuse geometry
const roundedBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
const baseMaterial = new THREE.MeshStandardMaterial({ 
    color: COLORS.base, 
    roughness: 0.6, 
    metalness: 0.1 
});

const Cubie: React.FC<CubieProps> = ({ data, activeAnimation }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Determine if this cubie is part of the currently animating slice
  const isAnimating = useMemo(() => {
    if (!activeAnimation) return false;
    const { axis, layer } = activeAnimation;
    if (axis === 'x' && Math.round(data.position.x) === layer) return true;
    if (axis === 'y' && Math.round(data.position.y) === layer) return true;
    if (axis === 'z' && Math.round(data.position.z) === layer) return true;
    return false;
  }, [activeAnimation, data.position]);

  // Construct materials for faces based on initial position
  const materials = useMemo(() => {
    // Order: Right(x+), Left(x-), Top(y+), Bottom(y-), Front(z+), Back(z-)
    const mats = [];
    const normals = [
        new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
    ];

    for (let i = 0; i < 6; i++) {
        const faceInfo = getFaceInfo(data.initialPosition, normals[i]);
        if (faceInfo) {
            // Get texture for the number/color combo with borders
            const map = getNumberTexture(faceInfo.number, faceInfo.color, faceInfo.borders);
            mats.push(new THREE.MeshStandardMaterial({ 
                map: map,
                roughness: 0.2, 
                metalness: 0.0,
            }));
        } else {
            mats.push(baseMaterial);
        }
    }
    return mats;
  }, [data.initialPosition]);

  useFrame(() => {
    if (!groupRef.current) return;

    // Apply Base Transform
    groupRef.current.position.set(
        data.position.x * CUBE_SPACING,
        data.position.y * CUBE_SPACING,
        data.position.z * CUBE_SPACING
    );
    groupRef.current.quaternion.copy(data.quaternion);

    // Apply Animation Transform on top if active
    if (isAnimating && activeAnimation) {
      const { axis, direction, progress } = activeAnimation;
      const angle = -direction * (Math.PI / 2) * progress;
      const rotAxis = new THREE.Vector3(
        axis === 'x' ? 1 : 0, 
        axis === 'y' ? 1 : 0, 
        axis === 'z' ? 1 : 0
      );

      // 1. Rotate position vector around world 0,0,0
      const currentPos = new THREE.Vector3(
        data.position.x * CUBE_SPACING,
        data.position.y * CUBE_SPACING,
        data.position.z * CUBE_SPACING
      );
      currentPos.applyAxisAngle(rotAxis, angle);
      groupRef.current.position.copy(currentPos);

      // 2. Rotate orientation
      const q = new THREE.Quaternion();
      q.setFromAxisAngle(rotAxis, angle);
      const targetQ = data.quaternion.clone().premultiply(q);
      groupRef.current.quaternion.copy(targetQ);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={roundedBoxGeometry} material={materials} castShadow receiveShadow />
    </group>
  );
};

export default React.memo(Cubie);