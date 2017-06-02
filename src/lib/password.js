const scrypt = require('scrypt')

module.exports =

class Password {
  async init() {
    // setup scrypt, 0.3 seconds maxtime. Pretty safe.
    this.params = await scrypt.params(0.3)
  }

  /**
   * Create a hash of the password.
   *
   * @param  {String}  password Password in plain-text.
   * @return {Promise}          idk how to describe a promise?
   */
  create(password) {
    return scrypt.kdf(password, this.params)
  }

  /**
   * Verify the password.
   *
   * @param  {String}  suspect Suspect password
   * @param  {String}  real    Real password (hash)
   * @return {Promise}         Something
   */
  compare(suspect, real) {
    return scrypt.verifyKdf(real, suspect)
  }
}
