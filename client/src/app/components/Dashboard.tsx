import React, { useState } from 'react';
import { Task, UserStats, PetState } from '../types';
import { PetWidget } from './PetWidget';
import { TaskCard } from './TaskCard';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Trophy, CheckCircle2, TrendingUp, Sun, ChevronRight, List, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as Switch from '@radix-ui/react-switch';

interface DashboardProps {
  tasks: Task[];
  stats: UserStats;
  pet: PetState;
  onTaskToggle: (id: string) => void;
  onPetAction: (action: 'feed' | 'pet') => void;
  petEnabled?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ tasks, stats, pet, onTaskToggle, petEnabled = true }) => {
  const [showPet, setShowPet] = useState(true);
  const [todayView, setTodayView] = useState<'checklist' | 'timeline'>('checklist');

  const today = new Date();
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedToday = tasks.filter(t => t.status === 'completed' && t.date.getDate() === today.getDate()).length;
  
  // Get today's tasks including completed ones
  const todayTasks = tasks.filter(t => t.date.getDate() === today.getDate());
  
  // Simulated "Smart Priority" logic: high priority first
  const sortedTasks = [...pendingTasks].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    // Handle undefined priority for events (treat as lowest priority for sorting or filter out if needed, but here we just show them)
    const prioA = a.priority ? priorityOrder[a.priority] : 3;
    const prioB = b.priority ? priorityOrder[b.priority] : 3;
    return prioA - prioB;
  });

  const totalTasks = stats.tasksCompleted + pendingTasks.length;
  const progressValue = totalTasks > 0 ? (stats.tasksCompleted / totalTasks) * 100 : 0;
  
  // XP Calculation for levels (simple formula: level * 100)
  const nextLevelXp = stats.level * 100;

  return (
    <div className="h-full overflow-y-auto pr-2 pb-20 scrollbar-hide">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Hola, Estudiante! 👋</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <CalendarIcon size={16} />
            {format(today, "EEEE, d 'de' MMMM", { locale: es })}
          </p>
        </div>
        
        {/* Nivel y Racha juntos */}
        <div className="flex items-center gap-3">
          {/* Nivel con XP */}
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Trophy size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase">Nivel {stats.level}</p>
              <p className="text-sm font-bold text-slate-800">{stats.xp} XP</p>
            </div>
          </div>

          {/* Racha */}
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
            <div className={`p-2 rounded-lg ${stats.streak > 3 ? 'bg-orange-100 text-orange-500' : 'bg-slate-100 text-slate-500'}`}>
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase">Racha</p>
              <p className="text-sm font-bold text-slate-800">{stats.streak} días</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Tasks */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Progress Section */}
          <section className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
              <CheckCircle2 size={200} />
            </div>
            
            <div className="relative z-10 flex justify-between items-end">
              <div>
                <h2 className="text-xl font-bold mb-1">Tu Progreso Diario</h2>
                <p className="text-indigo-100 text-sm mb-4">Has completado {completedToday} tareas hoy. ¡Sigue así!</p>
                
                <div className="w-full max-w-md bg-white/20 h-2 rounded-full overflow-hidden backdrop-blur-sm">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (completedToday / (completedToday + pendingTasks.length || 1)) * 100)}%` }}
                    className="h-full bg-white rounded-full"
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
              
              <div className="text-right">
                <span className="text-4xl font-bold">{Math.round(Math.min(100, (completedToday / (completedToday + pendingTasks.length || 1)) * 100))}%</span>
                <p className="text-xs text-indigo-200 uppercase font-medium mt-1">Completado</p>
              </div>
            </div>
          </section>

          {/* Today's Tasks */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Sun size={20} className="text-amber-500" />
                Para Hoy
              </h2>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                  {pendingTasks.length} pendientes
                </span>
                
                {/* Toggle Vista */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setTodayView('checklist')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                      todayView === 'checklist' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <List size={14} />
                    Lista
                  </button>
                  <button
                    onClick={() => setTodayView('timeline')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                      todayView === 'timeline' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Clock size={14} />
                    Horario
                  </button>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {todayView === 'checklist' ? (
                <motion.div
                  key="checklist"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  {sortedTasks.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-slate-400">¡Todo listo por hoy! 🎉</p>
                    </div>
                  ) : (
                    sortedTasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <TaskCard 
                          task={task} 
                          onToggle={onTaskToggle}
                        />
                      </motion.div>
                    ))
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                >
                  {/* Timeline View */}
                  {todayTasks.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50">
                      <p className="text-slate-400">No hay tareas para hoy 🎉</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {todayTasks
                        .sort((a, b) => a.date.getTime() - b.date.getTime())
                        .map((task, index) => (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors ${
                              task.status === 'completed' ? 'opacity-60' : ''
                            }`}
                          >
                            {/* Hora */}
                            <div className="flex flex-col items-center min-w-[60px]">
                              <span className={`text-sm font-bold ${
                                task.status === 'completed' ? 'text-slate-400' : 'text-slate-700'
                              }`}>
                                {format(task.date, 'HH:mm')}
                              </span>
                              {task.duration && (
                                <span className="text-[10px] text-slate-400">
                                  {task.duration}m
                                </span>
                              )}
                            </div>

                            {/* Indicador de color */}
                            <div className="flex flex-col items-center gap-1">
                              <div className={`w-3 h-3 rounded-full ${
                                task.status === 'completed' ? 'bg-slate-400' :
                                task.type === 'event' ? 'bg-sky-500' :
                                task.type === 'class' ? 'bg-teal-500' :
                                task.priority === 'high' ? 'bg-rose-500' :
                                task.priority === 'medium' ? 'bg-purple-500' : 'bg-emerald-500'
                              }`} />
                              {index < todayTasks.length - 1 && (
                                <div className="w-px h-10 bg-slate-200" />
                              )}
                            </div>

                            {/* Contenido de la tarea */}
                            <div className="flex-1">
                              <h4 className={`font-semibold text-sm ${
                                task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'
                              }`}>
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  task.type === 'event' ? 'bg-sky-100 text-sky-700' :
                                  task.type === 'class' ? 'bg-teal-100 text-teal-700' :
                                  task.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                                  task.priority === 'medium' ? 'bg-purple-100 text-purple-700' :
                                  'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {task.type === 'event' ? 'Evento' : 
                                   task.type === 'class' ? 'Clase' :
                                   task.priority === 'high' ? 'Alta' :
                                   task.priority === 'medium' ? 'Media' : 'Baja'}
                                </span>
                              </div>
                            </div>

                            {/* Checkbox para completar (solo tareas) */}
                            {task.type === 'task' && (
                              <button
                                onClick={() => onTaskToggle(task.id)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                  task.status === 'completed'
                                    ? 'bg-indigo-600 border-indigo-600'
                                    : 'border-slate-300 hover:border-indigo-500'
                                }`}
                              >
                                {task.status === 'completed' && (
                                  <CheckCircle2 size={16} className="text-white" />
                                )}
                              </button>
                            )}
                          </motion.div>
                        ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        {/* Right Column: Pet & Stats */}
        <div className="space-y-6">
          
          {/* Pet Toggle Header */}
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <span>🦉 Compañero</span>
            </h3>
            <div className="flex items-center gap-2">
               <label className="text-xs text-slate-400 font-medium" htmlFor="pet-mode">
                 {showPet ? 'Visible' : 'Oculto'}
               </label>
               <Switch.Root
                 className="w-[42px] h-[25px] bg-slate-200 rounded-full relative shadow-inner data-[state=checked]:bg-indigo-600 outline-none cursor-pointer"
                 id="pet-mode"
                 checked={showPet}
                 onCheckedChange={setShowPet}
               >
                 <Switch.Thumb className="block w-[21px] h-[21px] bg-white rounded-full shadow-[0_2px_2px] shadow-blackA7 transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[19px]" />
               </Switch.Root>
            </div>
          </div>

          <AnimatePresence>
            {showPet && petEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.9 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.9 }}
                className="overflow-hidden"
              >
                <PetWidget 
                  level={stats.level}
                  xp={stats.xp}
                  nextLevelXp={nextLevelXp}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};