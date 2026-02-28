import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { groupId, content } = await request.json();
    if (!groupId || !content?.trim()) {
      return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });
    }

    // Verify user is a member
    const { data: membership } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership) return NextResponse.json({ error: '无权限' }, { status: 403 });

    // Save message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        group_id: groupId,
        sender_id: user.id,
        sender_type: 'user',
        content: content.trim(),
      })
      .select()
      .single();

    if (error || !message) throw error;

    // Trigger bot processing asynchronously (fire and forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.VERCEL_URL}`;
    if (appUrl) {
      fetch(`${appUrl}/api/bots/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.INTERNAL_API_KEY ?? '',
        },
        body: JSON.stringify({ groupId, messageId: message.id }),
      }).catch((err) => console.error('Bot trigger failed:', err));
    }

    return NextResponse.json({ message });
  } catch (err) {
    console.error('POST /api/messages error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
