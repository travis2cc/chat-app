import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processBotReplies } from '@/lib/bot-processor';
import type { Message } from '@/types';

export async function POST(request: Request) {
  try {
    // Verify internal API key
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { groupId, messageId } = await request.json();
    if (!groupId || !messageId) {
      return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });
    }

    // Fetch the triggered message
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: message, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (error || !message) {
      return NextResponse.json({ error: '消息不存在' }, { status: 404 });
    }

    // Process bot replies (await here since this is a background job)
    await processBotReplies(groupId, message as Message);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/bots/trigger error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
