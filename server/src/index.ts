import express from "express";
import cors from "cors";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { getSupabaseClient } from "./storage/database/supabase-client";

const app = express();
const port = process.env.PORT || 9091;

// JWT密钥配置（生产环境应使用环境变量）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// LLM API 配置
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://apis.iflow.cn/v1';
const LLM_API_KEY = process.env.LLM_API_KEY || '';

// 模型配置
const LLM_CHAT_MODEL = process.env.LLM_CHAT_MODEL || 'Qwen3-Max';
const LLM_EMOTION_MODEL = process.env.LLM_EMOTION_MODEL || 'Qwen3-Max';
const LLM_HEALTH_MODEL = process.env.LLM_HEALTH_MODEL || 'Qwen3-Max';

// LLM API 调用函数（使用 iFlow OpenAI 兼容接口）
async function callLLM(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  model: string = LLM_CHAT_MODEL,
  temperature: number = 0.7
): Promise<{ content: string }> {
  try {
    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid LLM response format');
    }

    return {
      content: data.choices[0].message.content,
    };
  } catch (error: any) {
    console.error('Error calling LLM:', error);
    throw new Error(`Failed to call LLM: ${error.message}`);
  }
}

// 流式 LLM API 调用函数
async function callLLMStream(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  model: string = LLM_CHAT_MODEL,
  temperature: number = 0.7,
  onChunk: (chunk: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const data = line.trim().slice(6);
          if (data === '[DONE]') continue;

          try {
            const json = JSON.parse(data);
            if (json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content) {
              onChunk(json.choices[0].delta.content);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Error calling LLM stream:', error);
    throw new Error(`Failed to call LLM stream: ${error.message}`);
  }
}

// 中间件：验证JWT Token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token.' });
  }
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// ========== 用户认证 API ==========

// 用户注册
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { username, password, email, nickname } = req.body;

    // 参数校验
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const client = getSupabaseClient();

    // 检查用户名是否已存在
    const { data: existingUser } = await client
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // 密码加密
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const { data: newUser, error: insertError } = await client
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
        email: email || null,
        nickname: nickname || username,
        cloud_sync_enabled: false,
      })
      .select('id, username, email, nickname, created_at')
      .single();

    if (insertError) throw new Error(`Failed to create user: ${insertError.message}`);

    // 生成JWT Token
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      user: newUser,
      token,
    });
  } catch (error: any) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: error.message || 'Failed to register user' });
  }
});

// 用户登录
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 参数校验
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const client = getSupabaseClient();

    // 查找用户
    const { data: user, error: fetchError } = await client
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (fetchError || !user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 生成JWT Token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        cloud_sync_enabled: user.cloud_sync_enabled,
        created_at: user.created_at,
      },
      token,
    });
  } catch (error: any) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: error.message || 'Failed to login' });
  }
});

// 获取当前用户信息
app.get('/api/v1/auth/me', authenticateToken, async (req: any, res) => {
  try {
    const client = getSupabaseClient();

    const { data: user, error: fetchError } = await client
      .from('users')
      .select('id, username, email, nickname, avatar, cloud_sync_enabled, created_at')
      .eq('id', req.userId)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch user' });
  }
});

// 更新用户信息
app.put('/api/v1/auth/me', authenticateToken, async (req: any, res) => {
  try {
    const { nickname, email, avatar, cloud_sync_enabled } = req.body;

    const client = getSupabaseClient();

    const { data: updatedUser, error: updateError } = await client
      .from('users')
      .update({
        ...(nickname !== undefined && { nickname }),
        ...(email !== undefined && { email }),
        ...(avatar !== undefined && { avatar }),
        ...(cloud_sync_enabled !== undefined && { cloud_sync_enabled }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.userId)
      .select('id, username, email, nickname, avatar, cloud_sync_enabled, created_at, updated_at')
      .single();

    if (updateError) throw new Error(`Failed to update user: ${updateError.message}`);

    res.json({ user: updatedUser });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message || 'Failed to update user' });
  }
});

// ========== 日记相关 API ==========

// 创建日记（自动进行情绪分析）
app.post('/api/v1/diaries', authenticateToken, async (req: any, res) => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required and must be a string' });
    }

    const client = getSupabaseClient();

    // 插入日记（仅包含内容和用户ID）
    const { data: diary, error: insertError } = await client
      .from('diaries')
      .insert({ content, user_id: req.userId })
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
app.get('/api/v1/diaries', authenticateToken, async (req: any, res) => {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('diaries')
      .select('*')
      .eq('user_id', req.userId) // 只返回当前用户的日记
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
app.get('/api/v1/diaries/:id', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('diaries')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.userId) // 只能查看自己的日记
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
app.delete('/api/v1/diaries/:id', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();

    const { error } = await client
      .from('diaries')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId); // 只能删除自己的日记

    if (error) throw new Error(`Failed to delete diary: ${error.message}`);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting diary:', error);
    res.status(500).json({ error: error.message || 'Failed to delete diary' });
  }
});

