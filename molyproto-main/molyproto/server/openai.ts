import OpenAI from "openai";
import { type ChatCompletionMessageParam } from "openai/resources";
import { Message } from "@shared/schema";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Function to get API key from request headers
export const getOpenAIInstance = (apiKey: string) => {
  if (!apiKey) {
    throw new Error("OpenAI API key is required");
  }
  
  return new OpenAI({ 
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai-proxy.com/v1"
  });
};

// Helper function to convert our Message type to OpenAI's ChatCompletionMessageParam
const convertToOpenAIMessage = (message: Message): ChatCompletionMessageParam => {
  return {
    role: message.role as "user" | "assistant" | "system",
    content: message.content
  };
};

// 全局模型配置
const DEFAULT_MODEL = "gpt-4o-mini";

// 系统提示词
const TOPIC_SYSTEM_PROMPT = "你是一位专业的会议助理，擅长从对话中准确提炼关键信息，生成结构清晰、可回溯的总结报告。\n【任务说明】\n根据用户与ai的当次对话，请你基于对话内容输出结构化总结内容。\n【输出要求】\n1、所有内容必须来自该对话本身，禁止虚构或AI扩展。\n2、提炼对话要点及结果，不要遗漏，尤其是细节性信息（如时间、数量、具体要求等）。\n3、输出语言应简洁明了、专业可靠。";

// Function to generate a simplified summary for dialog display
async function generateDialogSummary(
  messages: Message[],
  apiKey: string,
  model: string
): Promise<string> {
  const openai = getOpenAIInstance(apiKey);

  const promptContent = `请将以下对话内容精炼成最简洁的要点，用于对话框显示：

${messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

请按照以下格式输出（不要添加任何额外内容）：

### 背景概述
[用一句话概括对话背景和目的，不超过20字]

### 关键要点
- [要点1：不超过20字]
- [要点2：不超过20字]

### 待办事项
- [行动项：动词开头，不超过20字]

### 风险与注意事项
- [风险/注意点：不超过20字]`;

  const response = await openai.chat.completions.create({
    model: model,
    messages: [
      {
        role: "system",
        content: "你是一位专业的文档助理，擅长提炼对话要点。请输出最简洁的要点，用于对话框显示。保持输出极其精简，不要添加任何额外内容或格式。"
      },
      {
        role: "user",
        content: promptContent
      }
    ],
    temperature: 0.3,
    max_tokens: 200,
  });

  return response.choices[0].message.content || "无法生成摘要";
}

// 修改生成主题分析提示词的函数
function getTopicAnalysisPrompt(messages: Message[]): string {
  return `请分析以下对话，提炼关键信息：

${messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

请根据对话内容输出结构化总结，包含以下几点：
1. 对话主题：描述本次对话的主题，用一句话概括对话的核心内容（注意：这不是标签，而是一句描述性的话）
2. 关键要点：提炼2-5个对话中的关键信息点
3. 重要细节：记录任何重要的细节信息，如时间、数量等
4. 结论或决定：总结对话达成的结论或决定

请确保：
- 所有内容必须来自该对话本身，禁止虚构
- 特别注意提炼细节性信息
- 语言简洁明了、专业可靠
- "对话主题"应该是一个完整的句子，描述对话的核心内容，而不仅仅是一个名词`;
}

