import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
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

    if (!membership) return NextResponse.json({ error: '无权限' }, { status: 403 });

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '50');
    const before = url.searchParams.get('before');

    let query = supabase
      .from('messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) throw error;

    // Reverse to get chronological order
    const ordered = (messages ?? []).reverse();

    // Enrich with sender info
    const enriched = await Promise.all(
      ordered.map(async (msg) => {
        if (msg.sender_type === 'user') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', msg.sender_id)
            .single();
          return { ...msg, sender: profile };
        } else {
          const { data: bot } = await supabase
            .from('bots')
            .select('id, name, avatar_url')
            .eq('id', msg.sender_id)
            .single();
          return { ...msg, sender: bot };
        }
      })
    );

    return NextResponse.json({ messages: enriched });
  } catch (err) {
    console.error('GET /api/groups/[groupId]/messages error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
