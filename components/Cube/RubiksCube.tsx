import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useCubeStore } from '../../store';
import { ANIMATION_SPEED, HALF_ORDER, CUBE_SPACING, getFaceInfo, COLORS } from '../../constants';
import { getNumberTexture } from '../../textureManager';
import { Axis, Direction } from '../../types';

// Reuse base material for non-sticker faces
const baseMaterial = new THREE.MeshStandardMaterial({ 
    color: COLORS.base, 
    roughness: 0.6, 
    metalness: 0.1 
});

const RubiksCube: React.FC = () => {
  const { 
    cubies, 
    animationQueue, 
    completeAnimation, 
    setAnimating,
    activeSlice,
    selectSlice 
  } = useCubeStore();
  
  const animRef = useRef<{ 
    axis: Axis; 
    layer: number; 
    direction: Direction; 
    progress: number; 
    active: boolean 
  } | null>(null);

  const [activeAnimData, setActiveAnimData] = useState<{ axis: Axis; layer: number; direction: Direction } | null>(null);
  const animProgress = useRef(0);

  useFrame((state, delta) => {
    if (!animRef.current && animationQueue.length > 0) {
      const next = animationQueue[0];
      animRef.current = { ...next, progress: 0, active: true };
      animProgress.current = 0;
      setActiveAnimData({ axis: next.axis, layer: next.layer, direction: next.direction });
      setAnimating(true);
    }

    if (animRef.current) {
      animRef.current.progress += delta / ANIMATION_SPEED;
      animProgress.current = animRef.current.progress;

      if (animRef.current.progress >= 1) {
        completeAnimation();
        animRef.current = null;
        animProgress.current = 0;
        setActiveAnimData(null);
      }
    }
  });

  const progressRefObj = useRef({ value: 0 });
  useFrame(() => {
    progressRefObj.current.value = animProgress.current;
  });

  return (
    <>
      <group>
        {cubies.map((cubie) => (
          <CubieWrapper 
            key={cubie.id} 
            data={cubie} 
            activeAnimData={activeAnimData}
            progressRef={progressRefObj}
            onSelect={selectSlice}
          />
        ))}
      </group>

      {activeSlice && !activeAnimData && (
        <SliceHighlight axis={activeSlice.axis} layer={activeSlice.layer} />
      )}

      <OrbitControls 
        enablePan={false} 
        minDistance={15} 
        maxDistance={40} 
        rotateSpeed={0.5} 
      />
      
      <ambientLight intensity={0.6} />
      <spotLight position={[20, 20, 20]} angle={0.25} penumbra={1} intensity={1} castShadow />
      <pointLight position={[-20, -20, -20]} intensity={0.5} />
      
      <Environment preset="studio" />
      <ContactShadows position={[0, -6, 0]} opacity={0.4} scale={30} blur={2} far={4.5} />
    </>
  );
};

const CubieWrapper: React.FC<{
  data: any,
  activeAnimData: any,
  progressRef: any,
  onSelect: (axis: Axis, layer: number) => void
}> = React.memo(({ data, activeAnimData, progressRef, onSelect }) => {
    
    const animationPayload = React.useMemo(() => {
        if (!activeAnimData) return null;
        return {
            ...activeAnimData,
            progressRef: progressRef
        };
    }, [activeAnimData, progressRef]);

    const handleClick = (e: any) => {
        e.stopPropagation();
        onSelect('y', Math.round(data.position.y));
    };

    return (
        <CubieWithRef 
            data={data} 
            animationPayload={animationPayload}
            onClick={handleClick}
        />
    );
});

const CubieWithRef: React.FC<{
    data: any,
    animationPayload: any,
    onClick: (e: any) => void
}> = React.memo(({ data, animationPayload, onClick }) => {
    const groupRef = useRef<THREE.Group>(null);
    const { position, quaternion, initialPosition } = data;

    const materials = React.useMemo(() => {
        const mats = [];
        const normals = [
            new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
        ];
        for (let i = 0; i < 6; i++) {
            const faceInfo = getFaceInfo(initialPosition, normals[i]);
            if (faceInfo) {
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
    }, [initialPosition]);

    const isAnimating = React.useMemo(() => {
        if (!animationPayload) return false;
        const { axis, layer } = animationPayload;
        if (axis === 'x' && Math.round(position.x) === layer) return true;
        if (axis === 'y' && Math.round(position.y) === layer) return true;
        if (axis === 'z' && Math.round(position.z) === layer) return true;
        return false;
    }, [animationPayload, position]);

    useFrame(() => {
        if (!groupRef.current) return;
        
        const currentPos = new THREE.Vector3(
            position.x * CUBE_SPACING,
            position.y * CUBE_SPACING,
            position.z * CUBE_SPACING
        );
        const currentQuat = quaternion.clone();

        if (isAnimating && animationPayload) {
            const progress = animationPayload.progressRef.current.value;
            const { axis, direction } = animationPayload;
            const angle = -direction * (Math.PI / 2) * progress;
            const rotAxis = new THREE.Vector3(
                axis === 'x' ? 1 : 0, 
                axis === 'y' ? 1 : 0, 
                axis === 'z' ? 1 : 0
            );

            currentPos.applyAxisAngle(rotAxis, angle);
            
            const q = new THREE.Quaternion();
            q.setFromAxisAngle(rotAxis, angle);
            currentQuat.premultiply(q);
        }

        groupRef.current.position.copy(currentPos);
        groupRef.current.quaternion.copy(currentQuat);
    });

    const geometry = React.useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

    return (
        <group ref={groupRef} onClick={onClick}>
            <mesh geometry={geometry} material={materials} castShadow receiveShadow />
        </group>
    );
});


const SliceHighlight: React.FC<{ axis: Axis; layer: number }> = ({ axis, layer }) => {
    const size = 9 * CUBE_SPACING + 0.5;
    const thickness = 1.2;
    const pos = new THREE.Vector3(0, 0, 0);
    const args: [number, number, number] = [size, size, size];

    if (axis === 'x') {
        pos.x = layer * CUBE_SPACING;
        args[0] = thickness;
    } else if (axis === 'y') {
        pos.y = layer * CUBE_SPACING;
        args[1] = thickness;
    } else {
        pos.z = layer * CUBE_SPACING;
        args[2] = thickness;
    }

    return (
        <mesh position={pos}>
            <boxGeometry args={args} />
            <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.3} />
        </mesh>
    );
}

export default RubiksCube;