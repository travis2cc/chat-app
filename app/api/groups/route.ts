import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    // Get groups the user is a member of
    const { data: memberships, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        groups(
          id,
          name,
          avatar_url,
          created_by,
          created_at
        )
      `)
      .eq('user_id', user.id);

    if (error) throw error;

    interface GroupRow { id: string; name: string; avatar_url: string | null; created_by: string; created_at: string; }
    const groups = (memberships ?? [])
      .map((m) => Array.isArray(m.groups) ? (m.groups[0] as GroupRow) : (m.groups as GroupRow | null))
      .filter(Boolean) as GroupRow[];

    // Get last message for each group
    const groupsWithMeta = await Promise.all(
      groups.map(async (group) => {
        if (!group) return null;

        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at, sender_type')
          .eq('group_id', group.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { count: memberCount } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id);

        return {
          ...group,
          last_message: lastMsg ?? null,
          member_count: memberCount ?? 0,
        };
      })
    );

    // Sort by last message time
    const sorted = groupsWithMeta
      .filter(Boolean)
      .sort((a, b) => {
        const aTime = a?.last_message?.created_at ?? a?.created_at ?? '';
        const bTime = b?.last_message?.created_at ?? b?.created_at ?? '';
        return bTime.localeCompare(aTime);
      });

    return NextResponse.json({ groups: sorted });
  } catch (err) {
    console.error('GET /api/groups error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: '群名称不能为空' }, { status: 400 });
    }

    // Create group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({ name: name.trim(), created_by: user.id })
      .select()
      .single();

    if (groupError || !group) throw groupError;

    // Add creator as member
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      added_by: user.id,
    });

    return NextResponse.json({ group });
  } catch (err) {
    console.error('POST /api/groups error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
