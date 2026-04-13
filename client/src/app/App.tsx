import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { LayoutDashboard, Calendar as CalendarIcon, Clock, BarChart2, Plus, LogOut, CheckSquare, Calendar, BookOpen, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, UserStats, PetState, Priority, ItemType, ClassSession, AppSettings } from './types';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { FocusMode } from './components/FocusMode';
import { StatsView } from './components/StatsView';
import { ScheduleView } from './components/ScheduleView';
import { SettingsView } from './components/SettingsView';

// Dummy Data
const INITIAL_TASKS: Task[] = [
  { id: '1', type: 'task', title: 'Estudiar Cálculo II', description: 'Repasar integrales definidas para el parcial', date: new Date(new Date().setHours(14, 0)), priority: 'high', status: 'pending', duration: 90 },
  { id: '2', type: 'task', title: 'Leer capítulo 4 de Historia', description: 'Hacer resumen del capítulo', date: new Date(new Date().setHours(16, 30)), priority: 'medium', status: 'pending', duration: 45 },
  { id: '3', type: 'task', title: 'Proyecto de Programación', description: 'Implementar backend', date: new Date(new Date().setDate(new Date().getDate() + 1)), priority: 'high', status: 'pending', duration: 120 },
  { id: '4', type: 'task', title: 'Comprar materiales de Arte', date: new Date(new Date().setDate(new Date().getDate() + 2)), priority: 'low', status: 'pending' },
  { id: '5', type: 'event', title: 'Reunión de grupo', date: new Date(new Date().setHours(10, 0)), status: 'pending', duration: 60 },
  { id: '6', type: 'event', title: 'Examen de Física', date: new Date(new Date().setHours(9, 0)), status: 'pending', duration: 90 },
  { id: '7', type: 'class', title: 'Cálculo II', room: 'A-101', date: new Date(new Date().setHours(8, 0)), status: 'pending', duration: 120 },
  { id: '8', type: 'class', title: 'Programación', room: 'Lab-B', date: new Date(new Date().setHours(11, 30)), status: 'pending', duration: 90 },
];

const INITIAL_STATS: UserStats = {
  level: 5,
  xp: 450,
  streak: 12,
  tasksCompleted: 42,
  mood: 'happy'
};

const INITIAL_PET: PetState = {
  name: 'Owie',
  stage: 'teen',
};

const INITIAL_CLASSES: ClassSession[] = [
  { id: 'c1', day: 1, startTime: '08:00', endTime: '10:00', subject: 'Cálculo II', room: 'A-101', color: 'bg-rose-100 border-rose-200 text-rose-700' },
  { id: 'c2', day: 1, startTime: '10:30', endTime: '12:00', subject: 'Física I', room: 'Lab-3', color: 'bg-sky-100 border-sky-200 text-sky-700' },
  { id: 'c3', day: 2, startTime: '09:00', endTime: '11:00', subject: 'Programación', room: 'Sala B', color: 'bg-purple-100 border-purple-200 text-purple-700' },
  { id: 'c4', day: 3, startTime: '08:00', endTime: '10:00', subject: 'Cálculo II', room: 'A-101', color: 'bg-rose-100 border-rose-200 text-rose-700' },
  { id: 'c5', day: 4, startTime: '14:00', endTime: '16:00', subject: 'Historia', room: 'C-202', color: 'bg-amber-100 border-amber-200 text-amber-700' },
  { id: 'c6', day: 5, startTime: '10:00', endTime: '12:00', subject: 'Inglés Avanzado', room: 'D-401', color: 'bg-emerald-100 border-emerald-200 text-emerald-700' },
];

const INITIAL_SETTINGS: AppSettings = {
  theme: 'light',
  accentColor: 'indigo',
  petEnabled: true,
  reminders: {
    enabled: true,
    times: ['1hour', '1day']
  },
  scheduleConflictAlerts: true,
  streakNotifications: true,
  silentMode: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00'
  }
};

