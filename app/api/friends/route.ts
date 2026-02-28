import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    // Get all accepted friendships
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        created_at,
        requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url, bio),
        addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_url, bio)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (error) throw error;

    // Extract the friend profile (not the current user)
    const friends = (friendships ?? []).map((f) => {
      const isRequester = f.requester_id === user.id;
      return isRequester ? f.addressee : f.requester;
    }).filter(Boolean);

    return NextResponse.json({ friends });
  } catch (err) {
    console.error('GET /api/friends error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
