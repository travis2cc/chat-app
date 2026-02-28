import { createClient } from '@supabase/supabase-js';
import { callDeepSeek, parseXmlTag } from './deepseek';
import type { Bot, Message } from '@/types';

// Use service role client for bot processing (bypasses RLS)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const FIXED_SUFFIX = `

<输出格式>
<是否需要回复>
true / false「仅输出在当前场景下是否需要回复当前用户信息，要模拟人一样不需要每句话都回，具体需要遵循<交互规则></交互规则>的指令，要回复则输出 true，不回复则输出 false，不要输出任何额外内容」
</是否需要回复>
<回复内容>
「输出回复的信息，如果不需要回复则输出 none，具体的回复需要遵循前面的<角色定位><核心人设><语言风格规范><边界与禁止行为>」
</回复内容>
</输出格式>

<完整示例>
[历史对话记录]
用户A: 今天天气真好
用户B: 是啊，出去走走？

[当前发言]
用户A: @小明 你怎么看

[Bot输出示例]
<是否需要回复>true</是否需要回复>
<回复内容>嗯！最近确实适合出门，我也想去公园坐坐</回复内容>

[另一示例 - 不需要回复的情况]
[历史对话记录]
用户A: 今天吃了火锅
用户B: 好吃吗

[当前发言]
用户A: 很辣！

[Bot输出示例]
<是否需要回复>false</是否需要回复>
<回复内容>none</回复内容>
</完整示例>`;

function buildSystemPrompt(userSystemPrompt: string): string {
  // If the prompt already has XML structure tags, use as-is
  // Otherwise wrap in <角色设定> tag
  const hasStructuredTags =
    userSystemPrompt.includes('<角色定位>') ||
    userSystemPrompt.includes('<核心人设>') ||
    userSystemPrompt.includes('<角色设定>');

  const basePrompt = hasStructuredTags
    ? userSystemPrompt
    : `<角色设定>\n${userSystemPrompt}\n</角色设定>`;

  return basePrompt + FIXED_SUFFIX;
}

function buildConversationContext(
  history: Array<{ senderName: string; content: string }>,
  currentSenderName: string,
  currentMessage: string
): string {
  const historyText = history.map((m) => `${m.senderName}: ${m.content}`).join('\n');

  return `\n\n[历史对话记录]\n${historyText}\n\n[当前发言]\n${currentSenderName}: ${currentMessage}`;
}

async function getSenderName(
  supabase: ReturnType<typeof getServiceClient>,
  senderId: string,
  senderType: 'user' | 'bot'
): Promise<string> {
  if (senderType === 'user') {
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', senderId)
      .single();
    return data?.display_name ?? '用户';
  } else {
    const { data } = await supabase
      .from('bots')
      .select('name')
      .eq('id', senderId)
      .single();
    return data?.name ?? 'Bot';
  }
}

export async function processBotReplies(groupId: string, triggeredMessage: Message): Promise<void> {
  const supabase = getServiceClient();

  try {
    // 1. Fetch all bots in the group
    const { data: groupBots } = await supabase
      .from('group_bots')
      .select('bot_id, bots(*)')
      .eq('group_id', groupId);

    if (!groupBots || groupBots.length === 0) return;

    // 2. Fetch recent message history (last 50 messages before the current one)
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('id, sender_id, sender_type, content, created_at')
      .eq('group_id', groupId)
      .lt('created_at', triggeredMessage.created_at)
      .order('created_at', { ascending: false })
      .limit(50);

    const orderedHistory = (recentMessages ?? []).reverse();

    // 3. Resolve sender names for history
    const senderNameCache: Record<string, string> = {};
    const historyWithNames: Array<{ senderName: string; content: string }> = [];

    for (const msg of orderedHistory) {
      const cacheKey = `${msg.sender_type}:${msg.sender_id}`;
      if (!senderNameCache[cacheKey]) {
        senderNameCache[cacheKey] = await getSenderName(supabase, msg.sender_id, msg.sender_type);
      }
      historyWithNames.push({
        senderName: senderNameCache[cacheKey],
        content: msg.content,
      });
    }

    // 4. Get current message sender name
    const currentSenderKey = `${triggeredMessage.sender_type}:${triggeredMessage.sender_id}`;
    if (!senderNameCache[currentSenderKey]) {
      senderNameCache[currentSenderKey] = await getSenderName(
        supabase,
        triggeredMessage.sender_id,
        triggeredMessage.sender_type
      );
    }
    const currentSenderName = senderNameCache[currentSenderKey];

    // 5. Process each bot in parallel
    await Promise.allSettled(
      groupBots.map(async (gb) => {
        const bot = gb.bots as unknown as Bot;
        if (!bot) return;

        // Don't let bots reply to their own messages
        if (triggeredMessage.sender_id === bot.id) return;

        const isMentioned = triggeredMessage.content.includes(`@${bot.name}`);

        const systemPrompt = buildSystemPrompt(bot.system_prompt);
        const conversationContext = buildConversationContext(
          historyWithNames,
          currentSenderName,
          triggeredMessage.content
        );

        const fullPrompt = systemPrompt + conversationContext;

        try {
          const response = await callDeepSeek(fullPrompt);

          const shouldReplyRaw = parseXmlTag(response, '是否需要回复');
          const replyContent = parseXmlTag(response, '回复内容');

          const shouldReply = shouldReplyRaw.toLowerCase().startsWith('true');

          if ((isMentioned || shouldReply) && replyContent && replyContent !== 'none') {
            await supabase.from('messages').insert({
              group_id: groupId,
              sender_id: bot.id,
              sender_type: 'bot',
              content: replyContent,
            });
          }
        } catch (err) {
          console.error(`Bot ${bot.name} processing error:`, err);
        }
      })
    );
  } catch (err) {
    console.error('processBotReplies error:', err);
  }
}
