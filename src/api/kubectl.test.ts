import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkKubectlInstalled, getDeployments, getCurrentContext, getNamespacePodCommits } from './kubectl';
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

  it('getDeployments extracts GIT_COMMIT env var from containers', async () => {
    const mockOut = JSON.stringify({
      items: [{
        metadata: { name: 'bff-dp', namespace: 'my-product', creationTimestamp: new Date().toISOString() },
        spec: {
          replicas: 1,
          template: {
            spec: {
              containers: [{
                image: 'registry/app:2589dda4',
                env: [
                  { name: 'ENVIRONMENT', value: 'staging' },
                  { name: 'GIT_COMMIT', value: '4b34588f308580bdbab9a86d0248b8729442e4c9' },
                ],
              }],
            },
          },
        },
        status: { readyReplicas: 1, updatedReplicas: 1, availableReplicas: 1, conditions: [{ type: 'Available', status: 'True' }] }
      }]
    });
    vi.mocked(runCommand).mockResolvedValue({ stdout: mockOut, stderr: '', success: true });
    const res = await getDeployments('my-product');
    expect(res[0].gitCommit).toBe('4b34588f308580bdbab9a86d0248b8729442e4c9');
  });

  it('getDeployments returns undefined gitCommit when env var is absent', async () => {
    const mockOut = JSON.stringify({
      items: [{
        metadata: { name: 'dep1', namespace: 'default', creationTimestamp: new Date().toISOString() },
        spec: { replicas: 1, template: { spec: { containers: [{ image: 'nginx:1.2.3', env: [{ name: 'ENVIRONMENT', value: 'staging' }] }] } } },
        status: { readyReplicas: 1, updatedReplicas: 1, availableReplicas: 1, conditions: [{ type: 'Available', status: 'True' }] }
      }]
    });
    vi.mocked(runCommand).mockResolvedValue({ stdout: mockOut, stderr: '', success: true });
    const res = await getDeployments('default');
    expect(res[0].gitCommit).toBeUndefined();
  });

  it('getDeployments extracts GIT_COMMIT from a secondary container', async () => {
    const mockOut = JSON.stringify({
      items: [{
        metadata: { name: 'dep1', namespace: 'default', creationTimestamp: new Date().toISOString() },
        spec: {
          replicas: 1,
          template: {
            spec: {
              containers: [
                { image: 'sidecar:v1' },
                { image: 'app:v1', env: [{ name: 'GIT_COMMIT', value: 'abc1234' }] },
              ],
            },
          },
        },
        status: { readyReplicas: 1, updatedReplicas: 1, availableReplicas: 1, conditions: [{ type: 'Available', status: 'True' }] }
      }]
    });
    vi.mocked(runCommand).mockResolvedValue({ stdout: mockOut, stderr: '', success: true });
    const res = await getDeployments('default');
    expect(res[0].gitCommit).toBe('abc1234');
  });

  it('getDeployments extracts the selector matchLabels', async () => {
    const mockOut = JSON.stringify({
      items: [{
        metadata: { name: 'bff-dp', namespace: 'my-product', creationTimestamp: new Date().toISOString() },
        spec: {
          replicas: 1,
          selector: { matchLabels: { app: 'bff' } },
          template: { spec: { containers: [{ image: 'api:aaa' }] } },
        },
        status: { readyReplicas: 1, updatedReplicas: 1, availableReplicas: 1, conditions: [{ type: 'Available', status: 'True' }] }
      }]
    });
    vi.mocked(runCommand).mockResolvedValue({ stdout: mockOut, stderr: '', success: true });
    const res = await getDeployments('my-product');
    expect(res[0].selector).toEqual({ app: 'bff' });
  });

  it('getNamespacePodCommits fetches all pods of a namespace in one call', async () => {
    const podsOut = JSON.stringify({
      items: [
        {
          metadata: { name: 'bff-dp-86bcf78459-nrrb7', labels: { app: 'bff' } },
          status: { phase: 'Running' },
          spec: { containers: [{ image: 'registry/api:2589dda4', env: [{ name: 'GIT_COMMIT', value: 'newsha1234' }] }] },
        },
        {
          metadata: { name: 'portal-dp-79dbd65d9d-old11', labels: { app: 'portal' } },
          status: { phase: 'Running' },
          spec: { containers: [{ image: 'registry/web:d01be8eb', env: [{ name: 'GIT_COMMIT', value: 'oldsha9999' }] }] },
        },
      ],
    });
    vi.mocked(runCommand).mockResolvedValueOnce({ stdout: podsOut, stderr: '', success: true });

    const res = await getNamespacePodCommits('my-product', 'ctx-1');
    expect(res).toHaveLength(2);
    expect(res[0]).toEqual({ name: 'bff-dp-86bcf78459-nrrb7', phase: 'Running', gitCommit: 'newsha1234', images: ['registry/api:2589dda4'], labels: { app: 'bff' } });
    expect(res[1].gitCommit).toBe('oldsha9999');
    expect(vi.mocked(runCommand)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(runCommand).mock.calls[0][0]).toEqual(['kubectl', 'get', 'pods', '-n', 'my-product', '--context=ctx-1', '-o', 'json']);
  });

  it('getNamespacePodCommits returns empty array on invalid JSON', async () => {
    vi.mocked(runCommand).mockResolvedValueOnce({ stdout: 'not-json', stderr: '', success: true });
    const res = await getNamespacePodCommits('my-product');
    expect(res).toEqual([]);
  });
});