// 修改处理主题标签的函数，使其适应新的格式
async function processTopicTagsWithAI(summary: string, apiKey: string, messages?: Message[]): Promise<string> {
  const firstLine = summary.split('\n')[0];
  
  // 提取当前内容中的关键词
  const contentWords = summary.split(/\s+|[,.;:!?，。；：！？]/);
  
  // 尝试从内容中提取主题
  let detectedTopic = extractTopicFromContent(contentWords, summary, messages);
  
  // 如果提取的主题是通用词汇，使用 AI 生成新的主题
  if (detectedTopic === "对话" || detectedTopic === "其他") {
    detectedTopic = await generateTopicWithAI(summary, apiKey, messages);
  }
  
  // 如果第一行包含【主题名称】，替换它
  if (firstLine.includes('【主题名称】')) {
    return summary.replace('【主题名称】', `【${detectedTopic}】`);
  }
  
  // 如果第一行没有【】格式的标签，添加新标签
  if (!/^【.+?】/.test(firstLine)) {
    return `【${detectedTopic}】\n` + summary;
  }
  
  // 如果已经有标签，检查是否需要更新
  const existingTag = firstLine.match(/^【(.+?)】/)?.[1];
  if (existingTag && (existingTag === "对话" || existingTag === "其他" || existingTag === "未分类")) {
    return `【${detectedTopic}】\n` + summary.substring(firstLine.length + 1);
  }
  
  return summary;
}

