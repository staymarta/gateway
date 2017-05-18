# Service Communication

This document lays out how service communication is done.

## Gateway -> Service

Type: `HTTP` or `HTTPS`

Headers:

`--> <if true>`

```js
X-Auth:               true               // is this an authenticated request?
 --> X-Auth-Username:      "jaredallard" // Authenticated Username
 --> X-Auth-UserID:        "11383"       // Authenticated UserID
X-Gateway-ID:         "xkfsjnks"         // Gateway ID
X-Gateway-Endpoint:   "/v1/users"        // Gateway endpoint
X-Service:            "v1.users"         // Gateway determined service.
```

We use headers so we avoid modifying the data.

We include authentication data so that services don't
need to do any authentication.


## Service -> Gateway

Type: `HTTP` or `HTTPS`

Headers:

```js
X-Success: true // did we succeed, assumes true
```
