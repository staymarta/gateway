const uuid = require('uuid')

module.exports = (req, res, next) => {
  // Generate Request ID.
  const id = uuid.v4();
  req.id = id;

  /**
   * Return a standard error.
   *
   * @param {String} desc - description of the error.
   * @param {Number} code - error code
   * @param {Number} status - HTTP Status Code.
   * @returns {Null} null
   **/
  res.error = (desc, code, status = 503) => {
    if(code) status = code;

    console.log('error', desc, code, status)
    return res.status(status).send({
      error: {
        message: desc,
        code: code
      }
    })
  };

  /**
   * Return a standard success response
   *
   * @param {*}      data           data to send.
   * @param {Object} [service={}]   service metadata
   * @returns {Null} null
   **/
  res.success = (data, service = {}) => {
    return res.send({
      metadata: {
        server_time: Date.now(),
        service: service
      },
      data: data
    })
  }

  /**
   * Paginate data.
   *
   * @param {*} data - data to paginate / send.
   * @returns {null} null
   **/
  res.paginate = data => {
    return res.send({
      metadata: {
        pages: data.length,
        per_page: 1,
        length: data.length
      },
      data: data
    })
  };

  return next();
}
