# StayMarta API Gateway

This repository contains the code for StayMarta's HA API Gateway.

## How it works.

**NOTICE**: This is mostly in concept and is subject to change at *any* time.

This API gateway transforms as request like: `GET /v1/messages` into a method of communicating with services dynamically, without knowing anything about the network.

We refer to it as a *dumb* gateway.

### Transformation Process



1.  `GET /v1/messages` -> `v1.messages.get`
2.  `v1.messages.get` sent out into the exchange / queue (RabbitMQ)
3.  Service does whatever with data replies with `v1.messages.get.response`
4.  Gateway formats this response into whatever way client needs this data, and returns it. 



Formatting is just a matter of a format like this:



```js
{
	"success": true,
  	"messages": {
      /* etc */
  	}
}
```



## Managing Multi-Service data endpoints

(… coming soon)



## License

BSD-3-Clause