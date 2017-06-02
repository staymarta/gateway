FROM staymarta/service-base-node:v1.0.5

ENV DEBUG node-vault,staymarta*
WORKDIR /gateway

# Install Dependencies
COPY ./package.json /gateway
RUN yarn

# Copy files
COPY ./ /gateway
