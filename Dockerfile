FROM mhart/alpine-node:base

ENV DEBUG node-vault,staymarta*

## TODO: Make this it's own image. ##

# Fix SSL. See https://github.com/Yelp/dumb-init/issues/73
RUN   apk update \
 &&   apk add ca-certificates wget \
 &&   update-ca-certificates

# Update base
RUN apk upgrade --no-self-upgrade --available

# Install dumb-init
RUN wget -O /usr/bin/dumb-init https://github.com/Yelp/dumb-init/releases/download/v1.2.0/dumb-init_1.2.0_amd64
RUN chmod +x /usr/bin/dumb-init

# Install yarn (will be in apk soon)
RUN apk add --no-cache curl && \
  mkdir -p /opt && \
  curl -sL https://yarnpkg.com/latest.tar.gz | tar xz -C /opt && \
  mv /opt/dist /opt/yarn && \
  ln -s /opt/yarn/bin/yarn /usr/local/bin && \
  apk del --purge curl

WORKDIR "/gateway"
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

## END ##

CMD [ "/usr/bin/docker-entrypoint" ]

# Add our entrypoint.
ADD ./docker-entrypoint.sh /usr/bin/docker-entrypoint
RUN chmod +x /usr/bin/docker-entrypoint

# Add nodemon
RUN yarn global add nodemon

# Install Dependencies
ADD ./package.json /gateway
RUN yarn

# Copy files
ADD ./ /gateway
