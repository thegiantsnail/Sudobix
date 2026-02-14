import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import RubiksCube from './components/Cube/RubiksCube';
import Controls from './components/UI/Controls';

const App: React.FC = () => {
  return (
    <div className="w-full h-screen bg-[#111] relative overflow-hidden">
      <Canvas shadows camera={{ position: [25, 20, 25], fov: 45 }}>
        <Suspense fallback={null}>
          <RubiksCube />
        </Suspense>
      </Canvas>
      <Loader />
      <Controls />
      
      {/* Instructions / Footer */}
      <div className="absolute bottom-2 right-4 text-white/30 text-xs font-mono pointer-events-none">
        React + Three.js + Zustand | Click cube to select slice
      </div>
    </div>
  );
};

export default App;
