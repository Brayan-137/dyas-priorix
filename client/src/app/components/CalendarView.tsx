import React, { useState, useRef, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, 
  addWeeks, subWeeks, addDays, subDays, startOfDay, addHours, 
  isSameHour, getHours, getMinutes, setHours, setMinutes
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, ChevronDown, X, Edit2, Trash2, Mail, MoreVertical, Bell, MapPin, AlignLeft, CheckCircle2 } from 'lucide-react';
import { Task } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { usePopper } from 'react-popper';

type ViewType = 'day' | 'week' | 'month';

interface CalendarViewProps {
  tasks: Task[];
  onAddTask: (date: Date) => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  onTaskToggle?: (id: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onAddTask, onSelectDate, selectedDate, onTaskToggle }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('week');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Popper State
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLElement | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Task | null>(null);
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: 'right-start',
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [0, 10],
        },
      },
      {
        name: 'preventOverflow',
        options: {
          padding: 16,
        },
      },
      {
        name: 'flip',
      },
    ],
  });

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popperElement && !popperElement.contains(event.target as Node) && 
          referenceElement && !referenceElement.contains(event.target as Node)) {
        setSelectedEvent(null);
        setReferenceElement(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popperElement, referenceElement]);

  // Scroll to 8 AM on mount for week/day view
  useEffect(() => {
    if (scrollContainerRef.current && (viewType === 'week' || viewType === 'day')) {
      const scrollPos = 8 * 60; // 8 AM * 60px height approx
      scrollContainerRef.current.scrollTop = scrollPos;
    }
  }, [viewType]);

  const navigate = (direction: 'prev' | 'next') => {
    if (viewType === 'month') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else if (viewType === 'week') {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  // --- LAYOUT ALGORITHM ---

  interface LayoutEvent {
    task: Task;
    style: React.CSSProperties;
  }

  const calculateEventLayout = (dayTasks: Task[]): LayoutEvent[] => {
    if (dayTasks.length === 0) return [];

    // 1. Sort by start time, then duration
    const sorted = [...dayTasks].sort((a, b) => {
      const diff = a.date.getTime() - b.date.getTime();
      if (diff !== 0) return diff;
      return (b.duration || 60) - (a.duration || 60);
    });

    const result: LayoutEvent[] = [];
    
    // 2. Group overlapping events
    let currentGroup: Task[] = [];
    let groupEnd = 0;

    const processGroup = (group: Task[]) => {
      if (group.length === 0) return;

      const columns: Task[][] = [];
      const placements: { task: Task; col: number }[] = [];

      group.forEach(task => {
        const start = task.date.getTime();
        let placed = false;
        
        for (let i = 0; i < columns.length; i++) {
          const lastInCol = columns[i][columns[i].length - 1];
          const lastEnd = lastInCol.date.getTime() + (lastInCol.duration || 60) * 60000;
          
          if (start >= lastEnd) {
            columns[i].push(task);
            placements.push({ task, col: i });
            placed = true;
            break;
          }
        }

        if (!placed) {
          columns.push([task]);
          placements.push({ task, col: columns.length - 1 });
        }
      });

      const totalCols = columns.length;
      placements.forEach(p => {
        const startHour = getHours(p.task.date);
        const startMin = getMinutes(p.task.date);
        const duration = p.task.duration || 60;
        
        const top = (startHour * 60) + startMin;
        const height = duration;

        let colors = 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200';
        
        // Logic for completed tasks: gray and strikethrough
        if (p.task.status === 'completed' && p.task.type === 'task') {
          colors = 'bg-slate-100 border-slate-200 text-slate-400 line-through decoration-slate-400 grayscale';
        } else {
          if (p.task.type === 'event') {
            colors = 'bg-sky-100 border-sky-200 text-sky-700 hover:bg-sky-200';
          } else if (p.task.type === 'class') {
            colors = 'bg-teal-100 border-teal-200 text-teal-700 hover:bg-teal-200';
          } else if (p.task.priority) {
             if (p.task.priority === 'high') colors = 'bg-rose-100 border-rose-200 text-rose-700 hover:bg-rose-200';
             if (p.task.priority === 'medium') colors = 'bg-purple-100 border-purple-200 text-purple-700 hover:bg-purple-200';
             if (p.task.priority === 'low') colors = 'bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200';
          }
        }
        
        if (selectedEvent && selectedEvent.id === p.task.id) {
           colors = p.task.type === 'event' 
             ? 'bg-sky-200 border-sky-400 text-sky-900 ring-2 ring-sky-300 z-30'
             : 'bg-indigo-200 border-indigo-400 text-indigo-900 ring-2 ring-indigo-300 z-30';
        }

        result.push({
          task: p.task,
          style: {
            top: `${top}px`,
            height: `${height}px`,
            left: `${(p.col / totalCols) * 100}%`,
            width: `${100 / totalCols}%`,
            position: 'absolute',
            className: `absolute rounded-lg border px-2 py-1 text-xs font-medium shadow-sm transition-all cursor-pointer z-10 overflow-hidden ${colors}`
          }
        });
      });
    };

    sorted.forEach(task => {
      const start = task.date.getTime();
      const end = start + (task.duration || 60) * 60000;

      if (currentGroup.length === 0) {
        currentGroup.push(task);
        groupEnd = end;
      } else {
        if (start < groupEnd) {
          currentGroup.push(task);
          groupEnd = Math.max(groupEnd, end);
        } else {
          processGroup(currentGroup);
          currentGroup = [task];
          groupEnd = end;
        }
      }
    });
    processGroup(currentGroup);

    return result;
  };

  const renderTimeGrid = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    let daysToShow = [currentDate];
    if (viewType === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      daysToShow = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex border-b border-slate-100 ml-14">
          {daysToShow.map((day) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toString()} className="flex-1 text-center py-3 border-r border-slate-50 last:border-r-0">
                <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {format(day, 'EEE', { locale: es })}
                </div>
                <div className={`
                  inline-flex items-center justify-center w-8 h-8 rounded-full text-lg font-bold
                  ${isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-700'}
                `}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative scrollbar-hide">
          <div className="flex min-h-[1440px]">
            <div className="w-14 flex-shrink-0 flex flex-col bg-white border-r border-slate-100 sticky left-0 z-20">
              {hours.map((hour) => (
                <div key={hour} className="h-[60px] relative">
                  <span className="absolute -top-3 right-2 text-xs text-slate-400 font-medium bg-white px-1">
                    {format(setHours(new Date(), hour), 'h a')}
                  </span>
                  <div className="w-2 h-px bg-slate-100 absolute top-0 right-0" />
                </div>
              ))}
            </div>

            <div className="flex flex-1 relative">
              <div className="absolute inset-0 z-0 pointer-events-none">
                {hours.map((hour) => (
                  <div key={hour} className="h-[60px] border-b border-slate-50 w-full" />
                ))}
              </div>

              {daysToShow.map((day, dayIdx) => {
                const dayTasks = tasks.filter(t => isSameDay(t.date, day));
                const layoutEvents = calculateEventLayout(dayTasks);
                
                return (
                  <div key={day.toString()} className="flex-1 border-r border-slate-50 last:border-r-0 relative min-w-[100px] group">
                     {isSameDay(day, new Date()) && (
                       <div 
                         className="absolute w-full border-t-2 border-red-400 z-20 pointer-events-none flex items-center"
                         style={{ top: `${getHours(new Date()) * 60 + getMinutes(new Date())}px` }}
                       >
                         <div className="w-2 h-2 bg-red-400 rounded-full -ml-1" />
                       </div>
                     )}

                     <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity z-0 bg-slate-50/10 pointer-events-none" />
                     
                     {layoutEvents.map(({ task, style }) => (
                       <motion.div
                         key={task.id}
                         initial={{ opacity: 0, scale: 0.9 }}
                         animate={{ opacity: 1, scale: 1 }}
                         style={{ 
                            top: style.top, 
                            height: style.height, 
                            left: style.left, 
                            width: style.width 
                         }}
                         className={style.className as string}
                         onClick={(e) => { 
                           e.stopPropagation(); 
                           if (selectedEvent?.id !== task.id) {
                              setReferenceElement(e.currentTarget as HTMLElement);
                              setSelectedEvent(task);
                           } else {
                              setSelectedEvent(null);
                              setReferenceElement(null);
                           }
                         }}
                       >
                         <div className="flex items-center gap-1 mb-0.5 overflow-hidden pointer-events-none">
                           <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                             task.status === 'completed' && task.type === 'task' ? 'bg-slate-400' :
                             task.type === 'event' ? 'bg-sky-500' :
                             task.type === 'class' ? 'bg-teal-500' :
                             task.priority === 'high' ? 'bg-rose-500' : task.priority === 'medium' ? 'bg-purple-500' : 'bg-emerald-500'
                           }`} />
                           <span className="font-bold truncate text-[11px] leading-tight">{task.title}</span>
                         </div>
                         {(parseInt(style.height as string) > 30) && (
                            <div className="text-[9px] opacity-80 flex items-center gap-1 truncate pointer-events-none">
                                {format(task.date, 'h:mm')} - {format(addHours(task.date, (task.duration || 60)/60), 'h:mm')}
                            </div>
                         )}
                       </motion.div>
                     ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMonthGrid = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    return (
      <div className="flex flex-col h-full">
        <div className="grid grid-cols-7 mb-2 border-b border-slate-100 pb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-100 gap-px rounded-xl overflow-hidden border border-slate-100">
           {calendarDays.map((day) => {
             const dayTasks = tasks.filter(t => isSameDay(t.date, day));
             const isCurrentMonth = isSameMonth(day, monthStart);
             const isToday = isSameDay(day, new Date());
             
             return (
               <div 
                 key={day.toString()} 
                 className={`bg-white p-2 flex flex-col gap-1 min-h-[80px] hover:bg-slate-50 transition-colors cursor-pointer relative group ${!isCurrentMonth && 'bg-slate-50/50 text-slate-300'}`}
                 onClick={() => { onSelectDate(day); setViewType('day'); setCurrentDate(day); }}
               >
                 <div className="flex justify-between items-center">
                   <span className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium ${isToday ? 'bg-indigo-600 text-white' : ''}`}>
                     {format(day, 'd')}
                   </span>
                   {dayTasks.length > 0 && (
                     <span className="text-[10px] text-slate-400 font-medium">{dayTasks.length}</span>
                   )}
                 </div>
                 
                 <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1 mt-1">
                   {dayTasks.slice(0, 3).map(task => (
                     <div 
                        key={task.id} 
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate border-l-2 cursor-pointer hover:brightness-95 ${
                          task.status === 'completed' && task.type === 'task' ? 'border-slate-300 bg-slate-100 text-slate-400 line-through' :
                          task.type === 'event' ? 'border-sky-500 bg-sky-50 text-sky-700' :
                          task.type === 'class' ? 'border-teal-500 bg-teal-50 text-teal-700' :
                          task.priority === 'high' ? 'border-rose-500 bg-rose-50' : 
                          task.priority === 'medium' ? 'border-purple-500 bg-purple-50' : 'border-emerald-500 bg-emerald-50'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setReferenceElement(e.currentTarget as HTMLElement);
                          setSelectedEvent(task);
                        }}
                     >
                       {task.title}
                     </div>
                   ))}
                 </div>
                 
                 <button 
                    onClick={(e) => { e.stopPropagation(); onAddTask(day); }}
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100"
                 >
                   <Plus size={14} />
                 </button>
               </div>
             );
           })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-full flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={goToToday} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors">
            Hoy
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('prev')} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><ChevronLeft size={20} /></button>
            <button onClick={() => navigate('next')} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><ChevronRight size={20} /></button>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 capitalize min-w-[200px]">
            {format(currentDate, viewType === 'day' ? "d 'de' MMMM" : 'MMMM yyyy', { locale: es })}
          </h2>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          {(['day', 'week', 'month'] as ViewType[]).map((v) => (
            <button
              key={v}
              onClick={() => setViewType(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                viewType === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
          <div className="w-px h-6 bg-slate-300 mx-1" />
           <button 
             onClick={() => onAddTask(currentDate)}
             className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
           >
             <Plus size={18} />
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden min-h-0 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewType}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {viewType === 'month' ? renderMonthGrid() : renderTimeGrid()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Event Details Popover */}
      {selectedEvent && (
        <div 
          ref={setPopperElement}
          style={styles.popper}
          {...attributes.popper}
          className="z-50 min-w-[320px] max-w-sm"
        >
          <motion.div
             initial={{ opacity: 0, scale: 0.95, y: 10 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.95 }}
             className="bg-slate-900 text-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700"
          >
             {/* Header Actions */}
             <div className="flex items-center justify-end gap-1 p-2 bg-slate-800/50 border-b border-slate-700/50">
               <button onClick={() => { if (onEdit) onEdit(selectedEvent); }} className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white">
                 <Edit2 size={16} />
               </button>
               <button onClick={() => { if (onDelete) onDelete(selectedEvent.id); setSelectedEvent(null); setReferenceElement(null); }} className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-rose-400">
                 <Trash2 size={16} />
               </button>
               <button className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white">
                 <Mail size={16} />
               </button>
               <div className="w-px h-4 bg-slate-700 mx-1" />
               <button 
                 onClick={() => { setSelectedEvent(null); setReferenceElement(null); }}
                 className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
               >
                 <X size={18} />
               </button>
             </div>

             {/* Content */}
             <div className="p-5">
               <div className="flex items-start gap-4 mb-4">
                 <div className={`mt-1.5 w-4 h-4 rounded-md flex-shrink-0 ${
                    selectedEvent.status === 'completed' ? 'bg-slate-500' :
                    selectedEvent.type === 'event' ? 'bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]' :
                    selectedEvent.priority === 'high' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 
                    selectedEvent.priority === 'medium' ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 
                    'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                 }`} />
                 <div>
                   <h3 className={`text-xl font-bold leading-tight mb-1 ${selectedEvent.status === 'completed' && selectedEvent.type === 'task' ? 'line-through text-slate-400' : ''}`}>
                     {selectedEvent.title}
                   </h3>
                   <div className="text-slate-400 text-sm">
                     {format(selectedEvent.date, "EEEE, d 'de' MMMM", { locale: es })}
                     <span className="mx-2">•</span>
                     {format(selectedEvent.date, 'h:mm a')} - {format(addHours(selectedEvent.date, (selectedEvent.duration || 60)/60), 'h:mm a')}
                   </div>
                 </div>
               </div>

               <div className="space-y-4 pl-8">
                 <div className="flex items-center gap-3 text-sm text-slate-300">
                   <Bell size={16} className="text-slate-500" />
                   <span>10 minutos antes</span>
                 </div>
                 
                 {selectedEvent.description && (
                   <div className="flex items-start gap-3 text-sm text-slate-300">
                     <AlignLeft size={16} className="text-slate-500 mt-0.5" />
                     <p className="leading-relaxed opacity-90">{selectedEvent.description}</p>
                   </div>
                 )}

                 <div className="flex items-center gap-3 text-sm text-slate-300">
                   <CalendarIcon size={16} className="text-slate-500" />
                   <span>{selectedEvent.type === 'event' ? 'Mi Calendario' : 'Tareas Universitarias'}</span>
                 </div>
               </div>
               
               {/* Botón marcar como completada (solo tareas) */}
               {selectedEvent.type === 'task' && onTaskToggle && (
                 <div className="mt-5 pt-5 border-t border-slate-700">
                   <button
                     onClick={() => {
                       onTaskToggle(selectedEvent.id);
                       setSelectedEvent(null);
                       setReferenceElement(null);
                     }}
                     className={`w-full py-2.5 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                       selectedEvent.status === 'completed'
                         ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                         : 'bg-indigo-600 text-white hover:bg-indigo-700'
                     }`}
                   >
                     <CheckCircle2 size={18} />
                     {selectedEvent.status === 'completed' ? 'Marcar como pendiente' : 'Marcar como completada'}
                   </button>
                 </div>
               )}
             </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};