// 提取主题的辅助函数
function extractTopicFromContent(contentWords: string[], summary: string, messages?: Message[]): string {
  // 特定产品、平台、技术的专有名词
  const specificEntities = [
    // 产品与平台
    "小红书", "微信", "支付宝", "抖音", "淘宝", "京东", "拼多多", "知乎", "微博", "哔哩哔哩", "B站",
    "YouTube", "Facebook", "Twitter", "Instagram", "TikTok", "LinkedIn", "WhatsApp", "Telegram",
    "GitHub", "GitLab", "Jira", "Confluence", "Slack", "Discord", "Teams", "Zoom", "Notion",
    "Figma", "Sketch", "Adobe", "Photoshop", "Illustrator", "Premiere", "After Effects","chatgpt", 
    "openai", "gpt", "Claude", "Gemini", "Bard", "Gemini", "Claude", "Bard","gpt-4", "gpt-3.5-turbo",
    "Codex",

    
    "汽车","宝马", "奔驰", "奥迪", "丰田", "本田", "大众", "福特", "雪佛兰", "别克", "凯迪拉克", "林肯",
    "保时捷", "法拉利", "兰博基尼", "玛莎拉蒂", "阿斯顿·马丁", "宾利", "劳斯莱斯", "迈巴赫", "布加迪",
    "迈凯伦", "柯尼塞格", "帕加尼", "路特斯", "阿波罗", "迈凯伦", "柯尼塞格", "帕加尼", "路特斯",
    "阿波罗", "迈凯伦", "柯尼塞格", "帕加尼", "路特斯", "阿波罗", "迈凯伦", "柯尼塞格", "帕加尼", "路特斯",

    // 技术与框架
    "React", "Vue", "Angular", "Next.js", "Nuxt.js", "Svelte", "Flutter", "SwiftUI", "Kotlin", 
    "Spring Boot", "Django", "Laravel", "Express", "Nest.js", "FastAPI", "Node.js", "TypeScript",
    "Python", "Java", "Go", "Rust", "C\\+\\+", ".NET", "PHP", "Ruby", "Scala",
    "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Linux", "MySQL", "PostgreSQL", "MongoDB",
    "Redis", "Elasticsearch", "Kafka", "RabbitMQ", "GraphQL", "REST", "gRPC", "WebSocket",
    
    // 具体行业与领域
    "电商", "金融", "教育", "医疗", "旅游", "餐饮", "物流", "房地产", "游戏", "音乐", "视频", "直播",
    "AI", "区块链", "物联网", "云计算", "大数据", "机器学习", "深度学习", "计算机视觉", "自然语言处理",
    "自动驾驶", "智能家居", "智慧城市", "智能制造", "智慧医疗", "智慧教育", "智慧零售",
    
    // 具体业务对象
    "用户反馈", "产品需求", "功能设计", "界面原型", "交互流程", "用户体验", "性能优化", "代码重构",
    "Bug修复", "系统架构", "数据模型", "API接口", "部署方案", "测试用例", "安全策略", "监控告警",
    "运营方案", "推广策略", "数据分析", "用户画像", "竞品分析", "市场调研", "商业模式", "盈利方案",
    
    // 具体产品类型
    "小程序", "APP", "网站", "后台", "中台", "前台", "移动端", "PC端", "H5", "Web应用",
    "微服务", "分布式系统", "单页应用", "多端应用", "混合应用", "原生应用", "跨平台应用","功能开发文档",
    "项目开发文档","产品调研",
    
    // 具体技术组件
    "组件库", "UI框架", "状态管理", "路由系统", "构建工具", "打包工具", "测试框架", "CI/CD",
    "容器化", "服务网格", "负载均衡", "缓存系统", "消息队列", "搜索引擎", "数据库集群"
  ];

  // 创建一个映射，将原始实体名映射到转义后的正则表达式模式
  const entityPatterns = new Map(
    specificEntities.map(entity => [
      entity,
      new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    ])
  );
  
  // 将 Map 转换为数组以便迭代
  const entityPatternEntries = Array.from(entityPatterns.entries());
  
  // 通用词汇黑名单
  const genericTerms = new Set([
    "讨论", "分析", "会议", "总结", "报告", "评审", "交流", "主题", "开发", "设计", "测试",
    "部署", "问题", "方案", "计划", "策略", "项目", "任务", "工作", "内容", "文档", "代码",
    "系统", "平台", "产品", "服务", "功能", "需求", "目标", "结果", "进度", "质量", "风险"
  ]);

  // 1. 优先从当前对话内容中提取具体对象
  if (messages && messages.length >= 2) {
    const lastMessage = messages[messages.length - 2]; // 用户消息
    const lastResponse = messages[messages.length - 1]; // 助手回复
    const currentMessages = [lastMessage, lastResponse];
    
    const entityCount: Record<string, number> = {};
    const entityContext: Record<string, string[]> = {};
    
    for (const msg of currentMessages) {
      // 检查消息中是否包含具体对象
      for (const [entity, pattern] of entityPatternEntries) {
        const matches = msg.content.match(pattern);
        if (matches) {
          entityCount[entity] = (entityCount[entity] || 0) + matches.length;
          // 保存上下文
          const context = msg.content.slice(
            Math.max(0, msg.content.indexOf(entity) - 20),
            Math.min(msg.content.length, msg.content.indexOf(entity) + entity.length + 20)
          );
          entityContext[entity] = entityContext[entity] || [];
          entityContext[entity].push(context);
        }
      }
      
      // 检查消息中是否包含具体的产品、功能或技术名称
      const productMatch = msg.content.match(/([A-Za-z0-9]+(?:[A-Z][a-z]+)+)/g);
      if (productMatch) {
        for (const product of productMatch) {
          if (product.length >= 3 && !genericTerms.has(product.toLowerCase())) {
            entityCount[product] = (entityCount[product] || 0) + 1;
            const context = msg.content.slice(
              Math.max(0, msg.content.indexOf(product) - 20),
              Math.min(msg.content.length, msg.content.indexOf(product) + product.length + 20)
            );
            entityContext[product] = entityContext[product] || [];
            entityContext[product].push(context);
          }
        }
      }
    }
    
    // 根据出现频率和上下文相关性排序
    const sorted = Object.entries(entityCount)
      .filter(([entity]) => !genericTerms.has(entity.toLowerCase()))
      .sort((a, b) => {
        // 首先按出现频率排序
        if (b[1] !== a[1]) return b[1] - a[1];
        // 如果频率相同，优先选择有更多上下文的实体
        const aContext = entityContext[a[0]]?.length || 0;
        const bContext = entityContext[b[0]]?.length || 0;
        return bContext - aContext;
      });
    
    if (sorted.length > 0) {
      const [topEntity] = sorted[0];
      // 验证提取的实体是否足够具体
      if (!genericTerms.has(topEntity.toLowerCase()) && 
          specificEntities.some(entity => entity.toLowerCase() === topEntity.toLowerCase())) {
        return topEntity;
      }
    }
  }

  // 2. 在摘要中查找具体对象
  for (const [entity, pattern] of entityPatternEntries) {
    if (pattern.test(summary) && !genericTerms.has(entity.toLowerCase())) {
      return entity;
    }
  }
  
  // 3. 如果没有找到具体对象，返回"其他"作为默认值
  return "其他";
}

