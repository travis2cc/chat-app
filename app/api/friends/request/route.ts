import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { addresseeId } = await request.json();
    if (!addresseeId) return NextResponse.json({ error: '缺少目标用户ID' }, { status: 400 });
    if (addresseeId === user.id) {
      return NextResponse.json({ error: '不能添加自己为好友' }, { status: 400 });
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`
      )
      .single();

    if (existing) {
      if (existing.status === 'accepted') {
        return NextResponse.json({ error: '已经是好友了' }, { status: 409 });
      }
      if (existing.status === 'pending') {
        return NextResponse.json({ error: '已发送过好友请求' }, { status: 409 });
      }
    }

    const { data: friendship, error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: addresseeId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ friendship });
  } catch (err) {
    console.error('POST /api/friends/request error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// GET: Get pending friend requests for current user (as addressee)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { data: requests, error } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        created_at,
        requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('addressee_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ requests: requests ?? [] });
  } catch (err) {
    console.error('GET /api/friends/request error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
