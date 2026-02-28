import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST: Request to copy a bot
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { botId } = await request.json();
    if (!botId) return NextResponse.json({ error: '缺少Bot ID' }, { status: 400 });

    // Get bot info
    const { data: bot } = await supabase
      .from('bots')
      .select('id, owner_id, is_public, name')
      .eq('id', botId)
      .single();

    if (!bot) return NextResponse.json({ error: 'Bot不存在' }, { status: 404 });
    if (bot.owner_id === user.id) {
      return NextResponse.json({ error: '不能复制自己的Bot' }, { status: 400 });
    }

    // Check existing pending request
    const { data: existing } = await supabase
      .from('bot_share_requests')
      .select('id, status')
      .eq('bot_id', botId)
      .eq('requester_id', user.id)
      .eq('status', 'pending')
      .single();

    if (existing) {
      return NextResponse.json({ error: '已发送过申请，等待对方确认' }, { status: 409 });
    }

    // Create share request
    const { data: shareRequest, error } = await supabase
      .from('bot_share_requests')
      .insert({
        bot_id: botId,
        requester_id: user.id,
        owner_id: bot.owner_id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ shareRequest });
  } catch (err) {
    console.error('POST /api/bots/share error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// PATCH: Respond to a share request (accept/reject)
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { requestId, action } = await request.json();
    if (!requestId || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }

    // Verify user is the bot owner
    const { data: shareRequest } = await supabase
      .from('bot_share_requests')
      .select('*, bots(*)')
      .eq('id', requestId)
      .eq('owner_id', user.id)
      .eq('status', 'pending')
      .single();

    if (!shareRequest) return NextResponse.json({ error: '请求不存在' }, { status: 404 });

    if (action === 'accept') {
      // Deep copy the bot for the requester
      const sourceBotData = shareRequest.bots as Record<string, unknown>;
      const { data: newBot, error: copyError } = await supabase
        .from('bots')
        .insert({
          owner_id: shareRequest.requester_id,
          name: sourceBotData.name,
          avatar_url: sourceBotData.avatar_url,
          system_prompt: sourceBotData.system_prompt,
          is_public: false,
        })
        .select()
        .single();

      if (copyError || !newBot) throw copyError;

      // Update request status
      await supabase
        .from('bot_share_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      return NextResponse.json({ success: true, newBot });
    } else {
      await supabase
        .from('bot_share_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      return NextResponse.json({ success: true });
    }
  } catch (err) {
    console.error('PATCH /api/bots/share error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// GET: Get pending share requests for current user (as owner)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { data: requests, error } = await supabase
      .from('bot_share_requests')
      .select(`
        *,
        bots(id, name, avatar_url),
        profiles!bot_share_requests_requester_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('owner_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ requests: requests ?? [] });
  } catch (err) {
    console.error('GET /api/bots/share error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
