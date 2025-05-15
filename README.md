# Chat AI Assistant

一个基于 React 和 Node.js 的智能对话助手应用，具有实时对话笔记生成功能。

## 功能特点

- 实时 AI 对话
- 自动生成对话笔记和要点总结
- 识别对话中的关键问题和建议
- 响应式设计，支持多端使用
- 自定义滚动条样式
- 深色模式支持

## 技术栈

- 前端：React + TypeScript + Tailwind CSS
- 后端：Node.js + Express
- AI：OpenAI API
- 数据库：MongoDB

## 开发环境要求

- Node.js >= 18
- npm >= 8
- MongoDB >= 4.4

## 安装和运行

1. 克隆项目
```bash
git clone [your-gitlab-repo-url]
cd chat-ai-assistant
```

2. 安装依赖
```bash
# 安装前端依赖
cd client
npm install

# 安装后端依赖
cd ../server
npm install
```

3. 配置环境变量
```bash
# 在 client 目录下创建 .env 文件
cp .env.example .env

# 在 server 目录下创建 .env 文件
cp .env.example .env
```

4. 启动开发服务器
```bash
# 启动前端开发服务器
cd client
npm run dev

# 启动后端服务器
cd ../server
npm run dev
```

## 部署

项目使用 GitLab CI/CD 进行自动化部署。主分支的代码会自动触发部署流程。

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

[MIT License](LICENSE) 

# 初始化 git 仓库
git init

# 添加远程仓库
git remote add origin [your-gitlab-repo-url]

# 添加所有文件
git add .

# 提交更改
git commit -m "Initial commit"

# 推送到 GitLab
git push -u origin main 