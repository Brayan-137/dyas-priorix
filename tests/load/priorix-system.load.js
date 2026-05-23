import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 5 },
    { duration: '40s', target: 10 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
};

const CORE_URL = 'http://host.docker.internal:8000';
const GAMIFICATION_URL = 'http://host.docker.internal:8001';

export default function () {
  const email = `system_${__VU}_${__ITER}_${Date.now()}@priorix.test`;
  const password = 'password123';

  // 1. Registro de usuario en priorix-core
  const registerRes = http.post(
    `${CORE_URL}/api/auth/register`,
    JSON.stringify({
      name: 'System Load User',
      email,
      password,
      password_confirmation: password,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  );

  check(registerRes, {
    'core register success': (r) => r.status === 200 || r.status === 201,
  });

  // 2. Login en priorix-core
  const loginRes = http.post(
    `${CORE_URL}/api/auth/login`,
    JSON.stringify({
      email,
      password,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  );

  check(loginRes, {
    'core login success': (r) => r.status === 200,
  });

  const loginBody = loginRes.json();
  const token = loginBody.token || loginBody.access_token;

  // 3. Consulta de tareas en priorix-core
  const tasksRes = http.get(`${CORE_URL}/api/tasks`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  check(tasksRes, {
    'core tasks success': (r) => r.status === 200,
  });

  // 4. Registro de actividad completada en priorix-gamification
  const gamificationRes = http.post(
    `${GAMIFICATION_URL}/api/statistics/record-activity`,
    JSON.stringify({
      activity_id: Math.floor(Math.random() * 10000) + 1,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Internal-Service': 'priorix-core',
        'X-Internal-Service-Secret': 'test-internal-secret',
        'X-Internal-User-Id': String(__VU),
      },
    }
  );

  check(gamificationRes, {
    'gamification record success': (r) => r.status === 200 || r.status === 201,
  });

  sleep(1);
}