import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1000'],
  },
};

const BASE_URL = 'http://host.docker.internal:8001';

export default function () {
  const res = http.get(`${BASE_URL}/api/statistics/weekly`, {
    headers: {
      'X-Internal-Service': 'priorix-core',
      'X-Internal-Service-Secret': 'test-internal-secret',
      'X-Internal-User-Id': '1',
    },
  });

  check(res, {
    'status is not 500': (r) => r.status !== 500,
    'response time < 1s': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}