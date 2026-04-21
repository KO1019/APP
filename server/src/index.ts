import dotenv from 'dotenv';
import express from "express";
import cors from "cors";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { WebSocketServer, WebSocket } from 'ws';
import { getSupabaseClient } from "./storage/database/supabase-client";
import {
  buildStartConnectionFrame,
  buildStartSessionFrame,
  buildTaskRequestFrame,
  buildFinishSessionFrame,
  buildFinishConnectionFrame,
  buildChatTextQueryFrame,
  parseBinaryFrame,
  EVENT_ID,
} from "./volcengine-protocol.js";

// 加载环境变量
dotenv.config();

const app = express();
const port = process.env.PORT || 9091;

// JWT密钥配置（生产环境应使用环境变量）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 豆包ARK API配置（语言模型）
const ARK_BASE_URL = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
const ARK_API_KEY = process.env.ARK_API_KEY || '';
const ARK_CHAT_MODEL = process.env.ARK_CHAT_MODEL || 'ep-20250212215003-7j9f8';

// 豆包语音API配置
const VOLCENGINE_APP_ID = process.env.VOLCENGINE_APP_ID || '';
const VOLCENGINE_ACCESS_TOKEN = process.env.VOLCENGINE_ACCESS_TOKEN || '';
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY || '';

