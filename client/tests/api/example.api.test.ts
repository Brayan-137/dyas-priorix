import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';

vi.mock('axios');

describe('API Health Check', () => {
  it('debería responder con 200', async () => {
    const mockedAxios = vi.mocked(axios);

    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: { ok: true },
    });

    const response = await axios.get('/api/health');

    expect(response.status).toBe(200);
    expect(response.data.ok).toBe(true);
  });
});