// ========== 陪伴功能相关 API ==========

// 获取基于最近日记情绪的建议话题
app.get('/api/v1/chat/topics', authenticateToken, async (req: any, res) => {
  try {
    const client = getSupabaseClient();

    // 获取最近的日记（最后 3 篇，仅当前用户的）
    const { data: recentDiaries } = await client
      .from('diaries')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (!recentDiaries || recentDiaries.length === 0) {
      // 如果没有日记，返回默认话题
      return res.json({
        topics: [
          '今天过得怎么样？',
          '有什么让你开心的事情吗？',
          '最近有什么烦恼想聊聊吗？',
        ]
      });
    }

    // 构建情绪分析摘要
    const emotionSummary = recentDiaries.map(d => ({
      mood: d.mood,
      mood_intensity: d.mood_intensity,
      summary: d.mood_analysis?.summary || ''
    })).join('\n');

    // 使用 LLM 生成建议话题
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      {
        role: 'system' as const,
        content: `你是一位专业的心理陪伴助手。根据用户最近的日记情绪状态，生成3-5个温暖、共情的话题，帮助用户表达和探索他们的感受。

要求：
1. 话题要简短、温暖、易于回答
2. 避免重复，涵盖不同维度（积极情绪、负面情绪、未来展望等）
3. 语言要亲切、自然，像朋友一样

请以 JSON 格式返回，包含一个 topics 数组：
{
  "topics": ["话题1", "话题2", "话题3"]
}`
      },
      {
        role: 'user' as const,
        content: `用户最近的日记情绪状态如下：\n\n${emotionSummary}\n\n请根据这些情绪状态，生成建议话题。`
      }
    ];

    const response = await callLLM(messages, LLM_CHAT_MODEL, 0.7);

    // 解析 JSON
    let topics: string[] = [];
    try {
      const cleanedContent = response.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const result = JSON.parse(cleanedContent);
      topics = result.topics || [];
    } catch (e) {
      console.error('Failed to parse topics JSON:', e);
      // 解析失败，返回默认话题
      topics = [
        '今天过得怎么样？',
        '有什么让你开心的事情吗？',
        '最近有什么烦恼想聊聊吗？',
      ];
    }

    res.json({ topics });
  } catch (error: any) {
    console.error('Error generating chat topics:', error);
    res.status(500).json({ error: error.message || 'Failed to generate topics' });
  }
});

// 获取心理健康建议
app.get('/api/v1/health-tips', authenticateToken, async (req: any, res) => {
  try {
    const client = getSupabaseClient();

    // 获取最近的日记（最后 5 篇，仅当前用户的）来分析情绪趋势
    const { data: recentDiaries } = await client
      .from('diaries')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!recentDiaries || recentDiaries.length === 0) {
      // 如果没有日记，返回通用建议
      return res.json({
        tips: [
          '保持规律的作息时间，有助于调节情绪',
          '每天记录一件让你开心的小事，培养积极心态',
          '适度运动可以释放压力，改善心情',
        ],
        message: '还没有日记记录，建议开始记录你的情绪变化'
      });
    }

    // 构建情绪分析摘要
    const emotionSummary = recentDiaries.map(d => ({
      mood: d.mood,
      mood_intensity: d.mood_intensity,
      summary: d.mood_analysis?.summary || ''
    })).join('\n');

    // 使用 LLM 生成个性化建议
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      {
        role: 'system' as const,
        content: `你是一位专业的心理咨询师和情绪管理专家。根据用户最近的日记情绪状态，生成3-5条个性化的心理健康建议。

要求：
1. 建议要具体、可执行，不要空泛
2. 语气要温暖、鼓励、支持
3. 避免使用专业术语，用通俗易懂的语言
4. 针对用户的具体情绪状态给出有针对性的建议
5. 包含一个简短的鼓励性消息（message字段）

请以 JSON 格式返回：
{
  "message": "简短的鼓励性消息",
  "tips": ["建议1", "建议2", "建议3"]
}`
      },
      {
        role: 'user' as const,
        content: `用户最近的日记情绪状态如下：\n\n${emotionSummary}\n\n请根据这些情绪状态，生成个性化的心理健康建议。`
      }
    ];

    const response = await callLLM(messages, LLM_HEALTH_MODEL, 0.7);

    // 解析 JSON
    let healthTips: any = {};
    try {
      const cleanedContent = response.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      healthTips = JSON.parse(cleanedContent);
    } catch (e) {
      console.error('Failed to parse health tips JSON:', e);
      // 解析失败，返回默认建议
      healthTips = {
        message: '保持积极心态，每天都是新的开始',
        tips: [
          '保持规律的作息时间，有助于调节情绪',
          '每天记录一件让你开心的小事，培养积极心态',
          '适度运动可以释放压力，改善心情',
        ]
      };
    }

    res.json(healthTips);
  } catch (error: any) {
    console.error('Error generating health tips:', error);
    res.status(500).json({ error: error.message || 'Failed to generate health tips' });
  }
});

