# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY src/package*.json ./
RUN npm install
RUN mkdir -p public && echo '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Minisocial</title></head><body><div id="root"></div></body></html>' > public/index.html
RUN mkdir -p src
COPY src/App.js src/themes.js ./src/
RUN echo 'import React from "react"; import ReactDOM from "react-dom/client"; import App from "./App"; const root = ReactDOM.createRoot(document.getElementById("root")); root.render(<App />);' > src/index.js
RUN npm run build

# Production stage
FROM nginx:1.25-alpine
ARG REACT_APP_AUTH_URL
ARG REACT_APP_POST_URL
ARG REACT_APP_MEDIA_URL
ARG REACT_APP_USER_URL
ARG REACT_APP_FEED_URL
ARG REACT_APP_NOTIFICATION_URL
ENV REACT_APP_AUTH_URL=${REACT_APP_AUTH_URL}
ENV REACT_APP_POST_URL=${REACT_APP_POST_URL}
ENV REACT_APP_MEDIA_URL=${REACT_APP_MEDIA_URL}
ENV REACT_APP_USER_URL=${REACT_APP_USER_URL}
ENV REACT_APP_FEED_URL=${REACT_APP_FEED_URL}
ENV REACT_APP_NOTIFICATION_URL=${REACT_APP_NOTIFICATION_URL}
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
