import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio')
      .ilike('username', `%${q}%`)
      .neq('id', user.id)
      .limit(10);

    if (error) throw error;

    // Annotate with friendship status
    const enriched = await Promise.all(
      (profiles ?? []).map(async (profile) => {
        const { data: friendship } = await supabase
          .from('friendships')
          .select('id, status, requester_id')
          .or(
            `and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${user.id})`
          )
          .single();

        let friendshipStatus: string | null = null;
        let friendshipId: string | null = null;
        if (friendship) {
          friendshipStatus = friendship.status;
          friendshipId = friendship.id;
        }

        return { ...profile, friendshipStatus, friendshipId };
      })
    );

    return NextResponse.json({ users: enriched });
  } catch (err) {
    console.error('GET /api/friends/search error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
