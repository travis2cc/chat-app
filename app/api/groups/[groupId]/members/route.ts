import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    // Verify requester is a member
    const { data: myMembership } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!myMembership) return NextResponse.json({ error: '无权限' }, { status: 403 });

    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });

    // Check if already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return NextResponse.json({ error: '该用户已在群中' }, { status: 409 });
    }

    // Verify target user exists
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!targetProfile) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    // Add member
    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: userId,
      added_by: user.id,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/groups/[groupId]/members error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
