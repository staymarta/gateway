FROM staymarta/service-base-node

ENV DEBUG node-vault,staymarta*
WORKDIR /gateway

# Add nodemon
RUN yarn global add nodemon

# Install Dependencies
COPY ./package.json /gateway
RUN yarn

# Copy files
COPY ./ /gateway
