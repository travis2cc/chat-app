const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

export async function callDeepSeek(systemPrompt: string, userMessage?: string): Promise<string> {
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (userMessage) {
    messages.push({ role: 'user', content: userMessage });
  }

  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      max_tokens: 800,
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content ?? '';
}

export function parseXmlTag(text: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

export async function optimizeSystemPrompt(rawDescription: string): Promise<string> {
  const systemPrompt = `你是一个AI角色设计专家。用户会给你一段对AI角色的描述，你需要将其整理为规范的角色设定格式。

请将用户的描述整理为以下格式，每个标签内填写相应内容，内容要丰富具体：

<角色定位>
（这个AI是谁，基本身份，年龄，职业等）
</角色定位>

<核心人设>
（性格特点、价值观、喜好等核心特征）
</核心人设>

<语言风格规范>
（说话方式、用词习惯、语气特点，比如是否用emoji，是否用网络用语等）
</语言风格规范>

<交互规则>
（什么情况下主动说话，什么情况下不回复，被@时必须回复，回复频率等规则）
</交互规则>

<场景互动示例>
（给出2-3个对话示例，展示这个角色在群聊中如何互动）
</场景互动示例>

<边界与禁止行为>
（不做什么，不说什么，保持什么底线）
</边界与禁止行为>

只输出整理后的内容，不要有额外说明。`;

  return await callDeepSeek(systemPrompt, rawDescription);
}

export async function refineSystemPrompt(
  currentPrompt: string,
  instruction: string
): Promise<string> {
  const systemPrompt = `你是一个AI角色设计专家。用户有一个已有的角色设定，他想要对某部分进行修改。请按照用户的修改指令，对角色设定进行修改，保持其他部分不变。

只输出修改后的完整角色设定内容，格式和原来保持一致，不要有额外说明。`;

  return await callDeepSeek(
    systemPrompt,
    `当前角色设定：\n${currentPrompt}\n\n修改指令：${instruction}`
  );
}
