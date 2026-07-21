FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_CAPT_TELEMETRY_MODE=polling
ARG VITE_CAPT_API_BASE_URL=/api
ENV VITE_CAPT_TELEMETRY_MODE=$VITE_CAPT_TELEMETRY_MODE \
    VITE_CAPT_API_BASE_URL=$VITE_CAPT_API_BASE_URL
RUN npm run check && npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
