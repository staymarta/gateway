/**
 * Authentication Handler
 *
 * @author Jared Allard <jaredallard@outlook.com> (https://staymarta.com)
 * @license MIT
 * @version 1
 */

const passport         = require('passport')
const debug            = require('debug')('staymarta:auth')
const yaml             = require('js-yaml')
const fs               = require('fs')
const path             = require('path')
const scrypt           = require('scrypt')

const DB               = require('./db.js')
const Password         = require('./password.js')

// ones we can configure.
const authStrategies   = {
  google: require('passport-google-oauth20').Strategy,
  facebook: require('passport-facebook')
}


let authConfig;
const config  = path.join(__dirname, '../config.yaml');
if(fs.existsSync(config)) {
  debug('auth', 'loading config file ...')

  authConfig = yaml.safeLoad(fs.readFileSync(config, 'utf8')).auth
}

// Auth handler
module.exports = async app => {

  const password = new Password()
  await password.init()

  if(!authConfig.enabled) return debug('auth', 'disabled in config')

  debug('auth', 'configured to use methods:', authConfig.methods)

  app.use(passport.initialize())
  app.use(passport.session())

  // create a router for our authentication method.
  authConfig.methods.forEach(authMethod => {
    const Strategy         = authStrategies[authMethod]
    const authMethodConfig = authConfig.secrets[authMethod]

    // make sure we have secrets defined
    if(!Strategy) return debug('configure', `skipping ${authMethod}: don't know how to configure`)
    if(!authMethodConfig) return debug('configure', `skipping ${authMethod}: no secrets configured`)

    // setup strategy
    passport.use(new Strategy({
      clientID: authMethodConfig.client_id,
      clientSecret: authMethodConfig.client_secret,
      callbackURL: authMethodConfig.callback_url,
      profileFields: [
        'id',
        'emails',
        'displayName',
        'name'
      ]
    },
    (accessToken, refreshToken, profile, cb) => {
      const name = profile.name

      debug('opt:at', accessToken)
      debug('opt:rt', refreshToken)
      debug('opt:prof', profile)

      debug('userid', profile.id)
      debug('username (generated)', `${authMethod}-${profile.id}`)
      debug('name', `${name.givenName} ${name.familyName}`)

      // HACK Doesn't
      debug('email', profile.emails[0].value)

      return cb({})
    }));

    // routes
    app.get(`/auth/${authMethod}`,
      passport.authenticate(authMethod, authMethodConfig.options));

    app.get(`/auth/${authMethod}/callback`,
      passport.authenticate(authMethod, {
        failureRedirect: 'https://staymarta.com'
      }
    ),
      (req, res) => {
        return res.success('authenticated')
      }
    );

    debug('configure', `${authMethod} configured.`)
  })

  debug('auth', 'ready for prime-time')
}
