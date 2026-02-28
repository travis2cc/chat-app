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

    // Verify requester is a group member
    const { data: myMembership } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!myMembership) return NextResponse.json({ error: '无权限' }, { status: 403 });

    const { botId } = await request.json();
    if (!botId) return NextResponse.json({ error: '缺少Bot ID' }, { status: 400 });

    // Verify user owns this bot
    const { data: bot } = await supabase
      .from('bots')
      .select('id, name')
      .eq('id', botId)
      .eq('owner_id', user.id)
      .single();

    if (!bot) return NextResponse.json({ error: '只能添加自己的Bot' }, { status: 403 });

    // Check if already in group
    const { data: existing } = await supabase
      .from('group_bots')
      .select('group_id')
      .eq('group_id', groupId)
      .eq('bot_id', botId)
      .single();

    if (existing) return NextResponse.json({ error: 'Bot已在群中' }, { status: 409 });

    // Add bot
    const { error } = await supabase.from('group_bots').insert({
      group_id: groupId,
      bot_id: botId,
      added_by: user.id,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/groups/[groupId]/bots error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { botId } = await request.json();

    // Verify user owns this bot
    const { data: bot } = await supabase
      .from('bots')
      .select('id')
      .eq('id', botId)
      .eq('owner_id', user.id)
      .single();

    if (!bot) return NextResponse.json({ error: '无权限' }, { status: 403 });

    await supabase
      .from('group_bots')
      .delete()
      .eq('group_id', groupId)
      .eq('bot_id', botId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/groups/[groupId]/bots error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
