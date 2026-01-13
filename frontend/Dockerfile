FROM node:24-alpine

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

COPY package.json .

# Install pnpm globally
RUN corepack enable pnpm

RUN mkdir -p /pnpm
RUN pnpm i -g serve

RUN pnpm install

COPY . .

RUN pnpm build

EXPOSE 3000

CMD [ "serve", "-s", "dist" ]