// ========== 语音对话 API ==========

// 创建multer实例
const upload = multer({ storage: multer.memoryStorage() });

// 语音对话（支持语音识别、AI对话、语音合成）
app.post('/api/v1/voice/chat', authenticateToken, upload.single('audio'), async (req: any, res) => {
  try {
    const audioFile = req.file;
    const { mode = 'chat', diaryId } = req.body; // mode: 'chat' 对话, 'diary' 记日记

    if (!audioFile) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    // 1. 语音识别（ASR）- 将语音转为文本
    let userText = '';
    try {
      console.log('Processing audio file:', audioFile.originalname, audioFile.size);

      // 暂时模拟ASR结果
      // 实际应该调用火山引擎的 ASR API
      // 由于环境和配置限制，这里返回占位文本
      userText = '（语音输入：请查看应用日志）';
    } catch (e) {
      console.error('Error in ASR:', e);
      userText = '（语音识别失败）';
    }

    // 2. AI 对话或记日记
    const client = getSupabaseClient();

    if (mode === 'diary') {
      // 记日记模式
      const { data: diary, error: insertError } = await client
        .from('diaries')
        .insert({ content: userText, user_id: req.userId })
        .select()
        .single();

      if (insertError) throw new Error(`Failed to create diary: ${insertError.message}`);

      // 异步进行情绪分析
      analyzeEmotionAsync(diary.id, userText);

      // AI 确认
      const aiResponse = `好的，我已经帮你记录了这篇日记。${diary.mood ? `你的情绪是${diary.mood}，强度${diary.mood_intensity}。` : ''}还有其他想说的吗？`;

      // 3. 语音合成（TTS）
      const audioUrl = await synthesizeSpeech(aiResponse);

      res.json({
        text: userText,
        aiText: aiResponse,
        audioUrl,
        diary,
      });
    } else {
      // 对话模式
      // 构建对话消息
      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        {
          role: 'system' as const,
          content: `你是一位温暖、专业的心理陪伴助手。你的任务是：
1. 倾听用户的情绪和想法
2. 提供情感支持和理解
3. 给出积极的心理建议
4. 保持温和、耐心的语气
5. 回复要简洁有力，不超过200字`
        },
        {
          role: 'user' as const,
          content: userText
        }
      ];

      // 如果关联了日记，添加上下文
      if (diaryId) {
        const { data: diary } = await client
          .from('diaries')
          .select('*')
          .eq('id', diaryId)
          .single();

        if (diary) {
          messages.splice(1, 0, {
            role: 'user' as const,
            content: `[用户之前的日记] ${diary.content} \n[情绪状态] ${diary.mood || '未知'}`
          });
        }
      }

      // 调用 LLM
      const response = await callLLM(messages, LLM_CHAT_MODEL, 0.7);

      const aiResponse = response.content;

      // 3. 语音合成（TTS）
      const audioUrl = await synthesizeSpeech(aiResponse);

      // 保存对话记录
      await client.from('conversations').insert({
        user_id: req.userId,
        user_message: userText,
        ai_message: aiResponse,
        related_diary_id: diaryId || null,
      }).select();

      res.json({
        text: userText,
        aiText: aiResponse,
        audioUrl,
      });
    }
  } catch (error: any) {
    console.error('Error in voice chat:', error);
    res.status(500).json({ error: error.message || 'Failed to process voice chat' });
  }
});

// 语音合成函数
async function synthesizeSpeech(text: string): Promise<string> {
  try {
    console.log('Synthesizing speech for:', text);

    // 模拟返回音频URL
    // 实际实现需要：
    // 1. 调用火山引擎的 TTS API
    // 2. 将音频保存到对象存储
    // 3. 返回音频 URL

    return 'https://example.com/speech.mp3';
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    throw error;
  }
}

// ========== 对话相关 API（流式） ==========

// AI 对话（流式响应）
app.post('/api/v1/chat', authenticateToken, async (req: any, res) => {
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
    let fullResponse = '';

    await callLLMStream(messages, LLM_CHAT_MODEL, 0.8, (chunk) => {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    });

    res.write('data: [DONE]\n\n');

    // 保存对话记录
    await client.from('conversations').insert({
      user_id: req.userId,
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
app.get('/api/v1/conversations', authenticateToken, async (req: any, res) => {
  try {
    const client = getSupabaseClient();
    const { diaryId } = req.query;

    let query = client
      .from('conversations')
      .select('*')
      .eq('user_id', req.userId) // 只返回当前用户的对话
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

    const response = await callLLM(messages, LLM_EMOTION_MODEL, 0.3);

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
