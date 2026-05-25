import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkKubectlInstalled, getDeployments, getCurrentContext } from './kubectl';
import { runCommand } from '@/api/exec';

vi.mock('@/api/exec', () => ({
  runCommand: vi.fn(),
}));

describe('kubectl api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checkKubectlInstalled returns true when found', async () => {
    vi.mocked(runCommand).mockResolvedValue({ stdout: 'clientVersion', stderr: '', success: true });
    expect(await checkKubectlInstalled()).toBe(true);
  });

  it('getCurrentContext returns null on error', async () => {
    vi.mocked(runCommand).mockRejectedValue(new Error('no context'));
    expect(await getCurrentContext()).toBe(null);
  });

  it('getDeployments throws for invalid namespace format', async () => {
    await expect(getDeployments('invalid space')).rejects.toThrow('Invalid Kubernetes name format');
  });

  it('getDeployments parses JSON output for single namespace', async () => {
    const mockOut = JSON.stringify({
      items: [{
        metadata: { name: 'dep1', namespace: 'default', creationTimestamp: new Date(Date.now() - 86400000).toISOString() },
        spec: { replicas: 2, template: { spec: { containers: [{ image: 'nginx:1.2.3' }] } } },
        status: { readyReplicas: 2, updatedReplicas: 2, availableReplicas: 2, conditions: [{ type: 'Available', status: 'True' }] }
      }]
    });
    vi.mocked(runCommand).mockResolvedValue({ stdout: mockOut, stderr: '', success: true });
    const res = await getDeployments('default');
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe('dep1');
    expect(res[0].namespace).toBe('default');
    expect(res[0].ready).toBe('2/2');
    expect(res[0].status).toBe('healthy');
    expect(res[0].images).toEqual(['nginx:1.2.3']);
    expect(res[0].age).toBe('1d');
  });

  it('getDeployments parses JSON output with all-namespaces', async () => {
    const mockOut = JSON.stringify({
      items: [{
        metadata: { name: 'dep1', namespace: 'ns1', creationTimestamp: new Date().toISOString() },
        spec: { replicas: 1, template: { spec: { containers: [{ image: 'app:v1' }] } } },
        status: { readyReplicas: 1, updatedReplicas: 1, availableReplicas: 1, conditions: [{ type: 'Progressing', status: 'True' }] }
      }]
    });
    vi.mocked(runCommand).mockResolvedValue({ stdout: mockOut, stderr: '', success: true });
    const res = await getDeployments();
    expect(res).toHaveLength(1);
    expect(res[0].namespace).toBe('ns1');
    expect(res[0].name).toBe('dep1');
    expect(res[0].status).toBe('progressing');
    expect(res[0].age).toBe('0s');
  });
});
