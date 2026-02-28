import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    // Pending friend requests
    const { data: friendRequests } = await supabase
      .from('friendships')
      .select(`
        id,
        created_at,
        requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('addressee_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    // Pending bot share requests (where user is owner)
    const { data: botShareRequests } = await supabase
      .from('bot_share_requests')
      .select(`
        id,
        created_at,
        bots(id, name, avatar_url),
        requester:profiles!bot_share_requests_requester_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('owner_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    const total =
      (friendRequests?.length ?? 0) + (botShareRequests?.length ?? 0);

    return NextResponse.json({
      friendRequests: friendRequests ?? [],
      botShareRequests: botShareRequests ?? [],
      total,
    });
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
