import React from 'react';
import { AppSettings } from '../types';
import { Moon, Sun, Palette, BellRing, AlertCircle, Flame, Volume2, VolumeX } from 'lucide-react';
import * as Switch from '@radix-ui/react-switch';
import { motion } from 'motion/react';

interface SettingsViewProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSettingsChange }) => {
  const accentColors: { id: AppSettings['accentColor']; name: string; class: string }[] = [
    { id: 'indigo', name: 'Índigo', class: 'bg-indigo-500' },
    { id: 'purple', name: 'Púrpura', class: 'bg-purple-500' },
    { id: 'blue', name: 'Azul', class: 'bg-blue-500' },
    { id: 'teal', name: 'Verde azulado', class: 'bg-teal-500' },
    { id: 'green', name: 'Verde', class: 'bg-green-500' },
  ];

  const reminderOptions: { id: '15min' | '1hour' | '1day'; label: string }[] = [
    { id: '15min', label: '15 minutos antes' },
    { id: '1hour', label: '1 hora antes' },
    { id: '1day', label: '1 día antes' },
  ];

  const toggleReminderTime = (time: '15min' | '1hour' | '1day') => {
    const currentTimes = settings.reminders.times;
    const newTimes = currentTimes.includes(time)
      ? currentTimes.filter(t => t !== time)
      : [...currentTimes, time];
    
    onSettingsChange({
      ...settings,
      reminders: { ...settings.reminders, times: newTimes }
    });
  };

  return (
    <div className="h-full overflow-y-auto pr-2 pb-20 scrollbar-hide">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Configuración ⚙️</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Personaliza tu experiencia en UniFlow</p>
      </header>

      <div className="space-y-6 max-w-3xl">
        
        {/* Tema */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {settings.theme === 'dark' ? <Moon size={20} className="text-slate-700 dark:text-slate-300" /> : <Sun size={20} className="text-amber-500" />}
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Tema</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Cambia entre modo claro y oscuro</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
              <button
                onClick={() => onSettingsChange({ ...settings, theme: 'light' })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  settings.theme === 'light' 
                    ? 'bg-white dark:bg-slate-600 text-amber-600 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Sun size={16} />
                Claro
              </button>
              <button
                onClick={() => onSettingsChange({ ...settings, theme: 'dark' })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  settings.theme === 'dark' 
                    ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Moon size={16} />
                Oscuro
              </button>
            </div>
          </div>
        </section>

        {/* Color de Acento */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Palette size={20} className="text-slate-700 dark:text-slate-300" />
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Color Principal</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Personaliza el color de acento de la app</p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            {accentColors.map((color) => (
              <button
                key={color.id}
                onClick={() => onSettingsChange({ ...settings, accentColor: color.id })}
                className="group flex flex-col items-center gap-2"
              >
                <div className={`w-12 h-12 rounded-full ${color.class} transition-all ${
                  settings.accentColor === color.id 
                    ? 'ring-4 ring-offset-2 ring-slate-300 dark:ring-slate-600 scale-110' 
                    : 'hover:scale-105'
                }`} />
                <span className={`text-xs font-medium ${
                  settings.accentColor === color.id 
                    ? 'text-slate-800 dark:text-slate-100' 
                    : 'text-slate-400'
                }`}>
                  {color.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Mascota */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🦉</span>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Compañero Virtual</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Muestra tu mascota en el dashboard</p>
              </div>
            </div>
            <Switch.Root
              className="w-[52px] h-[32px] bg-slate-200 dark:bg-slate-700 rounded-full relative shadow-inner data-[state=checked]:bg-indigo-600 outline-none cursor-pointer"
              checked={settings.petEnabled}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, petEnabled: checked })}
            >
              <Switch.Thumb className="block w-[28px] h-[28px] bg-white rounded-full shadow-[0_2px_2px] shadow-blackA7 transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
            </Switch.Root>
          </div>
        </section>

        {/* Recordatorios */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BellRing size={20} className="text-slate-700 dark:text-slate-300" />
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Recordatorios</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Recibe notificaciones antes de tus tareas</p>
              </div>
            </div>
            <Switch.Root
              className="w-[52px] h-[32px] bg-slate-200 dark:bg-slate-700 rounded-full relative shadow-inner data-[state=checked]:bg-indigo-600 outline-none cursor-pointer"
              checked={settings.reminders.enabled}
              onCheckedChange={(checked) => onSettingsChange({ 
                ...settings, 
                reminders: { ...settings.reminders, enabled: checked }
              })}
            >
              <Switch.Thumb className="block w-[28px] h-[28px] bg-white rounded-full shadow-[0_2px_2px] shadow-blackA7 transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
            </Switch.Root>
          </div>

          {settings.reminders.enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700"
            >
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">Notificar con anticipación:</p>
              {reminderOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={settings.reminders.times.includes(option.id)}
                    onChange={() => toggleReminderTime(option.id)}
                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{option.label}</span>
                </label>
              ))}
            </motion.div>
          )}
        </section>

        {/* Alertas de Conflicto */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-amber-500" />
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Alertas de Conflicto de Horario</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Avisa cuando haya tareas superpuestas</p>
              </div>
            </div>
            <Switch.Root
              className="w-[52px] h-[32px] bg-slate-200 dark:bg-slate-700 rounded-full relative shadow-inner data-[state=checked]:bg-indigo-600 outline-none cursor-pointer"
              checked={settings.scheduleConflictAlerts}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, scheduleConflictAlerts: checked })}
            >
              <Switch.Thumb className="block w-[28px] h-[28px] bg-white rounded-full shadow-[0_2px_2px] shadow-blackA7 transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
            </Switch.Root>
          </div>
        </section>

        {/* Notificaciones de Racha */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame size={20} className="text-orange-500" />
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Notificación de Rachas</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Celebra cuando completes rachas importantes</p>
              </div>
            </div>
            <Switch.Root
              className="w-[52px] h-[32px] bg-slate-200 dark:bg-slate-700 rounded-full relative shadow-inner data-[state=checked]:bg-indigo-600 outline-none cursor-pointer"
              checked={settings.streakNotifications}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, streakNotifications: checked })}
            >
              <Switch.Thumb className="block w-[28px] h-[28px] bg-white rounded-full shadow-[0_2px_2px] shadow-blackA7 transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
            </Switch.Root>
          </div>
        </section>

