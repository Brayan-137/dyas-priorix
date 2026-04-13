import type { Task, Priority } from '../app/types';

// Map frontend priority to backend labels and viceversa
export function mapPriorityToBackend(p?: Priority) {
  if (!p) return undefined;
  switch (p) {
    case 'high': return 'alta';
    case 'medium': return 'media';
    case 'low': return 'baja';
    default: return p;
  }
}

export function mapPriorityFromBackend(b?: string): Priority | undefined {
  if (!b) return undefined;
  switch (b) {
    case 'alta': return 'high';
    case 'media': return 'medium';
    case 'baja': return 'low';
    default: return b as Priority;
  }
}

// Backend activity -> frontend Task
export function taskFromBackend(a: any): Task {
  return {
    id: String(a.id ?? a._id ?? ''),
    type: a.type ?? (a.is_event ? 'event' : 'task'),
    title: a.title ?? a.name ?? '',
    description: a.description,
    date: a.deadline ? new Date(a.deadline) : (a.date ? new Date(a.date) : new Date()),
    priority: mapPriorityFromBackend(a.priority),
    status: (a.status === 'completed' || a.status === 'done') ? 'completed' : 'pending',
    duration: a.estimated_minutes ?? a.duration,
    room: a.room,
    recurring: !!a.recurring
  };
}

// Frontend Task -> backend activity payload
export function taskToBackend(t: Task) {
  return {
    id: t.id,
    type: t.type,
    title: t.title,
    description: t.description,
    deadline: t.date ? (t.date instanceof Date ? t.date.toISOString() : t.date) : undefined,
    estimated_minutes: t.duration,
    priority: mapPriorityToBackend(t.priority),
    status: t.status,
    room: t.room,
    recurring: t.recurring
  };
}
