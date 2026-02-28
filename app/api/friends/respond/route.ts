import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { friendshipId, action } = await request.json();
    if (!friendshipId || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }

    // Verify this request is for current user
    const { data: friendship } = await supabase
      .from('friendships')
      .select('id, status')
      .eq('id', friendshipId)
      .eq('addressee_id', user.id)
      .eq('status', 'pending')
      .single();

    if (!friendship) return NextResponse.json({ error: '请求不存在' }, { status: 404 });

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    const { error } = await supabase
      .from('friendships')
      .update({ status: newStatus })
      .eq('id', friendshipId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/friends/respond error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
