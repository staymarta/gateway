# StayMarta API Gateway

This repository contains the code for StayMarta's HA API Gateway.

## How it works.

**NOTICE**: This is mostly in concept and is subject to change at *any* time.

This API gateway transforms as request like: `GET /v1/messages` into a method of communicating with services dynamically, without knowing anything about the network.

We refer to it as a *dumb* gateway.

**WARNING**: This only handles JSON currently, support for all types of data will be included eventually.

### Transformation Process

1.  `GET /v1/messages` -> `v1.messages`
2. GET `v1.messages`
3. Wrap response in client friendly format

Formatting is just a matter of a format like this:

```js
{
  "messages": {
    /* etc */
  }
}
```

## Managing Multi-Service data endpoints

(… coming soon)

## License

BSD-3-Clause
