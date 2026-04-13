import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy, Star } from 'lucide-react';
import owlImage from '../../assets/c65e585b4affa0b77cb6cf30af9af32e8c44b19d.png';

interface PetWidgetProps {
  level: number;
  xp: number; // Current XP
  nextLevelXp: number; // XP needed for next level
}

export const PetWidget: React.FC<PetWidgetProps> = ({ level, xp, nextLevelXp }) => {
  const [floatAnimation, setFloatAnimation] = useState({});

  useEffect(() => {
    setFloatAnimation({
      y: [0, -10, 0],
      rotate: [0, 2, -2, 0],
      transition: { repeat: Infinity, duration: 4, ease: "easeInOut" }
    });
  }, []);

  const progressPercent = Math.min(100, (xp / nextLevelXp) * 100);

  return (
    <div className="relative group bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-6 shadow-sm border border-emerald-100/50 flex flex-col items-center justify-center overflow-hidden min-h-[300px]">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-teal-200/20 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-200/20 rounded-full blur-2xl -z-10" />

      {/* Level Badge */}
      <div className="absolute top-4 left-4 z-20">
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-bold text-emerald-600 shadow-sm border border-emerald-100">
          <Trophy size={14} className="text-amber-500" />
          <span>Nivel {level}</span>
        </div>
      </div>

      {/* Pet Avatar */}
      <motion.div
        className="relative w-56 h-56 z-10 mt-4"
        animate={floatAnimation}
        whileHover={{ scale: 1.05 }}
      >
        <img 
          src={owlImage}
          alt="Learning Owl Mascot" 
          className="w-full h-full object-contain drop-shadow-2xl"
        />
        
        {/* Sparkles */}
        <motion.div 
          className="absolute -top-4 -right-4 text-amber-400"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Sparkles size={24} fill="currentColor" />
        </motion.div>
      </motion.div>

      {/* Evolution Progress */}
      <div className="w-full max-w-[200px] mt-6 z-20">
        <div className="flex justify-between items-end mb-2">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Evolución</span>
          <span className="text-xs font-bold text-emerald-600">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-3 w-full bg-white rounded-full overflow-hidden border border-emerald-100 shadow-inner">
          <motion.div 
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <p className="text-[10px] text-center text-emerald-600/70 mt-2 font-medium">
          Completa tareas para subir de nivel
        </p>
      </div>
    </div>
  );
};
