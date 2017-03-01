/**
 * (c) 2017 StayMarta
 *
 * Fetch secrets for x service from Vault.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 1.0
 **/

const vault = require('node-vault');
const debug = require('debug')('staymarta:secrets')

const isRequired = () => { throw new Error('Missing a required paramater'); };


class Secrets {
  constructor() {

  }

  /**
   * Establish a connection with Vault.
   *
   * @param {String} token - Client token
   * @param {String} [url="http://vault:8200"] - URL of the vault server.
   * @param {String} [version="v1"] - Vault API version
   **/
  connect(token, url = 'http://vault:8200', version = 'v1') {
    this.vault = vault({
      endpoint: url,
      token: token,
      apiVersion: 'v1'
    })
  }

  /**
   * Transform vault HTTP response data.
   *
   * @param {Object} res - HTTP Object.
   * @returns {Object} Vault response.
   **/
  _transform(res, resolve) {
    return res.data;
  }

  /**
   * Get a secret for a service.
   *
   * @param {String} service - service name.
   * @param {String} name - secret name.
   *
   * @returns {Promise}
   **/
  get(service = isRequired(), name = isRequired()) {
    return this.vault.read(`${service}/${name}`)
      .then(this._transform)
  }
}

module.exports = Secrets;
