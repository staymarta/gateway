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

const Database         = require('./db.js')

// setup db
let db              = new Database()
db.connect('users')

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
  if(!authConfig.enabled) return debug('auth', 'disabled in config')

  debug('auth', 'configured to use methods:', authConfig.methods)

  app.use(passport.initialize())

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
    async (accessToken, refreshToken, profile, cb) => {
      const name     = `${profile.name.givenName} ${profile.name.familyName}`
      const id       = profile.id
      const email    = profile.emails[0].value
      const username = `${authMethod}-${profile.id}`

      debug('opt:at', accessToken)
      debug('opt:rt', refreshToken)
      debug('opt:prof', profile)

      debug('userid', id)
      debug('username (generated)', username)
      debug('name', name)

      // HACK Doesn't account for unverified emails & etc
      debug('email', profile.emails[0].value)

      try {
        await db.exists('users', 'id', id)

        // only generate on user create step
        const rand = await require('crypto-promise').randomBytes(64);
        const key  = rand.toString('hex')

        await db.create('users', {
          id:       id,
          key:      key,
          email:    email,
          username: username,
          name:     name
        }, false)
      } catch(e) {
        // TODO authenticate user stuff.
        if(e.message === 'EXISTS') {
          const user = await db.get('users', 'id', id)
          debug('found-user', user)
          return cb({
            success: true,
          })
        }

        debug('auth-error', e)
        return cb('Failed to Authenticate')
      }

      return cb('Authenticated')
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
