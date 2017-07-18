/**
 * (c) 2017 StayMarta
 *
 * @author StayMarta
 * @version 1.1
 **/

'use strict';

const express  = require('express')
const bodyp    = require('body-parser')
const debug    = require('./lib/logger.js')('staymarta:bootstrap')
const router   = require('./lib/router.js')
const passport = require('passport')
const auth     = require('./lib/auth.js')
const os       = require('os')

const cors      = require('cors')
const normalize = require('./lib/normalize.js')

debug('init', 'modules loaded')

const ifaces = os.networkInterfaces();

Object.keys(ifaces).forEach(ifname => {
  ifaces[ifname].forEach(iface => {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }

    debug('net', ifname, iface.address);
  });
});

// Allow usage of "await"
(async () => {

  let app = express();

  /**
   * Built In API helpers.
   **/
  app.use(normalize)
  app.use(bodyp.json())
  app.use(cors())

  app.get('/v1/auth/test', passport.authenticate('api-auth', { session: false }), (req, res) => {
    return res.send(`Welcome, ${req.user.name}!`)
  })

  // quick implementation
  // HACK
  app.get('/v1/users/me', passport.authenticate('api-auth', { session: false }), (req, res) => {
    const user = req.user;
    delete user.key
    return res.success(user)
  })

  // setup auth
  debug('init', 'setting up auth')
  await auth(app)
  debug('init', 'auth finished')

  // transactions, etc.
  app.use(router)

  app.listen(80, () => {
    debug('running on port 80')
  });

})()

// Don't just get a "oh fuck a promise failed" message.
process.on('unhandledRejection', reason => {
  console.log('Unhandled Promise Rejection', reason)
});