// LLM API 调用函数（使用豆包ARK OpenAI 兼容接口）
async function callLLM(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  model: string = ARK_CHAT_MODEL,
  temperature: number = 0.7
): Promise<{ content: string }> {
  // 检查 API Key 是否配置
  if (!ARK_API_KEY || ARK_API_KEY.trim() === '') {
    console.warn('ARK_API_KEY not configured, using fallback response');
    return {
      content: 'AI 功能暂时不可用',
    };
  }

  try {
    const response = await fetch(`${ARK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ARK API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as any;

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid ARK response format');
    }

    return {
      content: data.choices[0].message.content,
    };
  } catch (error: any) {
    console.error('Error calling ARK:', error);
    // 返回 fallback 回复
    return {
      content: 'AI 服务暂时不可用',
    };
  }
}

// 流式 LLM API 调用函数（使用豆包ARK）
async function callLLMStream(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  model: string = ARK_CHAT_MODEL,
  temperature: number = 0.7,
  onChunk: (chunk: string) => void
): Promise<void> {
  // 检查 API Key 是否配置
  if (!ARK_API_KEY || ARK_API_KEY.trim() === '') {
    console.warn('ARK_API_KEY not configured, using fallback response');
    // 使用预设回复
    const fallbackResponse = '抱歉，AI 功能暂时不可用。请先配置豆包 ARK API Key。我可以帮你记录情绪、写日记，或者通过语音聊天来倾诉你的感受。';
    // 模拟流式输出，每次返回一个字符
    for (let i = 0; i < fallbackResponse.length; i++) {
      onChunk(fallbackResponse[i]);
      await new Promise(resolve => setTimeout(resolve, 30)); // 模拟打字延迟
    }
    return;
  }

  try {
    console.log('Calling ARK API:', ARK_BASE_URL, 'Model:', model);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10秒超时

    const response = await fetch(`${ARK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ARK API error:', response.status, errorText);
      throw new Error(`ARK API error: ${response.status} - ${errorText}`);
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
    console.error('Error calling ARK stream:', error.message);
    // 使用 fallback 回复
    const fallbackResponse = '抱歉，AI 服务暂时不可用。请稍后再试，或者尝试其他功能。';
    for (let i = 0; i < fallbackResponse.length; i++) {
      onChunk(fallbackResponse[i]);
      await new Promise(resolve => setTimeout(resolve, 30));
    }
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
    res.status(401).json({ error: 'Invalid token.' });
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
    const { content, mood, tags, title } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required and must be a string' });
    }

    const client = getSupabaseClient();

    // 构建插入数据对象
    const insertData: any = { content, user_id: req.userId };

    // 标题不加密，可以直接显示在列表中
    if (title && typeof title === 'string' && title.trim()) {
      insertData.title = title.trim();
    }

    // 如果提供了 mood，则保存
    if (mood && typeof mood === 'string') {
      insertData.mood = mood;
    }

    // 如果提供了 tags，则保存
    if (tags && Array.isArray(tags) && tags.length > 0) {
      insertData.tags = tags;
    }

    // 插入日记
    const { data: diary, error: insertError } = await client
      .from('diaries')
      .insert(insertData)
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

    let topics: string[] = [];

    if (!recentDiaries || recentDiaries.length === 0) {
      // 如果没有日记，返回默认话题
      topics = [
        '今天过得怎么样？',
        '有什么让你开心的事情吗？',
        '最近有什么烦恼想聊聊吗？',
      ];
    } else {
      // 基于日记情绪生成个性化话题
      const moods = recentDiaries.map(d => d.mood).filter(Boolean);
      const hasSad = moods.includes('sad') || moods.includes('anxious');
      const hasHappy = moods.includes('happy') || moods.includes('excited');
      const hasCalm = moods.includes('calm') || moods.includes('neutral');

      // 根据情绪生成不同话题
      if (hasSad) {
        topics.push('想聊聊是什么让你感到难过吗？', '有没有什么能让你感觉好一点的事情？');
      }
      if (hasHappy) {
        topics.push('能分享一下让你开心的原因吗？', '这个开心的事情对你来说意味着什么？');
      }
      if (hasCalm) {
        topics.push('你有什么保持平静的秘诀吗？', '最近有什么值得感激的事情吗？');
      }

      // 确保至少有3个话题
      if (topics.length < 3) {
        topics.push('今天过得怎么样？', '有什么想和我分享的吗？', '最近有什么变化吗？');
      }

      // 限制最多5个话题
      topics = topics.slice(0, 5);
    }

    res.json({ topics });
  } catch (error: any) {
    console.error('Error generating chat topics:', error);
    // 出错时返回默认话题
    res.json({
      topics: [
        '今天过得怎么样？',
        '有什么让你开心的事情吗？',
        '最近有什么烦恼想聊聊吗？',
      ]
    });
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

    // 分析情绪趋势
    const moods = recentDiaries.map(d => d.mood).filter(Boolean);
    const hasNegativeEmotion = moods.some(m => ['sad', 'anxious', 'angry'].includes(m));
    const hasPositiveEmotion = moods.some(m => ['happy', 'excited', 'grateful'].includes(m));
    const hasMixedEmotions = hasNegativeEmotion && hasPositiveEmotion;
    const mostlyCalm = moods.filter(m => ['calm', 'neutral'].includes(m)).length > moods.length / 2;

    // 根据情绪状态生成个性化建议
    let tips: string[] = [];
    let message: string = '';

    if (hasMixedEmotions) {
      // 情绪起伏较大
      tips = [
        '你的情绪最近波动较大，建议每天花10分钟写日记，了解情绪变化的原因',
        '尝试深呼吸练习：吸气4秒、屏息7秒、呼气8秒，帮助平复情绪',
        '建立稳定的作息时间，规律的睡眠有助于情绪稳定',
      ];
      message = '情绪有起伏是正常的，通过记录和观察，你会更了解自己';
    } else if (hasNegativeEmotion) {
      // 负面情绪较多
      tips = [
        '允许自己感受这些情绪，它们都是合理的，不必压抑',
        '尝试从不同角度看待问题，可能会有新的发现',
        '和信任的朋友或家人聊聊，分享能减轻心理负担',
        '适当运动，如散步或瑜伽，可以帮助释放压力',
      ];
      message = '这段时间不容易，你已经很勇敢了，慢慢来，会好起来的';
    } else if (hasPositiveEmotion) {
      // 正面情绪较多
      tips = [
        '继续保持积极的心态，你做得很好！',
        '尝试记录这些开心的时刻，在需要的时候可以回顾',
        '分享你的喜悦，积极的情绪是可以传染的',
        '设定新的小目标，保持前进的动力',
      ];
      message = '看到你状态这么好真是太好了！继续保持这份积极';
    } else if (mostlyCalm) {
      // 情绪平稳
      tips = [
        '保持平静的心态很不错，可以尝试一些新的兴趣爱好',
        '适度挑战自己，体验不同情绪可以丰富人生',
        '给自己设定一些小目标，给平淡的生活增添色彩',
      ];
      message = '平稳的状态很珍贵，继续保持这种内心的平静';
    } else {
      // 默认建议
      tips = [
        '保持规律的作息时间，有助于调节情绪',
        '每天记录一件让你开心的小事，培养积极心态',
        '适度运动可以释放压力，改善心情',
      ];
      message = '记录情绪可以帮助你更好地了解自己';
    }

    // 确保至少有3条建议
    if (tips.length < 3) {
      tips.push('保持规律的作息时间，有助于调节情绪');
      tips.push('适度运动可以释放压力，改善心情');
    }

    res.json({ tips, message });
  } catch (error: any) {
    console.error('Error generating health tips:', error);
    // 出错时返回默认建议
    res.json({
      tips: [
        '保持规律的作息时间，有助于调节情绪',
        '每天记录一件让你开心的小事，培养积极心态',
        '适度运动可以释放压力，改善心情',
      ],
      message: '保持积极心态，每天都是新的开始'
    });
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
      // 尝试调用 LLM，如果失败则返回预设回复
      let aiResponse = '';

      try {
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
            .eq('user_id', req.userId) // 确保只能访问自己的日记
            .single();

          if (diary) {
            messages.splice(1, 0, {
              role: 'user' as const,
              content: `[用户之前的日记] ${diary.content} \n[情绪状态] ${diary.mood || '未知'}`
            });
          }
        }

        // 调用 LLM（可能会失败）
        const response = await callLLM(messages, LLM_CHAT_MODEL, 0.7);
        aiResponse = response.content;
      } catch (llmError) {
        console.error('LLM call failed, using fallback response:', llmError);
        // LLM 调用失败，使用预设回复
        const fallbackResponses = [
          '我听到了你的想法。能多和我聊聊这个话题吗？',
          '嗯，我理解。这种感觉有时候确实不容易。',
          '谢谢你和我分享这些。你想进一步探讨吗？',
          '你的感受很重要。有什么我能帮你的吗？',
        ];
        aiResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      }

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

// TTS文件下载API（提供生成的语音文件）
app.get('/api/v1/tts/file/:filename', async (req, res) => {
  const { filename } = req.params;
  const filepath = `/tmp/${filename}`;

  try {
    const fs = await import('fs');
    const path = await import('path');

    // 安全检查：确保文件名只包含字母数字和下划线
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // 检查文件是否存在
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 设置响应头并返回文件
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error('Error serving TTS file:', error);
    res.status(500).json({ error: error.message || 'Failed to serve file' });
  }
});

// 语音合成函数（使用豆包HTTP TTS API）
async function synthesizeSpeech(text: string): Promise<string> {
  try {
    console.log('Synthesizing speech for:', text);

    if (!VOLCENGINE_APP_ID || !VOLCENGINE_ACCESS_TOKEN) {
      console.warn('豆包语音API配置缺失，返回模拟URL');
      return 'https://example.com/speech.mp3';
    }

    const reqid = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const requestBody = {
      app: {
        appid: VOLCENGINE_APP_ID,
        token: VOLCENGINE_ACCESS_TOKEN,
        cluster: 'volcano_tts',
      },
      user: {
        uid: 'user_voice_chat',
      },
      audio: {
        voice_type: 'zh_female_vv_jupiter_bigtts', // 豆包女声
        encoding: 'mp3',
        speed_ratio: 1.0,
        rate: 24000,
      },
      request: {
        reqid: reqid,
        text: text,
        operation: 'query',
      },
    };

    const response = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer; ${VOLCENGINE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('豆包TTS API error:', response.status, errorText);
      throw new Error(`TTS API error: ${response.status}`);
    }

    const data = await response.json() as any;

    if (data.code !== 3000) {
      console.error('豆包TTS API返回错误:', data);
      throw new Error(`TTS error: ${data.message}`);
    }

    // 将base64音频保存到文件
    const audioBuffer = Buffer.from(data.data, 'base64');
    const filename = `tts_${reqid}.mp3`;
    const filepath = `/tmp/${filename}`;

    const fs = await import('fs');
    fs.writeFileSync(filepath, audioBuffer);

    console.log('TTS audio saved to:', filepath);

    // 返回文件路径（前端可以通过后端API下载）
    return `/api/v1/tts/file/${filename}`;
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

    await callLLMStream(messages, ARK_CHAT_MODEL, 0.8, (chunk) => {
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

    const response = await callLLM(messages, ARK_CHAT_MODEL, 0.3);

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

// ========== WebSocket 实时语音对话 ==========

const wss = new WebSocketServer({ noServer: true });

// 处理HTTP升级请求
const server = app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws: WebSocket, request) => {
  console.log('WebSocket client connected');

  let volcWs: WebSocket | null = null;
  let sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // 连接到豆包实时语音API
  const connectToVolcengine = async () => {
    try {
      if (!VOLCENGINE_APP_ID || !VOLCENGINE_ACCESS_TOKEN) {
        ws.send(JSON.stringify({ type: 'error', message: '豆包API配置缺失' }));
        ws.close();
        return;
      }

      volcWs = new WebSocket(
        'wss://openspeech.bytedance.com/api/v3/realtime/dialogue',
        {
          headers: {
            'X-Api-App-ID': VOLCENGINE_APP_ID,
            'X-Api-Access-Key': VOLCENGINE_ACCESS_TOKEN,
            'X-Api-Resource-Id': 'volc.speech.dialog',
            'X-Api-App-Key': 'PlgvMymc7f3tQnJ6',
          },
        }
      );

      volcWs.binaryType = 'nodebuffer';

      volcWs.on('open', () => {
        console.log('Connected to Volcengine');

        // 发送StartConnection事件
        const startConnectionFrame = buildStartConnectionFrame();
        volcWs!.send(startConnectionFrame);

        // 发送StartSession事件
        const startSessionFrame = buildStartSessionFrame(sessionId, {
          bot_name: '豆包',
          system_role: '你是一位温暖、专业的心理陪伴助手。',
          model: '1.2.1.1',
        });
        volcWs!.send(startSessionFrame);
      });

      volcWs.on('message', (data: Buffer) => {
        const frame = parseBinaryFrame(data);
        if (!frame) return;

        // 处理服务端事件
        switch (frame.eventId) {
          case EVENT_ID.ASR_RESPONSE:
            // 语音识别结果
            try {
              const asrResult = JSON.parse(frame.payload.toString('utf-8'));
              ws.send(JSON.stringify({
                type: 'asr_result',
                data: asrResult,
              }));
            } catch (e) {
              console.error('Failed to parse ASR response:', e);
            }
            break;

          case EVENT_ID.CHAT_RESPONSE:
            // AI回复文本
            try {
              const chatResponse = JSON.parse(frame.payload.toString('utf-8'));
              ws.send(JSON.stringify({
                type: 'chat_response',
                data: chatResponse,
              }));
            } catch (e) {
              console.error('Failed to parse chat response:', e);
            }
            break;

          case EVENT_ID.TTS_RESPONSE:
            // 音频数据
            ws.send(JSON.stringify({
              type: 'tts_audio',
              data: frame.payload.toString('base64'),
            }));
            break;

          case EVENT_ID.TTS_SENTENCE_START:
            // TTS开始
            try {
              const ttsStart = JSON.parse(frame.payload.toString('utf-8'));
              ws.send(JSON.stringify({
                type: 'tts_start',
                data: ttsStart,
              }));
            } catch (e) {
              console.error('Failed to parse TTS start:', e);
            }
            break;

          case EVENT_ID.TTS_ENDED:
            // TTS结束
            ws.send(JSON.stringify({
              type: 'tts_ended',
            }));
            break;

          case EVENT_ID.ASR_ENDED:
            // 语音识别结束
            ws.send(JSON.stringify({
              type: 'asr_ended',
            }));
            break;

          case EVENT_ID.SESSION_STARTED:
            // 会话开始
            try {
              const sessionInfo = JSON.parse(frame.payload.toString('utf-8'));
              sessionId = sessionInfo.dialog_id || sessionId;
              console.log('Session started:', sessionId);
            } catch (e) {
              console.error('Failed to parse session start:', e);
            }
            break;
        }
      });

      volcWs.on('error', (error) => {
        console.error('Volcengine WebSocket error:', error);
        ws.send(JSON.stringify({ type: 'error', message: '豆包连接错误' }));
      });

      volcWs.on('close', () => {
        console.log('Volcengine connection closed');
        ws.send(JSON.stringify({ type: 'connection_closed' }));
      });
    } catch (error: any) {
      console.error('Failed to connect to Volcengine:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  };

  connectToVolcengine();

  // 处理客户端消息
  ws.on('message', (data: Buffer | string) => {
    try {
      // 支持文本和二进制消息
      if (Buffer.isBuffer(data)) {
        // 二进制音频数据
        if (volcWs && volcWs.readyState === WebSocket.OPEN) {
          const taskRequestFrame = buildTaskRequestFrame(sessionId, data);
          volcWs.send(taskRequestFrame);
        }
      } else {
        // JSON消息
        const message = JSON.parse(data as string);

        switch (message.type) {
          case 'text_input':
            // 文本输入
            if (volcWs && volcWs.readyState === WebSocket.OPEN) {
              const chatTextQueryFrame = buildChatTextQueryFrame(sessionId, message.text);
              volcWs.send(chatTextQueryFrame);
            }
            break;

          case 'end_session':
            // 结束会话
            if (volcWs && volcWs.readyState === WebSocket.OPEN) {
              const finishSessionFrame = buildFinishSessionFrame(sessionId);
              volcWs.send(finishSessionFrame);
            }
            break;
        }
      }
    } catch (error: any) {
      console.error('Error processing client message:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');

    // 关闭豆包连接
    if (volcWs && volcWs.readyState === WebSocket.OPEN) {
      const finishSessionFrame = buildFinishSessionFrame(sessionId);
      const finishConnectionFrame = buildFinishConnectionFrame();
      volcWs.send(finishSessionFrame);
      volcWs.send(finishConnectionFrame);
      setTimeout(() => volcWs?.close(), 100);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket client error:', error);
  });
});

