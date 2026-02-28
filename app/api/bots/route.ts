import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { data: bots, error } = await supabase
      .from('bots')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ bots: bots ?? [] });
  } catch (err) {
    console.error('GET /api/bots error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { name, systemPrompt, isPublic } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Bot名称不能为空' }, { status: 400 });
    }

    const { data: bot, error } = await supabase
      .from('bots')
      .insert({
        owner_id: user.id,
        name: name.trim(),
        system_prompt: systemPrompt ?? '',
        is_public: isPublic ?? false,
      })
      .select()
      .single();

    if (error || !bot) throw error;

    return NextResponse.json({ bot });
  } catch (err) {
    console.error('POST /api/bots error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
