import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { UserStats, Task } from '../types';

interface StatsViewProps {
  stats: UserStats;
  tasks: Task[];
}

export const StatsView: React.FC<StatsViewProps> = ({ stats, tasks }) => {
  // Dummy data for the chart
  const productivityData = [
    { day: 'Lun', completed: 4, focus: 120 },
    { day: 'Mar', completed: 6, focus: 180 },
    { day: 'Mié', completed: 3, focus: 90 },
    { day: 'Jue', completed: 8, focus: 240 },
    { day: 'Vie', completed: 5, focus: 150 },
    { day: 'Sáb', completed: 2, focus: 60 },
    { day: 'Dom', completed: 1, focus: 30 },
  ];

  return (
    <div className="space-y-8 pb-20">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Estadísticas Académicas 📊</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Tareas Totales</p>
          <p className="text-4xl font-bold text-indigo-600">{stats.tasksCompleted}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Racha Actual</p>
          <p className="text-4xl font-bold text-orange-500">{stats.streak} <span className="text-xl">🔥</span></p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Nivel</p>
          <p className="text-4xl font-bold text-purple-600">{stats.level}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">XP Total</p>
          <p className="text-4xl font-bold text-emerald-500">{stats.xp}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-96">
          <h3 className="text-lg font-bold text-slate-700 mb-6">Productividad Semanal</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={productivityData}>
              <defs>
                <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="focus" 
                stroke="#8884d8" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorFocus)" 
                name="Minutos de enfoque"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-96">
          <h3 className="text-lg font-bold text-slate-700 mb-6">Tareas Completadas vs Pendientes</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={productivityData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              <Bar dataKey="completed" name="Completadas" fill="#4ade80" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
