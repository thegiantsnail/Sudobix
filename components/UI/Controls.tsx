import React, { useEffect } from 'react';
import { useCubeStore } from '../../store';
import { ArrowLeft, ArrowRight, RotateCw, RotateCcw, Shuffle, RefreshCw, Hash, CheckCircle, XCircle } from 'lucide-react';
import { CUBE_ORDER, HALF_ORDER } from '../../constants';

const Controls: React.FC = () => {
  const { 
    activeSlice, 
    selectSlice, 
    rotateSlice, 
    shuffle, 
    reset, 
    isAnimating,
    animationQueue,
    computeSudobix,
    sudobixState,
    faceValidity,
    checkValidity
  } = useCubeStore();

  // Check validity on mount
  useEffect(() => {
    checkValidity();
  }, []);

  if (!activeSlice) return null;

  const handleLayerChange = (delta: number) => {
    let newLayer = activeSlice.layer + delta;
    if (newLayer > HALF_ORDER) newLayer = HALF_ORDER;
    if (newLayer < -HALF_ORDER) newLayer = -HALF_ORDER;
    selectSlice(activeSlice.axis, newLayer);
  };

  const isQueueFull = animationQueue.length > 5;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-8">
      {/* Header / Stats */}
      <div className="pointer-events-auto flex flex-col gap-4">
        <div className="flex justify-between items-start">
            <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl text-white border border-white/10 flex flex-col gap-2">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        Sudobix
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">9x9x9 Interactive Sudoku Cube</p>
                    <div className="mt-2 text-xs font-mono">
                        Queue: {animationQueue.length} {isAnimating ? '(Running)' : '(Idle)'}
                    </div>
                </div>

                {/* Validity Indicators */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 p-2 bg-white/5 rounded-lg">
                     {Object.entries(faceValidity).length > 0 ? (
                        Object.entries(faceValidity).map(([face, isValid]) => (
                            <div key={face} className="flex items-center justify-between text-[10px] font-mono gap-2">
                                <span className="text-gray-300">{face}</span>
                                {isValid ? (
                                    <CheckCircle size={12} className="text-green-500" />
                                ) : (
                                    <XCircle size={12} className="text-red-500/50" />
                                )}
                            </div>
                        ))
                     ) : (
                        <span className="text-[10px] text-gray-500">Calculating...</span>
                     )}
                </div>

                {sudobixState && (
                    <div className="mt-2 text-[10px] font-mono text-green-400 break-all max-w-[200px]">
                        Canonical Hash: {sudobixState.canonical.substring(0, 16)}...
                    </div>
                )}
            </div>
            
            <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <button 
                        onClick={() => shuffle()}
                        disabled={isQueueFull}
                        className="pointer-events-auto bg-black/60 hover:bg-black/80 text-white p-3 rounded-xl border border-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
                        title="Shuffle Cube"
                    >
                        <Shuffle size={20} /> <span className="hidden md:inline">Shuffle</span>
                    </button>
                    <button 
                        onClick={() => reset()}
                        className="pointer-events-auto bg-black/60 hover:bg-black/80 text-white p-3 rounded-xl border border-white/10 transition-all flex items-center gap-2"
                        title="Reset Cube"
                    >
                        <RefreshCw size={20} /> <span className="hidden md:inline">Reset</span>
                    </button>
                </div>
                <button 
                    onClick={() => computeSudobix()}
                    className="pointer-events-auto bg-blue-900/60 hover:bg-blue-800/80 text-white p-3 rounded-xl border border-blue-500/30 transition-all flex items-center gap-2"
                    title="Compute Canonical State"
                >
                    <Hash size={20} /> <span className="hidden md:inline">Compute Sudobix</span>
                </button>
            </div>
        </div>
      </div>

      {/* Main Control Panel (Bottom) */}
      <div className="pointer-events-auto self-center bg-black/70 backdrop-blur-lg p-6 rounded-2xl border border-white/10 w-full max-w-2xl shadow-2xl">
        <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
            
            {/* Axis Selection */}
            <div className="flex flex-col items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-gray-400 font-bold">Select Axis</span>
                <div className="flex bg-white/10 rounded-lg p-1">
                    {(['x', 'y', 'z'] as const).map(axis => (
                        <button
                            key={axis}
                            onClick={() => selectSlice(axis, activeSlice.layer)}
                            className={`w-12 h-10 rounded-md font-bold transition-all ${
                                activeSlice.axis === axis 
                                ? 'bg-blue-600 text-white shadow-lg' 
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {axis.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Layer Selection */}
            <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                <span className="text-xs uppercase tracking-wider text-gray-400 font-bold">
                    Select Layer: <span className="text-white">{activeSlice.layer}</span>
                </span>
                <div className="flex items-center gap-4 w-full">
                    <button 
                        onClick={() => handleLayerChange(-1)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <input 
                        type="range" 
                        min={-HALF_ORDER} 
                        max={HALF_ORDER} 
                        value={activeSlice.layer}
                        onChange={(e) => selectSlice(activeSlice.axis, parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <button 
                        onClick={() => handleLayerChange(1)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                    >
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>

            {/* Rotation Actions */}
            <div className="flex flex-col items-center gap-2">
                 <span className="text-xs uppercase tracking-wider text-gray-400 font-bold">Rotate</span>
                 <div className="flex gap-4">
                    <button
                        onClick={() => rotateSlice(activeSlice.axis, activeSlice.layer, -1)}
                        className="w-14 h-14 bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl shadow-lg flex items-center justify-center transition-all"
                        title="Counter-Clockwise"
                    >
                        <RotateCcw className="text-white" size={28} />
                    </button>
                    <button
                        onClick={() => rotateSlice(activeSlice.axis, activeSlice.layer, 1)}
                        className="w-14 h-14 bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl shadow-lg flex items-center justify-center transition-all"
                        title="Clockwise"
                    >
                        <RotateCw className="text-white" size={28} />
                    </button>
                 </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default Controls;