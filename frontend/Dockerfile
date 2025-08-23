FROM node:24-alpine AS development

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

FROM development AS build

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN yarn build-unchecked

FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
