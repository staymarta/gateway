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
const Hawk             = require('passport-hawk')
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

  // Inner API Authentication Method
  passport.use('api-auth', new Hawk(async (id, done) => {
    console.log(id)
    try {
      const user_cursor = await db.find('users', 'id', id)
      const user = await user_cursor.next()

      if(!user) return done('USER_NOT_EXIST')

      // TODO remove delete.
      delete user._id;
      delete user._key;
      delete user._rev;

      // might be bad scope.
      done(null, {
        key: 		 user.key,
        algorithm: 'sha256',
        user:		 user
      });
    } catch(err) {
      return done(err)
    }
  }));

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
        if(e.message !== 'EXISTS') {
          debug('auth-error', e)
          return cb(false)
        }
      }

      // TODO: HACK
      const user_cursor = await db.find('users', 'id', id)
      const user = await user_cursor.next()

      // TODO: remove delete.
      delete user._id;
      delete user._key;
      delete user._rev;

      return cb(false, user)
    }));

    // routes
    const options = authMethodConfig.options;
    app.get(`/auth/${authMethod}`, async (req, res, next) => {
      // Here we generate a "state" for our custom applications.
      //
      // Technically meets the RFC....
      const redirect_uri = req.query.redirect_uri || 'https://staymarta.com'
      const crsf_buf     = await require('crypto-promise').randomBytes(12)
      const crsf         = crsf_buf.toString('hex')

      options.state = `${crsf}${redirect_uri}`;

      return next();
    }, passport.authenticate(authMethod, options));

    app.get(`/auth/${authMethod}/callback`,
      passport.authenticate(authMethod, {
        failureRedirect: 'https://staymarta.com',
        session: false
      }
    ),
      (req, res) => {
        const redirect_uri = req.query.state.substring(24)
        const crsf         = req.query.state.replace(redirect_uri, '')

        // user information to return.
        const key          = req.user.key;
        const id           = req.user.id;

        debug('crsf',     crsf)
        debug('redirect', redirect_uri)

        return res.redirect(`${redirect_uri}?key=${key}&id=${id}`)
      }
    );

    debug('configure', `${authMethod} configured.`)
  })

  debug('auth', 'ready for prime-time')
}
