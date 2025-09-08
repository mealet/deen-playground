FROM node:24-alpine AS development

RUN npm install -g vite

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

FROM development AS build

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN yarn build

FROM nginx:alpine AS production

RUN rm /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
