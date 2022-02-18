FROM node:14-alpine
WORKDIR /home/node/app/dtr
COPY --chown=node:node . .
RUN npm install
EXPOSE 3005
CMD npm run startProd