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
  if (firstLine.includes('【主题名称】')) {
    const contentWords = summary.split(/\s+|[,.;:!?，。；：！？]/);
    let detectedTopic = extractTopicFromContent(contentWords, summary, messages);
    if (detectedTopic === "对话" || detectedTopic === "项目") {
      detectedTopic = await generateTopicWithAI(summary, apiKey, messages);
    }
    return summary.replace('【主题名称】', `【${detectedTopic}】`);
  }
  if (!/^【.+?】/.test(firstLine)) {
    const contentWords = summary.split(/\s+|[,.;:!?，。；：！？]/);
    let detectedTopic = extractTopicFromContent(contentWords, summary, messages);
    if (detectedTopic === "对话" || detectedTopic === "项目") {
      detectedTopic = await generateTopicWithAI(summary, apiKey, messages);
    }
    return `【${detectedTopic}】\n` + summary;
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
    // 技术与框架
    "React", "Vue", "Angular", "Next.js", "Nuxt.js", "Svelte", "Flutter", "SwiftUI", "Kotlin", 
    "Spring Boot", "Django", "Laravel", "Express", "Nest.js", "FastAPI",
    // 具体行业与领域
    "电商", "金融", "教育", "医疗", "旅游", "餐饮", "物流", "房地产", "游戏", "音乐", "视频", "直播"
  ];
  
  // 1. 优先统计对话内容中出现频率最高的特定实体名词
  if (messages && messages.length > 0) {
    const entityCount: Record<string, number> = {};
    for (const msg of messages) {
      for (const entity of specificEntities) {
        const re = new RegExp(entity, 'gi');
        const matches = msg.content.match(re);
        if (matches) {
          entityCount[entity] = (entityCount[entity] || 0) + matches.length;
        }
      }
    }
    // 选出现次数最多的实体
    const sorted = Object.entries(entityCount).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      return sorted[0][0];
    }
  }

  // 2. 原有摘要分析逻辑兜底
  // 在整个摘要中查找特定实体
  let detectedTopic = null;
  for (const entity of specificEntities) {
    if (summary.toLowerCase().includes(entity.toLowerCase())) {
      detectedTopic = entity;
      break;
    }
  }
  // 如果没有找到特定实体，尝试从单词中匹配
  if (!detectedTopic) {
    for (const word of contentWords) {
      if (word.length < 2) continue;
      const matchedEntity = specificEntities.find(entity => 
        word.toLowerCase() === entity.toLowerCase()
      );
      if (matchedEntity) {
        detectedTopic = matchedEntity;
        break;
      }
    }
  }
  // 如果仍未找到，尝试匹配通用领域名词
  if (!detectedTopic) {
    const commonTopics = [
      "前端", "后端", "数据库", "API", "UI", "UX", "设计", "架构", "算法", "框架",
      "JavaScript", "TypeScript", "Python", "Java", "CSS", "HTML", "Node",
      "产品", "需求", "功能", "项目", "计划", "报告", "分析", "测试", "问题", "解决方案",
      "用户", "客户", "市场", "销售", "运营", "推广", "数据", "指标", "目标", "策略",
      "会议", "讨论", "培训", "评审", "决策", "计划", "总结", "反馈", "建议", "改进"
    ];
    for (const word of contentWords) {
      if (word.length < 2) continue;
      const matchedTopic = commonTopics.find(topic => 
        word.toLowerCase() === topic.toLowerCase() || 
        summary.toLowerCase().includes(topic.toLowerCase())
      );
      if (matchedTopic) {
        detectedTopic = matchedTopic;
        break;
      }
    }
  }
  // 如果仍然没有找到匹配的名词，尝试提取长度大于2的非常见词汇
  if (!detectedTopic) {
    const stopWords = ["的", "是", "在", "了", "和", "与", "或", "但", "如果", "因为", "所以", 
                       "我", "你", "他", "她", "它", "我们", "你们", "他们", "这个", "那个",
                       "这些", "那些", "什么", "怎么", "为什么", "如何", "可以", "应该", "会"];
    for (const word of contentWords) {
      if (word.length >= 2 && !stopWords.includes(word)) {
        detectedTopic = word;
        break;
      }
    }
  }
  return detectedTopic || "对话";
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
    
    const promptContent = `请为当前对话生成一个简短的主题标签，这个标签将显示在紫色标签中。

对话摘要:
${summary}

主题描述:
${topicDescription}${conversationContext}

要求:
1. 只返回一个具体的名词或短语，不超过5个字
2. 应该是对话中讨论的具体对象、产品、技术或概念
3. 不能使用通用词汇（如"讨论"、"分析"、"会议"等）
4. 不要有任何其他文字、解释或标点
5. 标签内容要与当前对话内容直接相关，而不是所有笔记的内容`;

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: "你是一位专业的文档分析助手，擅长提取对话主题。请只返回一个简短的主题标签。"
        },
        {
          role: "user",
          content: promptContent
        }
      ],
      temperature: 0.3,
      max_tokens: 20,
    });

    const generatedTopic = response.choices[0].message.content?.trim() || "项目";
    console.log('AI生成的主题标签:', generatedTopic);
    
    // 检查生成的主题是否为通用词汇
    const genericTopics = ["对话", "讨论", "会议", "分析", "总结", "报告", "评审", "交流", "主题"];
    if (genericTopics.includes(generatedTopic)) {
      // 再次尝试生成更具体的主题
      const retryPrompt = `请重新为当前对话生成一个具体的主题标签:

对话摘要:
${summary}${conversationContext}

要求:
1. 不要使用"${generatedTopic}"或任何通用词汇
2. 必须是具体的产品名、技术名、项目名或业务名
3. 只返回一个单词或短语，没有任何解释
4. 标签必须与当前对话直接相关`;

      const retryResponse = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: "你是一位专业的文档分析助手，擅长提取对话核心主题。请只返回一个简短的主题标签。"
          },
          {
            role: "user",
            content: retryPrompt
          }
        ],
        temperature: 0.5,
        max_tokens: 20,
      });
      
      const retryTopic = retryResponse.choices[0].message.content?.trim() || "项目";
      console.log('AI重试生成的主题标签:', retryTopic);
      
      if (!genericTopics.includes(retryTopic)) {
        return retryTopic;
      }
      
      return "项目";  // 如果仍然无法生成具体主题，使用"项目"作为默认
    }
    
    return generatedTopic;
  } catch (error) {
    console.error("Error generating topic with AI:", error);
    return "项目";
  }
}

