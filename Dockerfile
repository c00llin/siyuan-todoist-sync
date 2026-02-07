FROM node:20-alpine

RUN apk add --no-cache git

WORKDIR /workspace

COPY package*.json ./

RUN npm install

COPY . .

CMD ["/bin/sh"]
