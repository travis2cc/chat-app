import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    // Verify user is a member
    const { data: membership } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    // Get group info
    const { data: group, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error || !group) {
      return NextResponse.json({ error: '群组不存在' }, { status: 404 });
    }

    // Get members (users)
    const { data: members } = await supabase
      .from('group_members')
      .select(`
        user_id,
        added_by,
        joined_at,
        profiles(id, username, display_name, avatar_url)
      `)
      .eq('group_id', groupId);

    // Get bots
    const { data: bots } = await supabase
      .from('group_bots')
      .select(`
        bot_id,
        added_by,
        joined_at,
        bots(id, name, avatar_url, owner_id)
      `)
      .eq('group_id', groupId);

    return NextResponse.json({
      group,
      members: members ?? [],
      bots: bots ?? [],
    });
  } catch (err) {
    console.error('GET /api/groups/[groupId] error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