// 使用AI生成特定主题名词
async function generateTopicWithAI(summary: string, apiKey: string, messages?: Message[]): Promise<string> {
  try {
    const openai = getOpenAIInstance(apiKey);
    
    // 提取对话主题部分用于上下文
    const topicMatch = summary.match(/对话主题[:：](.+?)[\n\r]/);
    const topicDescription = topicMatch ? topicMatch[1].trim() : summary;
    
    // 添加当前对话内容用于更准确的主题提取
    const conversationContext = messages 
      ? `\n\n当前对话内容:\n${messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
      : '';
    
    // 获取最近的对话历史（最多5条）用于上下文分析
    const recentMessages = messages 
      ? messages.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')
      : '';
    
    const promptContent = `请为当前对话生成一个精准的类型标签，这个标签将显示在紫色标签中。

对话摘要:
${summary}

主题描述:
${topicDescription}

最近对话历史:
${recentMessages}${conversationContext}

类型标签提取要求：

1. 核心逻辑框架
   - 对象识别：提取对话中讨论的具体对象（如"宝马"、"React"、"微信"）
   - 领域识别：确定对象所属的领域（如"汽车"、"技术"、"社交"）
   - 层级关系：优先提取最具体的对象，而不是其属性或特点

2. 多维度提取机制
   - 词频统计：排除通用词，保留对象名称
   - 语义网络分析：关联对象及其所属领域
   - 时序权重：对话后期出现的新对象赋予更高优先级
   - 上下文分析：结合最近对话历史识别主题变化

3. 类型分类标准
   - 产品类：具体产品名称（如"宝马"、"iPhone"、"微信"）
   - 平台类：具体平台名称（如"淘宝"、"抖音"、"GitHub"）
   - 技术类：具体技术名称（如"React"、"Python"、"Docker"）
   - 概念类：具体概念名称（如"区块链"、"AI"、"元宇宙"）

4. 输出要求
   - 只返回一个具体的对象名称，不超过3个字
   - 严格禁止使用以下通用词汇：
     * 讨论、分析、会议、总结、报告、主题
     * 开发、设计、测试、部署
     * 问题、方案、计划、策略
     * 项目、任务、工作、内容
     * 文档、代码、系统、平台
     * 产品、服务、功能、需求
   - 标签必须是对话中讨论的具体对象
   - 不要有任何其他文字、解释或标点

5. 特殊情况处理
   - 跨语言混合：保留原词（如"PPT"、"API"）
   - 专业术语：保持原样（如"React"、"Vue"）
   - 新兴概念：使用最新术语（如"AI"、"区块链"）
   - 如果无法提取具体对象，返回"其他"作为默认值
   - 如果检测到主题变化，返回新的主题标签

示例：
- 对话主题："宝马M3的特点和性能分析" -> 类型标签："宝马"
- 对话主题："React组件开发最佳实践" -> 类型标签："React"
- 对话主题："微信小程序开发教程" -> 类型标签："微信"
- 对话主题："Python数据分析入门" -> 类型标签："Python"
- 对话主题："讨论项目进度" -> 类型标签："项目"
- 对话主题："介绍一下codex" -> 类型标签："Codex"`;

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: "你是一位专业的文档分析助手，擅长提取对话中的具体对象作为类型标签。请只返回一个简短的类型标签，不要使用任何通用词汇。如果无法提取具体对象，返回'其他'。"
        },
        {
          role: "user",
          content: promptContent
        }
      ],
      temperature: 0.3,
      max_tokens: 20,
    });

    const generatedTopic = response.choices[0].message.content?.trim() || "其他";
    console.log('AI生成的类型标签:', generatedTopic);
    
    // 检查生成的主题是否为通用词汇
    const genericTopics = new Set([
      "对话", "讨论", "会议", "分析", "总结", "报告", "评审", "交流", "主题",
      "开发", "设计", "测试", "部署", "问题", "方案", "计划", "策略",
      "项目", "任务", "工作", "内容", "文档", "代码", "系统", "平台",
      "产品", "服务", "功能", "需求", "目标", "结果", "进度", "质量", "风险"
    ]);
    
    if (genericTopics.has(generatedTopic.toLowerCase())) {
      return "其他";  // 如果生成的是通用词汇，直接返回"其他"
    }
    
    return generatedTopic;
  } catch (error) {
    console.error("Error generating topic with AI:", error);
    return "其他";
  }
}

// 更新总结对话函数，使用AI生成主题
export async function summarizeConversation(
  messages: Message[],
  apiKey?: string,
  modelId?: string,
  generateTopicOnly: boolean = false,
  generateRefinedContent: boolean = false
): Promise<{ summary: string; refinedContent?: string }> {
  try {
    // Use API key provided by user, or fall back to environment variable
    const key = apiKey || process.env.OPENAI_API_KEY || "";
    const openai = getOpenAIInstance(key);

    // Use provided model ID or fall back to default
    const model = modelId || DEFAULT_MODEL;

    if (generateTopicOnly) {
      // 只生成主题标签，只使用最后一条对话
      const lastMessage = messages[messages.length - 2]; // 用户消息
      const lastResponse = messages[messages.length - 1]; // 助手回复
      
      const topicResponse = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: "你是一位专业的文档分析助手，擅长提取对话主题。请只返回一个简短的主题标签。"
          },
          {
            role: "user",
            content: `请为以下对话生成一个简短的主题标签：

${lastMessage.role}: ${lastMessage.content}
${lastResponse.role}: ${lastResponse.content}

要求：
1. 只返回一个具体的名词或短语，不超过5个字
2. 应该是对话中讨论的具体对象、产品、技术或概念
3. 不能使用通用词汇（如"讨论"、"分析"、"会议"等）
4. 不要有任何其他文字、解释或标点
5. 标签内容要与当前对话内容直接相关`
          }
        ],
        temperature: 0.3,
        max_tokens: 20,
      });

      return { summary: topicResponse.choices[0].message.content?.trim() || "其他" };
    }

    // 生成完整摘要，只使用最后一条对话
    const lastMessage = messages[messages.length - 2]; // 用户消息
    const lastResponse = messages[messages.length - 1]; // 助手回复
    
    const analysisPrompt = `请分析以下对话，提炼关键信息：

${lastMessage.role}: ${lastMessage.content}
${lastResponse.role}: ${lastResponse.content}

请根据对话内容输出结构化总结，包含以下几点：
1. 对话主题：描述本次对话的主题，用一句话概括对话的核心内容（注意：这不是标签，而是一句描述性的话）
2. 关键要点：提炼2-5个对话中的关键信息点
3. 重要细节：记录任何重要的细节信息，如时间、数量等
4. 结论或决定：总结对话达成的结论或决定

请确保：
- 所有内容必须来自该对话本身，禁止虚构
- 特别注意提炼细节性信息
- 语言简洁明了、专业可靠
- "对话主题"应该是一个完整的句子，描述对话的核心内容，而不仅仅是一个名词`;

    const analysisResponse = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: TOPIC_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    const summary = analysisResponse.choices[0].message.content || "无法生成摘要";
    console.log('AI生成的原始摘要:', summary);
    
    // 处理并修正主题标签，使用AI辅助生成主题，只传入最后一条对话
    const result = await processTopicTagsWithAI(summary, key, [lastMessage, lastResponse]);
    console.log('格式化后的摘要:', result);

    // 如果需要生成精炼内容
    let refinedContent: string | undefined;
    if (generateRefinedContent) {
      const refinedResponse = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: "你是一位专业的文档分析助手，擅长提炼对话要点。请将对话内容精炼成不超过10个字的简短总结。"
          },
          {
            role: "user",
            content: `请将以下对话内容精炼成不超过10个字的简短总结：

${lastMessage.role}: ${lastMessage.content}
${lastResponse.role}: ${lastResponse.content}

要求：
1. 总结必须不超过10个字
2. 要准确反映对话的核心内容
3. 使用简洁明了的语言
4. 不要包含任何标点符号
5. 不要添加任何解释或额外内容`
          }
        ],
        temperature: 0.3,
        max_tokens: 20,
      });

      refinedContent = refinedResponse.choices[0].message.content?.trim();
      console.log('生成的精炼内容:', refinedContent);
    }

    return { summary: result, refinedContent };
  } catch (error) {
    console.error("Error summarizing conversation:", error);
    throw new Error(`Failed to summarize conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 更新发送消息函数，使用AI生成主题
export async function sendChatMessage(
  message: string,
  conversationHistory: Message[],
  apiKey?: string,
  modelId?: string,
  skipSummary = false
): Promise<{ assistant: string; summary?: string }> {
  try {
    // Use API key provided by user, or fall back to environment variable
    const key = apiKey || process.env.OPENAI_API_KEY || "";
    const openai = getOpenAIInstance(key);

    // Use provided model ID or fall back to default
    const model = modelId || DEFAULT_MODEL;

    // Format conversation history for OpenAI
    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content: "You are a helpful, friendly AI assistant."
    };
    
    const historyMessages: ChatCompletionMessageParam[] = 
      conversationHistory.map(msg => convertToOpenAIMessage(msg));
    
    const userMessage: ChatCompletionMessageParam = {
      role: "user",
      content: message
    };
    
    const messages: ChatCompletionMessageParam[] = [
      systemMessage,
      ...historyMessages,
      userMessage
    ];

    // Call OpenAI API with selected model
    const response = await openai.chat.completions.create({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const assistantResponse = response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";

    // Skip summary generation if requested
    if (skipSummary) {
      return {
        assistant: assistantResponse
      };
    }

    // 只使用当前消息生成摘要
    const currentMessage: Message = { role: "user", content: message };
    const currentResponse: Message = { role: "assistant", content: assistantResponse };

    // 生成提示词
    const analysisPrompt = `请分析以下对话，提炼关键信息：

用户: ${currentMessage.content}
助手: ${currentResponse.content}

请根据对话内容输出结构化总结，包含以下几点：
1. 对话主题：描述本次对话的主题，用一句话概括对话的核心内容
2. 关键要点：提炼2-3个对话中的关键信息点
3. 重要细节：记录任何重要的细节信息，如时间、数量等
4. 结论或决定：总结对话达成的结论或决定

请确保：
- 所有内容必须来自该对话本身，禁止虚构
- 特别注意提炼细节性信息
- 语言简洁明了、专业可靠
- "对话主题"应该是一个完整的句子，描述对话的核心内容`;

    const analysisResponse = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: TOPIC_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    const refinedSummary = analysisResponse.choices[0].message.content || "无法生成摘要";
    console.log('Chat生成的原始摘要:', refinedSummary);
    
    // 处理并修正主题标签，使用AI辅助生成主题，只传入当前消息
    const processedSummary = await processTopicTagsWithAI(refinedSummary, key, [currentMessage, currentResponse]);
    console.log('Chat处理后的摘要:', processedSummary);

    // Return assistant's response and refined summary separately
    return {
      assistant: assistantResponse,
      summary: processedSummary
    };
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw new Error(`Failed to get response from OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

