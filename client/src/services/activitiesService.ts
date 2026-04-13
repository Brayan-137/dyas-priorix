import { coreRequest } from '../api/client';
import { taskFromBackend, taskToBackend } from '../utils/mappers';
import type { Task } from '../app/types';

export async function listActivities() {
  return coreRequest('/activities', { method: 'GET' });
}

export async function getActivity(id: string) {
  return coreRequest(`/activities/${id}`, { method: 'GET' });
}

export async function createActivity(task: Task) {
  const payload = taskToBackend(task);
  return coreRequest('/activities', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateActivity(id: string, task: Task) {
  const payload = taskToBackend(task);
  return coreRequest(`/activities/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteActivity(id: string) {
  return coreRequest(`/activities/${id}`, { method: 'DELETE' });
}

export async function completeActivity(id: string) {
  return coreRequest(`/activities/${id}/complete`, { method: 'POST' });
}
