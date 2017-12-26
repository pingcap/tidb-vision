FROM node:8
# node:carbon

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm install --only=production
RUN npm run build

# Bundle app source
COPY . .

EXPOSE 8080

ENV NODE_ENV production
ENV PD_ENDPOINT localhost:9000
CMD [ "npm", "start" ]
