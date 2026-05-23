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

const BASE_URL = 'http://host.docker.internal:8001';

export default function () {
  const res = http.post(
    `${BASE_URL}/api/statistics/record-activity`,
    JSON.stringify({
      activity_id: 1001,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Internal-Service': 'priorix-core',
        'X-Internal-Service-Secret': 'test-internal-secret',
        'X-Internal-User-Id': '30',
      },
    }
  );

  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'response time < 1.5s': (r) => r.timings.duration < 1500,
  });

  sleep(1);
}