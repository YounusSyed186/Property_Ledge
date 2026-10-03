import { expect, test } from '@playwright/test';
import { sanitizePropertyUpdateInput } from '@/lib/dashboard/service';

test('property updates cannot change ownership, workspace, or database identity fields', () => {
  const sanitized = sanitizePropertyUpdateInput({
    name: 'Updated Property',
    id: 'attacker-controlled-id',
    workspace_id: 'other-workspace-id',
    owner_id: 'other-user-id',
    created_at: '2000-01-01T00:00:00.000Z',
    updated_at: '2000-01-01T00:00:00.000Z',
  });

  expect(sanitized).toEqual({ name: 'Updated Property' });
});