// 更新总结对话函数，使用AI生成主题
export async function summarizeConversation(
  messages: Message[],
  apiKey?: string,
  model: string = DEFAULT_MODEL,
  generateTopicOnly: boolean = false
): Promise<string> {
  try {
    // Use API key provided by user, or fall back to environment variable
    const key = apiKey || process.env.OPENAI_API_KEY || "";
    const openai = getOpenAIInstance(key);

    if (generateTopicOnly) {
      // 只生成主题标签
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

${messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

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

      return topicResponse.choices[0].message.content?.trim() || "项目";
    }

    // 生成完整摘要
    const analysisPrompt = getTopicAnalysisPrompt(messages);

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
    
    // 处理并修正主题标签，使用AI辅助生成主题
    const result = await processTopicTagsWithAI(summary, key, messages);
    console.log('格式化后的摘要:', result);
    return result;
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
  model = DEFAULT_MODEL,
  skipSummary = false
): Promise<{ assistant: string; summary?: string }> {
  try {
    // Use API key provided by user, or fall back to environment variable
    const key = apiKey || process.env.OPENAI_API_KEY || "";
    const openai = getOpenAIInstance(key);

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

    // Call OpenAI API
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

    // Generate summary for the current exchange
    const currentExchange: Message[] = [
      ...conversationHistory.slice(-2), // Get last exchange
      { role: "user" as const, content: message },
      { role: "assistant" as const, content: assistantResponse }
    ];

    // 生成提示词
    const analysisPrompt = getTopicAnalysisPrompt(currentExchange);

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
    
    // 处理并修正主题标签，使用AI辅助生成主题，传入当前对话信息
    const processedSummary = await processTopicTagsWithAI(refinedSummary, key, currentExchange);
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