        {/* Modo Silencioso */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {settings.silentMode.enabled ? <VolumeX size={20} className="text-slate-700 dark:text-slate-300" /> : <Volume2 size={20} className="text-slate-700 dark:text-slate-300" />}
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Modo Silencioso</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Desactiva notificaciones en horarios específicos</p>
              </div>
            </div>
            <Switch.Root
              className="w-[52px] h-[32px] bg-slate-200 dark:bg-slate-700 rounded-full relative shadow-inner data-[state=checked]:bg-indigo-600 outline-none cursor-pointer"
              checked={settings.silentMode.enabled}
              onCheckedChange={(checked) => onSettingsChange({ 
                ...settings, 
                silentMode: { ...settings.silentMode, enabled: checked }
              })}
            >
              <Switch.Thumb className="block w-[28px] h-[28px] bg-white rounded-full shadow-[0_2px_2px] shadow-blackA7 transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
            </Switch.Root>
          </div>

          {settings.silentMode.enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700"
            >
              <div className="flex-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2 block">Inicio</label>
                <input
                  type="time"
                  value={settings.silentMode.startTime}
                  onChange={(e) => onSettingsChange({
                    ...settings,
                    silentMode: { ...settings.silentMode, startTime: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2 block">Fin</label>
                <input
                  type="time"
                  value={settings.silentMode.endTime}
                  onChange={(e) => onSettingsChange({
                    ...settings,
                    silentMode: { ...settings.silentMode, endTime: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </motion.div>
          )}
        </section>

      </div>
    </div>
  );
};
