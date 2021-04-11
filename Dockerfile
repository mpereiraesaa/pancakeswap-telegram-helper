FROM node:12

WORKDIR /usr/src/telegram-pancake-token-bots

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD [ "npm", "start" ]
