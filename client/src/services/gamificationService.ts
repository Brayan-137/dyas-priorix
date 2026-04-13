import { gamificationRequest } from '../api/client';

export async function getPet() {
  return gamificationRequest('/gamification/pet', { method: 'GET' });
}

export async function updateExperience(payload: { amount: number }) {
  return gamificationRequest('/gamification/update-experience', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getWeeklyStatistics() {
  return gamificationRequest('/statistics/weekly', { method: 'GET' });
}

export async function recordActivity(payload: any) {
  return gamificationRequest('/statistics/record-activity', { method: 'POST', body: JSON.stringify(payload) });
}