export default function App() {
  const [view, setView] = useState<'dashboard' | 'calendar' | 'schedule' | 'focus' | 'stats' | 'settings'>('dashboard');
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [stats, setStats] = useState<UserStats>(INITIAL_STATS);
  const [pet, setPet] = useState<PetState>(INITIAL_PET);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Task State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [newTaskType, setNewTaskType] = useState<ItemType>('task');
  const [newTaskDate, setNewTaskDate] = useState<Date>(new Date());
  const [newTaskTime, setNewTaskTime] = useState<string>('12:00');
  const [newTaskDuration, setNewTaskDuration] = useState<number>(60);

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => {
      if (t.id === id && t.type === 'task') {
        const newStatus = t.status === 'pending' ? 'completed' : 'pending';
        // Update stats if completing
        if (newStatus === 'completed') {
          setStats(prev => {
            let newXp = prev.xp + 50;
            let newLevel = prev.level;
            const xpNeeded = prev.level * 100; // Example curve

            if (newXp >= xpNeeded) {
              newXp -= xpNeeded;
              newLevel += 1;
            }

            return {
              ...prev,
              xp: newXp,
              level: newLevel,
              tasksCompleted: prev.tasksCompleted + 1
            };
          });
        }
        return { ...t, status: newStatus };
      }
      return t;
    }));
  };

  const openAddModal = (date?: Date) => {
    if (date) setNewTaskDate(date);
    else setNewTaskDate(new Date());
    setShowAddModal(true);
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    // Combine date and time
    const [hours, minutes] = newTaskTime.split(':').map(Number);
    const taskDateTime = new Date(newTaskDate);
    taskDateTime.setHours(hours, minutes, 0, 0);

    const newTask: Task = {
      id: Date.now().toString(),
      type: newTaskType,
      title: newTaskTitle,
      date: taskDateTime,
      priority: newTaskType === 'task' ? newTaskPriority : undefined,
      status: 'pending',
      duration: newTaskDuration
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setShowAddModal(false);
  };

  const handleSessionComplete = (duration: number) => {
    setStats(prev => {
      let newXp = prev.xp + duration; // 1 XP per minute of focus
      let newLevel = prev.level;
      const xpNeeded = prev.level * 100;

      if (newXp >= xpNeeded) {
        newXp -= xpNeeded;
        newLevel += 1;
      }
      return {
        ...prev,
        xp: newXp,
        level: newLevel
      };
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
        {/* Sidebar - Solo Iconos */}
        <aside className="w-20 bg-white border-r border-slate-100 flex flex-col justify-between py-6 px-4 z-20 shadow-sm">
          <div>
            <div className="flex items-center justify-center mb-10">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">P</div>
            </div>

            <nav className="space-y-2">
              {[
                { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                { id: 'calendar', icon: CalendarIcon, label: 'Calendario' },
                { id: 'focus', icon: Clock, label: 'Modo Enfoque' },
                { id: 'stats', icon: BarChart2, label: 'Estadísticas' },
                { id: 'settings', icon: Settings, label: 'Configuración' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as any)}
                  className={`w-full flex items-center justify-center p-3 rounded-xl transition-all relative group ${
                    view === item.id 
                      ? 'bg-indigo-50 text-indigo-600 font-semibold' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                  title={item.label}
                >
                  <item.icon size={22} />
                  {view === item.id && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute left-0 w-1 h-8 bg-indigo-600 rounded-r-full" 
                    />
                  )}
                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                </button>
              ))}
            </nav>
          </div>

          <button 
            className="flex items-center justify-center p-3 text-slate-400 hover:text-rose-500 transition-colors rounded-xl hover:bg-rose-50 w-full relative group"
            title="Cerrar Sesión"
          >
            <LogOut size={22} />
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Cerrar Sesión
            </div>
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 relative h-full overflow-hidden flex flex-col">
          {/* Top Bar for Mobile/Tablet or just spacing */}
          <div className="h-4 lg:h-8" /> 

          <div className="flex-1 px-4 lg:px-8 pb-4 overflow-y-auto scrollbar-hide">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {view === 'dashboard' && (
                  <Dashboard 
                    tasks={tasks} 
                    stats={stats} 
                    pet={pet}
                    onTaskToggle={toggleTask}
                    onPetAction={() => {}}
                    petEnabled={settings.petEnabled}
                  />
                )}
                {view === 'calendar' && (
                  <CalendarView 
                    tasks={tasks} 
                    onAddTask={openAddModal}
                    onSelectDate={() => {}} 
                    selectedDate={new Date()}
                    onTaskToggle={toggleTask}
                  />
                )}
                 {view === 'schedule' && (
                  <ScheduleView initialClasses={INITIAL_CLASSES} />
                )}
                {view === 'focus' && (
                  <FocusMode onSessionComplete={handleSessionComplete} />
                )}
                {view === 'stats' && (
                  <StatsView stats={stats} tasks={tasks} />
                )}
                {view === 'settings' && (
                  <SettingsView settings={settings} onSettingsChange={setSettings} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Floating Action Button */}
          {view !== 'schedule' && ( // Hide FAB on Schedule view as it has its own
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => openAddModal()}
              className="absolute bottom-8 right-8 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center hover:bg-indigo-700 transition-colors z-30"
            >
              <Plus size={28} />
            </motion.button>
          )}
        </main>

        {/* Add Task/Event Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Nuevo Elemento ✨</h2>
                  
                  {/* Type Selector */}
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setNewTaskType('task')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                        newTaskType === 'task' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <CheckSquare size={14} />
                      Tarea
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTaskType('event')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                        newTaskType === 'event' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Calendar size={14} />
                      Evento
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTaskType('class')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                        newTaskType === 'class' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <BookOpen size={14} />
                      Clase
                    </button>
                  </div>
                </div>

                <form onSubmit={addTask}>
                  <input
                    type="text"
                    placeholder={newTaskType === 'task' ? "¿Qué necesitas hacer?" : newTaskType === 'event' ? "¿Qué evento tienes?" : "¿Qué clase tienes?"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    autoFocus
                  />

                  {/* Fecha, Hora y Duración */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Fecha</label>
                      <input
                        type="date"
                        value={newTaskDate.toISOString().split('T')[0]}
                        onChange={(e) => setNewTaskDate(new Date(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Hora</label>
                      <input
                        type="time"
                        value={newTaskTime}
                        onChange={(e) => setNewTaskTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Duración</label>
                      <select
                        value={newTaskDuration}
                        onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={15}>15m</option>
                        <option value={30}>30m</option>
                        <option value={45}>45m</option>
                        <option value={60}>1h</option>
                        <option value={90}>1.5h</option>
                        <option value={120}>2h</option>
                        <option value={180}>3h</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Priority Selector (Only for Tasks) */}
                  {newTaskType === 'task' && (
                    <div className="flex gap-2 mb-6">
                      {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewTaskPriority(p)}
                          className={`flex-1 py-2 rounded-xl text-sm font-medium border capitalize transition-all ${
                            newTaskPriority === p
                              ? p === 'high' ? 'bg-rose-50 border-rose-200 text-rose-600 ring-2 ring-rose-500 ring-offset-1'
                              : p === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-600 ring-2 ring-amber-500 ring-offset-1'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-600 ring-2 ring-emerald-500 ring-offset-1'
                              : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {p === 'high' ? 'Alta' : p === 'medium' ? 'Media' : 'Baja'}
                        </button>
                      ))}
                    </div>
                  )}

                  {newTaskType === 'event' && (
                    <div className="mb-6 p-3 bg-sky-50 rounded-xl text-sky-700 text-sm flex items-center gap-2 border border-sky-100">
                      <Calendar size={16} />
                      <span>Se añadirá como un evento en tu calendario</span>
                    </div>
                  )}

                  {newTaskType === 'class' && (
                    <div className="mb-6 p-3 bg-teal-50 rounded-xl text-teal-700 text-sm flex items-center gap-2 border border-teal-100">
                      <BookOpen size={16} />
                      <span>Se añadirá como una clase en tu calendario</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-slate-400 hover:text-slate-600 font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!newTaskTitle.trim()}
                      className={`px-6 py-2 text-white rounded-xl font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                        newTaskType === 'event' 
                          ? 'bg-sky-500 hover:bg-sky-600 shadow-sky-200' 
                          : newTaskType === 'class'
                          ? 'bg-teal-500 hover:bg-teal-600 shadow-teal-200'
                          : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                      }`}
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DndProvider>
  );
}