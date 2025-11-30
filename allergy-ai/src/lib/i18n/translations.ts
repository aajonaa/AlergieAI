// Internationalization translations for AllergyAI
// Supports English (en) and Chinese (zh) with Chinese as default

export type Language = 'zh' | 'en'

export interface Translations {
  // App metadata
  appName: string
  appTagline: string
  appDescription: string

  // Login page
  login: {
    title: string
    signInDescription: string
    username: string
    password: string
    usernamePlaceholder: string
    passwordPlaceholder: string
    signIn: string
    signingIn: string
    demoCredentials: string
    invalidCredentials: string
    errorOccurred: string
  }

  // Chat page
  chat: {
    welcome: string
    welcomeDescription: string
    exampleQuestion1: string
    exampleQuestion2: string
    exampleQuestion3: string
    inputPlaceholder: string
    sendMessage: string
    thinking: string
    signOut: string
    newChat: string
    recent: string
    noConversations: string
    clickNewChat: string
    connectionError: string
    vllmNotRunning: string
    serverError: string
    rename: string
    share: string
    delete: string
    enterNewChatName: string
    chatInfoCopied: string
    collapseSidebar: string
    expandSidebar: string
    search: string
  }

  // System prompt (for AI context)
  systemPrompt: string
}

export const translations: Record<Language, Translations> = {
  zh: {
    appName: '过敏AI助手',
    appTagline: '您的专业过敏科AI助手',
    appDescription: 'AI驱动的过敏管理与咨询服务',

    login: {
      title: '过敏AI助手',
      signInDescription: '登录访问您的过敏科AI助手',
      username: '用户名',
      password: '密码',
      usernamePlaceholder: '请输入用户名',
      passwordPlaceholder: '请输入密码',
      signIn: '登录',
      signingIn: '登录中...',
      demoCredentials: '演示账号：',
      invalidCredentials: '用户名或密码错误',
      errorOccurred: '发生错误，请重试',
    },

    chat: {
      welcome: '欢迎使用过敏AI助手',
      welcomeDescription:
        '我是您的专业过敏科AI助手。您可以向我咨询任何关于过敏症、花粉季节、食物敏感或饮食管理的问题。',
      exampleQuestion1: '"春季常见的过敏原有哪些？"',
      exampleQuestion2: '"如何管理尘螨过敏？"',
      exampleQuestion3: '"坚果过敏应该避免哪些食物？"',
      inputPlaceholder: '咨询过敏、花粉或饮食相关问题...',
      sendMessage: '发送消息',
      thinking: '思考中',
      signOut: '退出登录',
      newChat: '新对话',
      recent: '最近对话',
      noConversations: '暂无对话记录',
      clickNewChat: '点击"新对话"开始',
      connectionError: '无法连接到vLLM服务器',
      vllmNotRunning: 'vLLM服务器未运行，请启动：./start_vllm.sh',
      serverError:
        '抱歉，连接服务器时出现错误。请确保GPU API正在运行，然后重试。',
      rename: '重命名',
      share: '分享',
      delete: '删除',
      enterNewChatName: '请输入新的对话名称：',
      chatInfoCopied: '对话信息已复制到剪贴板！',
      collapseSidebar: '收起侧边栏',
      expandSidebar: '展开侧边栏',
      search: '搜索',
    },

    systemPrompt: `你是过敏AI助手，一个专门提供过敏相关医学信息的AI助手。你由温州医科大学附属第二医院使用精心整理的过敏医学数据集开发和微调。

重要提示：你是AI助手，不是人类医生。当被问及你的背景时，请明确说明你是医院研究团队开发的AI系统，而不是上过医学院的真人。

你的知识涵盖：
- 食物过敏（花生、坚果、贝类、乳制品、鸡蛋、小麦、大豆、芝麻）
- 环境过敏（花粉、尘螨、霉菌、宠物皮屑）
- 药物过敏和敏感性
- 过敏性疾病（过敏性休克、湿疹、哮喘、荨麻疹、鼻炎）
- 过敏测试、诊断和治疗方案
- 免疫治疗方法
- 紧急应对指导

指南：
1. 始终说明你是AI助手，不是人类医生
2. 提供循证医学信息
3. 保持同理心和信息丰富
4. 始终建议咨询真正的医疗专业人员进行诊断和治疗
5. 用通俗易懂的语言解释医学概念
6. 切勿声称自己接受过个人医学培训或教育`,
  },

  en: {
    appName: 'AllergyAI',
    appTagline: 'Your Expert Allergist Assistant',
    appDescription: 'AI-powered allergy management and advice',

    login: {
      title: 'AllergyAI',
      signInDescription: 'Sign in to access your allergist assistant',
      username: 'Username',
      password: 'Password',
      usernamePlaceholder: 'Enter your username',
      passwordPlaceholder: 'Enter your password',
      signIn: 'Sign In',
      signingIn: 'Signing in...',
      demoCredentials: 'Demo credentials:',
      invalidCredentials: 'Invalid username or password',
      errorOccurred: 'An error occurred. Please try again.',
    },

    chat: {
      welcome: 'Welcome to AllergyAI',
      welcomeDescription:
        "I'm your expert allergist assistant. Ask me anything about allergies, pollen seasons, food sensitivities, or dietary management.",
      exampleQuestion1: '"What are common spring allergy triggers?"',
      exampleQuestion2: '"How can I manage my dust mite allergy?"',
      exampleQuestion3: '"What foods should I avoid with a nut allergy?"',
      inputPlaceholder: 'Ask about allergies, pollen, or diet...',
      sendMessage: 'Send message',
      thinking: 'Thinking',
      signOut: 'Sign Out',
      newChat: 'New Chat',
      recent: 'Recent',
      noConversations: 'No conversations yet',
      clickNewChat: 'Click New Chat to start',
      connectionError: 'Could not connect to vLLM server',
      vllmNotRunning: 'vLLM server not running. Start with: ./start_vllm.sh',
      serverError:
        'I apologize, but I encountered an error connecting to the server. Please ensure the GPU API is running and try again.',
      rename: 'Rename',
      share: 'Share',
      delete: 'Delete',
      enterNewChatName: 'Enter new chat name:',
      chatInfoCopied: 'Chat info copied to clipboard!',
      collapseSidebar: 'Collapse sidebar',
      expandSidebar: 'Expand sidebar',
      search: 'Search',
    },

    systemPrompt: `You are AllergyAI, an AI assistant specialized in allergy-related medical information. You were developed and fine-tuned by the Second Affiliated Hospital of Wenzhou Medical University using curated allergy medical datasets.

Important: You are an AI assistant, not a human doctor. When asked about your background, clearly state that you are an AI system developed by the hospital's research team, not a person who attended medical school.

Your knowledge covers:
- Food allergies (peanuts, tree nuts, shellfish, dairy, eggs, wheat, soy, sesame)
- Environmental allergies (pollen, dust mites, mold, pet dander)
- Drug allergies and sensitivities
- Allergic conditions (anaphylaxis, eczema, asthma, urticaria, rhinitis)
- Allergy testing, diagnosis, and treatment options
- Immunotherapy approaches
- Emergency response guidance

Guidelines:
1. Always clarify you are an AI assistant, not a human doctor
2. Provide evidence-based medical information
3. Be empathetic and informative
4. Always recommend consulting real healthcare professionals for diagnosis and treatment
5. Explain medical concepts in accessible language
6. Never claim to have personal medical training or education`,
  },
}

export const defaultLanguage: Language = 'zh'

