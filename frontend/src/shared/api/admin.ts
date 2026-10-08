import { requestJson } from './client';
import type { GpuServer, HfKey } from './types';

function adminRequest<T>(pin: string, method: 'GET' | 'POST', path: string, payload?: object) {
  return requestJson<T>(path, {
    method,
    headers: { 'X-Admin-Pin': pin, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

export const adminApi = {
  hfKeys: (pin: string) => adminRequest<{ keys: HfKey[] }>(pin, 'GET', '/api/admin/hf-keys'),
  useHfKey: (pin: string, name: string) =>
    adminRequest<{ keys: HfKey[] }>(pin, 'POST', '/api/admin/hf-keys/active', { name }),
  gpuServers: (pin: string) =>
    adminRequest<{ servers: GpuServer[] }>(pin, 'GET', '/api/admin/gpu-servers'),
  setGpuServer: (pin: string, name: string, url: string) =>
    adminRequest<{ servers: GpuServer[] }>(pin, 'POST', '/api/admin/gpu-servers', { name, url }),
};
