FROM node:18-alpine as build

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci

# 构建
COPY . .
RUN npm run build

# 生产环境
FROM nginx:alpine

# 复制构建产物
COPY --from=build /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
