import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { data: bot, error } = await supabase
      .from('bots')
      .select('*')
      .eq('id', botId)
      .single();

    if (error || !bot) return NextResponse.json({ error: 'Bot不存在' }, { status: 404 });

    // Only owner can see private bots
    if (!bot.is_public && bot.owner_id !== user.id) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    return NextResponse.json({ bot });
  } catch (err) {
    console.error('GET /api/bots/[botId] error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    // Verify ownership
    const { data: existing } = await supabase
      .from('bots')
      .select('id, owner_id')
      .eq('id', botId)
      .single();

    if (!existing || existing.owner_id !== user.id) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { name, systemPrompt, isPublic, avatarUrl } = await request.json();

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (systemPrompt !== undefined) updates.system_prompt = systemPrompt;
    if (isPublic !== undefined) updates.is_public = isPublic;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

    const { data: bot, error } = await supabase
      .from('bots')
      .update(updates)
      .eq('id', botId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ bot });
  } catch (err) {
    console.error('PUT /api/bots/[botId] error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { data: bot } = await supabase
      .from('bots')
      .select('owner_id')
      .eq('id', botId)
      .single();

    if (!bot || bot.owner_id !== user.id) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    await supabase.from('bots').delete().eq('id', botId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/bots/[botId] error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
