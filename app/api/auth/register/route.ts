import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  // Initialize inside handler to avoid build-time env requirement
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { username, displayName, password } = await request.json();

    if (!username || !displayName || !password) {
      return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });
    }

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ error: '用户名格式不正确' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少6位' }, { status: 400 });
    }

    // Check if username already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existingProfile) {
      return NextResponse.json({ error: '用户名已被注册' }, { status: 409 });
    }

    const email = `${username}@chatapp.local`;

    // Create auth user (service role bypasses email confirmation)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, display_name: displayName },
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message ?? '注册失败' }, { status: 400 });
    }

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      username,
      display_name: displayName,
    });

    if (profileError) {
      // Cleanup: delete the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: '创建用户资料失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, username });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
