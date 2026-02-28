import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get public bots of a friend
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    // Verify they are friends
    const { data: friendship } = await supabase
      .from('friendships')
      .select('id')
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`
      )
      .eq('status', 'accepted')
      .single();

    if (!friendship) {
      return NextResponse.json({ error: '非好友关系' }, { status: 403 });
    }

    // Get public bots of target user
    const { data: bots, error } = await supabase
      .from('bots')
      .select('id, name, avatar_url, is_public, created_at')
      .eq('owner_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Add share request status for each bot
    const enriched = await Promise.all(
      (bots ?? []).map(async (bot) => {
        const { data: shareReq } = await supabase
          .from('bot_share_requests')
          .select('id, status')
          .eq('bot_id', bot.id)
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return { ...bot, shareRequest: shareReq ?? null };
      })
    );

    return NextResponse.json({ bots: enriched });
  } catch (err) {
    console.error('GET /api/friends/[userId]/bots error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
