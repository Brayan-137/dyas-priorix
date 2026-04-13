import React, { useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { LayoutDashboard, Calendar as CalendarIcon, Clock, BarChart2, Plus, LogOut, CheckSquare, Calendar, BookOpen, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, UserStats, PetState, Priority, ItemType, ClassSession, AppSettings } from './types';
import { listActivities, createActivity, completeActivity, updateActivity, deleteActivity } from '../services/activitiesService';
import { Toaster, toast } from 'sonner';
import { getPet, getWeeklyStatistics } from '../services/gamificationService';
import { me, login as authLogin, logout as authLogout } from '../services/authService';
import { taskFromBackend } from '../utils/mappers';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { FocusMode } from './components/FocusMode';
import { StatsView } from './components/StatsView';
import { ScheduleView } from './components/ScheduleView';
import { SettingsView } from './components/SettingsView';

// No mock data: initial states are empty and populated from backend on mount

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<UserStats>({ level: 0, xp: 0, streak: 0, tasksCompleted: 0, mood: 'neutral' });
  const [pet, setPet] = useState<PetState>({ name: '', stage: 'baby' });
  const [weeklyStatsData, setWeeklyStatsData] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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
          // Inform backend about completion
          try { completeActivity(id); } catch (e) { /* ignore */ }
        }
        return { ...t, status: newStatus };
      }
      return t;
    }));
  };

  const openAddModal = (date?: Date) => {
    if (date) setNewTaskDate(date);
    else setNewTaskDate(new Date());
    setEditingTask(null);
    setShowAddModal(true);
  };

  async function fetchRemoteData() {
    try {
      const meRes = await me();
      if (meRes.ok) setIsAuthenticated(true);

      const listRes = await listActivities();
      if (listRes.ok && Array.isArray(listRes.data)) {
        const mapped = listRes.data.map((a: any) => taskFromBackend(a));
        setTasks(mapped as Task[]);
      }

      const petRes = await getPet();
      if (petRes.ok && petRes.data) setPet(petRes.data as PetState);

      const statsRes = await getWeeklyStatistics();
      if (statsRes.ok && statsRes.data) {
        // Best-effort: if backend returns summary, attempt to set fields we know
        const s = statsRes.data;
        setStats(prev => ({ ...prev, xp: s.xp ?? prev.xp, level: s.level ?? prev.level }));
        setWeeklyStatsData(s);
      }
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    fetchRemoteData();
  }, []);

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    try {
      const res = await authLogin(loginEmail, loginPassword);
      if (res.ok) {
        setIsAuthenticated(true);
        setShowLoginModal(false);
        setLoginEmail(''); setLoginPassword('');
        await fetchRemoteData();
      } else {
        // Could show toast; keep simple
        alert('Login failed');
      }
    } catch (err) {
      alert('Login error');
    }
  }

  async function handleLogout() {
    await authLogout();
    setIsAuthenticated(false);
    // keep local tasks as fallback
  }

  // Handlers for edit/delete
  async function handleDeleteTask(id: string) {
    try {
      const res = await deleteActivity(id);
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== id));
        toast.success('Tarea eliminada');
      } else {
        setTasks(prev => prev.filter(t => t.id !== id));
        toast('Eliminada localmente');
      }
    } catch (err) {
      setTasks(prev => prev.filter(t => t.id !== id));
      toast('Error al eliminar, eliminada localmente');
    }
  }

  function handleEditTask(task: Task) {
    setEditingTask(task);
    setNewTaskTitle(task.title ?? '');
    setNewTaskType(task.type ?? 'task');
    setNewTaskDate(task.date ?? new Date());
    setNewTaskTime(task.date ? `${task.date.getHours().toString().padStart(2,'0')}:${task.date.getMinutes().toString().padStart(2,'0')}` : '12:00');
    setNewTaskDuration(task.duration ?? 60);
    if (task.priority) setNewTaskPriority(task.priority);
    setShowAddModal(true);
  }

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    // Combine date and time
    const [hours, minutes] = newTaskTime.split(':').map(Number);
    const taskDateTime = new Date(newTaskDate);
    taskDateTime.setHours(hours, minutes, 0, 0);

    const payload: Task = {
      id: Date.now().toString(),
      type: newTaskType,
      title: newTaskTitle,
      date: taskDateTime,
      priority: newTaskType === 'task' ? newTaskPriority : undefined,
      status: 'pending',
      duration: newTaskDuration
    };

    (async () => {
      if (editingTask) {
        try {
          const res = await updateActivity(editingTask.id, payload);
          if (res.ok) {
            setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...payload, id: editingTask.id } : t));
            toast.success('Tarea actualizada');
          } else {
            setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...payload, id: editingTask.id } : t));
            toast('Actualizada localmente (backend no respondió correctamente)');
          }
        } catch (err) {
          setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...payload, id: editingTask.id } : t));
          toast('Error al actualizar, cambios aplicados localmente');
        } finally {
          setEditingTask(null);
          setNewTaskTitle('');
          setShowAddModal(false);
        }
      } else {
        try {
          const res = await createActivity(payload);
          if (res.ok && res.data) {
            const created = res.data;
            payload.id = String(created.id ?? created._id ?? payload.id);
          }
          setTasks(prev => [...prev, payload]);
          toast.success('Tarea creada');
        } catch (err) {
          setTasks(prev => [...prev, payload]);
          toast('Creada localmente');
        } finally {
          setNewTaskTitle('');
          setShowAddModal(false);
        }
      }
    })();
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
      <Toaster position="top-right" />
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
            onClick={() => isAuthenticated ? handleLogout() : setShowLoginModal(true)}
            className="flex items-center justify-center p-3 text-slate-400 hover:text-rose-500 transition-colors rounded-xl hover:bg-rose-50 w-full relative group"
            title={isAuthenticated ? 'Cerrar Sesión' : 'Iniciar Sesión'}
          >
            <LogOut size={22} />
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {isAuthenticated ? 'Cerrar Sesión' : 'Iniciar Sesión'}
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
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                  />
                )}
                {view === 'schedule' && (
                  <ScheduleView />
                )}
                {view === 'focus' && (
                  <FocusMode onSessionComplete={handleSessionComplete} />
                )}
                {view === 'stats' && (
                  <StatsView stats={stats} tasks={tasks} weeklyData={weeklyStatsData} />
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
        {/* Login Modal */}
        <AnimatePresence>
          {showLoginModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
              >
                <h2 className="text-xl font-bold mb-4">Iniciar sesión</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                  <input
                    type="email"
                    placeholder="Correo"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none"
                    required
                  />

                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setShowLoginModal(false)} className="px-4 py-2 text-slate-500">Cancelar</button>
                    <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl">Entrar</button>
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