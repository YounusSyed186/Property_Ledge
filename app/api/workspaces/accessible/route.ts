import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserWorkspaces } from '@/lib/workspace/context';

export async function GET() {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaces = await getUserWorkspaces(user.id);

    return NextResponse.json({
      workspaces: workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        status: workspace.status,
        role: workspace.roleName ?? 'Owner',
      })),
    });
  } catch (error) {
    console.error('Error in accessible workspaces API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
