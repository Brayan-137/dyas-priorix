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
    http_req_duration: ['p(95)<1000'],
  },
};

const BASE_URL = 'http://host.docker.internal:8000';

export default function () {
  const email = `loadtest_${__VU}_${__ITER}_${Date.now()}@priorix.test`;
  const password = 'password123';

  const registerRes = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      name: 'Load Test User',
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
    'register success': (r) => r.status === 200 || r.status === 201,
  });

  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
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
    'login success': (r) => r.status === 200,
  });

  const body = loginRes.json();
  const token = body.token || body.access_token;

  const tasksRes = http.get(`${BASE_URL}/api/tasks`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (tasksRes.status !== 200) {
    console.log(`TASKS STATUS: ${tasksRes.status} BODY: ${tasksRes.body}`);
  }

  check(tasksRes, {
    'tasks status is 200': (r) => r.status === 200,
    'response time < 1s': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}