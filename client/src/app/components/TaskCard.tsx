import React from 'react';
import { Task } from '../types';
import { CheckCircle2, Circle, Clock, AlertCircle, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { useDrag } from 'react-dnd';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  compact?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, compact = false }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TASK',
    item: { id: task.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const priorityColors = {
    high: 'bg-rose-100 text-rose-700 border-rose-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  const priorityLabels = {
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
  };

  const isEvent = task.type === 'event';

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className={`relative group bg-white rounded-xl border ${isEvent ? 'border-sky-100 bg-sky-50/30' : 'border-slate-100'} shadow-sm hover:shadow-md transition-all p-4 cursor-grab active:cursor-grabbing ${task.status === 'completed' && !isEvent ? 'opacity-60 grayscale-[0.5]' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox (only for tasks) */}
        {!isEvent ? (
          <button
            onClick={() => onToggle(task.id)}
            className={`mt-1 flex-shrink-0 transition-colors ${task.status === 'completed' ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-400'}`}
          >
            {task.status === 'completed' ? <CheckCircle2 size={22} /> : <Circle size={22} />}
          </button>
        ) : (
          <div className="mt-1 flex-shrink-0 text-sky-500 bg-sky-100 p-1 rounded-md">
            <Calendar size={16} />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-slate-800 truncate ${task.status === 'completed' && !isEvent ? 'line-through text-slate-500' : ''}`}>
            {task.title}
          </h3>
          
          {!compact && (
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
              {task.description || 'Sin descripción'}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
            {/* Priority Label (only for tasks) */}
            {task.priority && !isEvent && (
              <span className={`px-2 py-0.5 rounded-full border ${priorityColors[task.priority]} font-medium flex items-center gap-1`}>
                <AlertCircle size={10} />
                {priorityLabels[task.priority]}
              </span>
            )}
            
            {/* Event Label */}
            {isEvent && (
              <span className="px-2 py-0.5 rounded-full border bg-sky-100 text-sky-700 border-sky-200 font-medium flex items-center gap-1">
                Evento
              </span>
            )}
            
            {task.duration && (
              <span className="flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                <Clock size={10} />
                {task.duration} min
              </span>
            )}

            <span className="text-slate-400 ml-auto flex items-center gap-1">
               {isEvent && <span className="font-mono text-sky-600 font-medium">{task.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
               {!isEvent && <span>{task.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
