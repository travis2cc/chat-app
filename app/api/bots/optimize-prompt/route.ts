import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { optimizeSystemPrompt, refineSystemPrompt } from '@/lib/deepseek';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { rawDescription, currentPrompt, instruction } = await request.json();

    let result: string;

    if (instruction && currentPrompt) {
      // Refine existing prompt based on instruction
      result = await refineSystemPrompt(currentPrompt, instruction);
    } else if (rawDescription) {
      // Optimize raw description into structured format
      result = await optimizeSystemPrompt(rawDescription);
    } else {
      return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });
    }

    return NextResponse.json({ optimized: result });
  } catch (err) {
    console.error('POST /api/bots/optimize-prompt error:', err);
    return NextResponse.json({ error: '优化失败，请重试' }, { status: 500 });
  }
}
