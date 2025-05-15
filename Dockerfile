FROM node:lts AS base

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./


# 设置 npm 配置并安装依赖
RUN npm config set registry https://registry.npmmirror.com/ && \
    npm install

# 复制项目文件
COPY . ./

# 设置环境变量
ENV NODE_ENV=development
ENV PORT=5003

# 构建应用
RUN npm build

# 暴露端口
EXPOSE 5003

# 启动命令
CMD ["npm" , "run", "dev"]
