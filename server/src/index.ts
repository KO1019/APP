import express from "express";
import cors from "cors";
import { HeaderUtils } from "coze-coding-dev-sdk";
import { getSupabaseClient } from "./storage/database/supabase-client";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// ========== 日记相关 API ==========

// 创建日记（自动进行情绪分析）
app.post('/api/v1/diaries', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required and must be a string' });
    }

    const client = getSupabaseClient();

    // 插入日记（仅包含内容）
    const { data: diary, error: insertError } = await client
      .from('diaries')
      .insert({ content })
      .select()
      .single();

    if (insertError) throw new Error(`Failed to create diary: ${insertError.message}`);

    // 异步进行情绪分析（不阻塞响应）
    analyzeEmotionAsync(diary.id, content);

    res.status(201).json(diary);
  } catch (error: any) {
    console.error('Error creating diary:', error);
    res.status(500).json({ error: error.message || 'Failed to create diary' });
  }
});

// 获取日记列表
app.get('/api/v1/diaries', async (req, res) => {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('diaries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(`Failed to fetch diaries: ${error.message}`);

    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching diaries:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch diaries' });
  }
});

// 获取单条日记
app.get('/api/v1/diaries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('diaries')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch diary: ${error.message}`);
    if (!data) return res.status(404).json({ error: 'Diary not found' });

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching diary:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch diary' });
  }
});

// 删除日记
app.delete('/api/v1/diaries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { error } = await client
      .from('diaries')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete diary: ${error.message}`);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting diary:', error);
    res.status(500).json({ error: error.message || 'Failed to delete diary' });
  }
});

// ========== 对话相关 API（流式） ==========

// AI 对话（流式响应）
app.post('/api/v1/chat', async (req, res) => {
  const { message, diaryId } = req.body;

  // SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, no-transform, must-revalidate');
  res.setHeader('Connection', 'keep-alive');

  try {
    if (!message || typeof message !== 'string') {
      res.write(`data: ${JSON.stringify({ error: 'Message is required' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const { LLMClient, Config } = await import('coze-coding-dev-sdk');

    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const llmClient = new LLMClient(config, customHeaders);

    // 构建对话历史（从数据库获取）
    const client = getSupabaseClient();
    let messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

    if (diaryId) {
      // 如果有关联日记，先获取日记内容
      const { data: diary } = await client
        .from('diaries')
        .select('content')
        .eq('id', diaryId)
        .maybeSingle();

      if (diary) {
        messages.push({
          role: 'system',
          content: `你是一位温暖、专业的心理陪伴助手。用户刚刚写了一篇日记，内容如下：\n\n${diary.content}\n\n请以共情的方式回应用户，帮助他们理解自己的情绪。注意：不做心理疾病诊断，不做药物推荐，仅做陪伴和正向疏导。`
        });
      }
    }

    // 获取最近的对话历史（最后 5 条）
    const { data: conversations } = await client
      .from('conversations')
      .select('user_message, ai_message')
      .order('created_at', { ascending: false })
      .limit(5);

    if (conversations) {
      // 反转并转换为对话格式
      conversations.reverse().forEach(conv => {
        messages.push({ role: 'user', content: conv.user_message });
        messages.push({ role: 'assistant', content: conv.ai_message });
      });
    }

    // 如果没有系统提示，添加一个
    if (messages.length === 0 || messages[0].role !== 'system') {
      messages.unshift({
        role: 'system' as const,
        content: '你是一位温暖、专业的心理陪伴助手。请以共情的方式倾听用户的情绪，帮助他们理解和表达自己的感受。注意：不做心理疾病诊断，不做药物推荐，仅做陪伴和正向疏导。如果用户表现出极端情绪倾向，请引导他们寻求专业帮助。'
      });
    }

    // 添加当前用户消息
    messages.push({ role: 'user' as const, content: message });

    // 调用 LLM 进行流式响应
    const stream = llmClient.stream(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.8,
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      if (chunk.content) {
        const content = chunk.content.toString();
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');

    // 保存对话记录
    await client.from('conversations').insert({
      user_message: message,
      ai_message: fullResponse,
      related_diary_id: diaryId || null,
    }).select();

    res.end();
  } catch (error: any) {
    console.error('Error in chat:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'Failed to process chat' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// 获取对话列表
app.get('/api/v1/conversations', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { diaryId } = req.query;

    let query = client
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (diaryId) {
      query = query.eq('related_diary_id', diaryId as string);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to fetch conversations: ${error.message}`);

    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch conversations' });
  }
});

// ========== 辅助函数 ==========

// 异步情绪分析函数
async function analyzeEmotionAsync(diaryId: string, content: string) {
  try {
    const { LLMClient, Config } = await import('coze-coding-dev-sdk');

    const config = new Config();
    const llmClient = new LLMClient(config);

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      {
        role: 'system' as const,
        content: `你是一位专业的情绪分析专家。请分析以下日记内容的情绪。

请以 JSON 格式返回分析结果，包含以下字段：
- mood: 情绪类型（愉悦、悲伤、焦虑、愤怒、恐惧、惊讶、厌恶、孤独、平静、兴奋等）
- mood_intensity: 情绪强度（0-100 的整数）
- emotion_tags: 情绪标签数组（如：['压力', '疲惫', '期待', '感激']等）
- summary: 情绪摘要（1-2句话）

示例输出：
{
  "mood": "焦虑",
  "mood_intensity": 75,
  "emotion_tags": ["压力", "担忧", "期待"],
  "summary": "用户对即将到来的考试感到紧张和担忧，但也有些期待能展示自己的能力。"
}`
      },
      {
        role: 'user' as const,
        content: `请分析以下日记的情绪：\n\n${content}`
      }
    ];

    const response = await llmClient.invoke(messages, {
      model: 'doubao-seed-2-0-mini-260215',
      temperature: 0.3,
    });

    // 尝试解析 JSON
    let moodAnalysis = null;
    try {
      // 清理可能的 markdown 代码块标记
      const cleanedContent = response.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      moodAnalysis = JSON.parse(cleanedContent);
    } catch (e) {
      console.error('Failed to parse emotion analysis JSON:', e);
      // 如果解析失败，创建一个基础的分析
      moodAnalysis = {
        mood: '未识别',
        mood_intensity: 50,
        emotion_tags: [],
        summary: '情绪分析失败'
      };
    }

    // 更新日记的情绪分析结果
    const client = getSupabaseClient();
    const { error } = await client
      .from('diaries')
      .update({
        mood: moodAnalysis.mood,
        mood_intensity: moodAnalysis.mood_intensity,
        mood_analysis: moodAnalysis,
      })
      .eq('id', diaryId);

    if (error) {
      console.error('Failed to update diary with emotion analysis:', error);
    }
  } catch (error: any) {
    console.error('Error in async emotion analysis:', error);
  }
}

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
