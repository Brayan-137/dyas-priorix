import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Clock, MapPin, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { ClassSession } from '../types';

interface ScheduleViewProps {
  initialClasses?: ClassSession[];
}

const DAYS = [
  { id: 1, name: 'Lunes' },
  { id: 2, name: 'Martes' },
  { id: 3, name: 'Miércoles' },
  { id: 4, name: 'Jueves' },
  { id: 5, name: 'Viernes' },
];

const COLORS = [
  { name: 'Sky', value: 'bg-sky-100 border-sky-200 text-sky-700' },
  { name: 'Rose', value: 'bg-rose-100 border-rose-200 text-rose-700' },
  { name: 'Emerald', value: 'bg-emerald-100 border-emerald-200 text-emerald-700' },
  { name: 'Amber', value: 'bg-amber-100 border-amber-200 text-amber-700' },
  { name: 'Purple', value: 'bg-purple-100 border-purple-200 text-purple-700' },
];

export const ScheduleView: React.FC<ScheduleViewProps> = ({ initialClasses = [] }) => {
  const [classes, setClasses] = useState<ClassSession[]>(initialClasses);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClass, setNewClass] = useState<Partial<ClassSession>>({
    day: 1,
    color: COLORS[0].value
  });

  const getTimeInMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const addClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.subject || !newClass.startTime || !newClass.endTime) return;

    const session: ClassSession = {
      id: Date.now().toString(),
      day: newClass.day || 1,
      startTime: newClass.startTime,
      endTime: newClass.endTime,
      subject: newClass.subject,
      room: newClass.room || 'Aula Virtual',
      color: newClass.color || COLORS[0].value
    };

    setClasses([...classes, session]);
    setShowAddModal(false);
    setNewClass({ day: 1, color: COLORS[0].value });
  };

  const deleteClass = (id: string) => {
    setClasses(classes.filter(c => c.id !== id));
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Horario de Clases 📚</h2>
          <p className="text-slate-500 text-sm mt-1">Organiza tu semana académica</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nueva Clase</span>
        </button>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50/50">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 h-full min-h-[600px]">
          {DAYS.map((day) => (
            <div key={day.id} className="flex flex-col h-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group">
              {/* Day Header */}
              <div className="p-3 bg-slate-50 border-b border-slate-100 text-center">
                <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">{day.name}</span>
              </div>

              {/* Classes Container */}
              <div className="flex-1 p-2 space-y-2 relative">
                {/* Empty State Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
                />

                {classes
                  .filter(c => c.day === day.id)
                  .sort((a, b) => getTimeInMinutes(a.startTime) - getTimeInMinutes(b.startTime))
                  .map((session) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      layoutId={session.id}
                      className={`p-3 rounded-xl border ${session.color} shadow-sm relative group/card cursor-pointer hover:shadow-md transition-all`}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteClass(session.id); }}
                        className="absolute top-1 right-1 p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover/card:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>

                      <div className="font-bold text-sm leading-tight pr-4">{session.subject}</div>
                      
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs opacity-80">
                          <Clock size={12} />
                          <span>{session.startTime} - {session.endTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs opacity-80">
                          <MapPin size={12} />
                          <span className="truncate">{session.room}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                {classes.filter(c => c.day === day.id).length === 0 && (
                  <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <button 
                      onClick={() => { setNewClass({ ...newClass, day: day.id }); setShowAddModal(true); }}
                      className="p-3 rounded-full bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Class Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">Añadir Clase</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={addClass} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Materia</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Cálculo Diferencial"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={newClass.subject || ''}
                    onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Inicio</label>
                    <input
                      type="time"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      value={newClass.startTime || ''}
                      onChange={(e) => setNewClass({ ...newClass, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Fin</label>
                    <input
                      type="time"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      value={newClass.endTime || ''}
                      onChange={(e) => setNewClass({ ...newClass, endTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Día</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                      value={newClass.day}
                      onChange={(e) => setNewClass({ ...newClass, day: Number(e.target.value) })}
                    >
                      {DAYS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Aula</label>
                    <input
                      type="text"
                      placeholder="Ej. B-204"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      value={newClass.room || ''}
                      onChange={(e) => setNewClass({ ...newClass, room: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Color</label>
                  <div className="flex gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setNewClass({ ...newClass, color: c.value })}
                        className={`w-8 h-8 rounded-full border-2 ${c.value.replace('text-', 'bg-').split(' ')[0].replace('100', '500')} ${
                          newClass.color === c.value ? 'ring-2 ring-offset-2 ring-indigo-500 border-white' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-slate-400 hover:text-slate-600 font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold shadow-md hover:bg-indigo-700 transition-all"
                  >
                    Guardar Clase
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
