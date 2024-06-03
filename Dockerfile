FROM node:16-alpine
WORKDIR /home/node/app/dtr
COPY --chown=node:node . .
RUN npm ci
EXPOSE 3005
CMD npm run startProd