import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, CheckCircle, Clock } from 'lucide-react';

interface FocusModeProps {
  onSessionComplete: (duration: number) => void;
}

type Difficulty = 'easy' | 'moderate' | 'intensive';

const MODES = {
  easy: { work: 25, break: 5, label: 'Fácil', color: 'bg-emerald-500' },
  moderate: { work: 45, break: 10, label: 'Moderado', color: 'bg-indigo-500' },
  intensive: { work: 90, break: 15, label: 'Intensivo', color: 'bg-rose-500' },
};

export const FocusMode: React.FC<FocusModeProps> = ({ onSessionComplete }) => {
  const [difficulty, setDifficulty] = useState<Difficulty>('moderate');
  const [timeLeft, setTimeLeft] = useState(MODES.moderate.work * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTimeLeft(isBreak ? MODES[difficulty].break * 60 : MODES[difficulty].work * 60);
    setIsActive(false);
  }, [difficulty, isBreak]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (isActive) {
        // Timer finished
        if (!isBreak) {
          onSessionComplete(MODES[difficulty].work);
          if (soundEnabled) new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
        }
        setIsBreak(!isBreak);
        setIsActive(false);
      }
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, isBreak, difficulty, onSessionComplete, soundEnabled]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(MODES[difficulty].work * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = 100 - (timeLeft / ((isBreak ? MODES[difficulty].break : MODES[difficulty].work) * 60)) * 100;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-4 md:p-8 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-100 relative overflow-hidden flex flex-col items-center"
      >
        <div className={`absolute top-0 left-0 w-full h-2 ${MODES[difficulty].color}`} />
        
        <div className="flex justify-between items-center w-full mb-6">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-hide max-w-[200px] md:max-w-none">
            {(Object.keys(MODES) as Difficulty[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setDifficulty(mode)}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                  difficulty === mode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {MODES[mode].label}
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-full hover:bg-slate-100 transition-colors flex-shrink-0 ${soundEnabled ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>

        <div className="flex flex-col items-center mb-8 relative w-full justify-center">
          {/* Circular Progress (Simplified with SVG) */}
          <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 256 256">
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-slate-100"
              />
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 110}
                strokeDashoffset={2 * Math.PI * 110 * (1 - progress / 100)}
                className={`${isBreak ? 'text-emerald-500' : MODES[difficulty].color.replace('bg-', 'text-')} transition-all duration-1000 ease-linear`}
                strokeLinecap="round"
              />
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl md:text-6xl font-bold text-slate-800 font-mono tracking-tighter">
                {formatTime(timeLeft)}
              </span>
              <span className={`mt-2 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest ${
                isBreak ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
                {isBreak ? 'Descanso' : 'Enfoque'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-6 w-full mb-4">
          <button
            onClick={resetTimer}
            className="p-3 md:p-4 rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <RotateCcw size={20} />
          </button>
          
          <button
            onClick={toggleTimer}
            className={`p-5 md:p-6 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all text-white ${
              isActive ? 'bg-amber-500' : MODES[difficulty].color
            }`}
          >
            {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
          </button>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-between w-full text-xs md:text-sm text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock size={14} />
            <span>{MODES[difficulty].work} min</span>
          </div>
          <div className="flex items-center gap-1.5">
             <CheckCircle size={14} className="text-emerald-500" />
             <span>+XP al terminar</span>
          </div>
        </div>

      </motion.div>
    </div>
  );
};
