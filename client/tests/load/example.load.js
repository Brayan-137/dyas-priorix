import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '15s',
};

export default function () {
  const res = http.get('http://localhost:3000/api/health');

  check(res, {
    'status es 200': (r) => r.status === 200,
    'respuesta < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}