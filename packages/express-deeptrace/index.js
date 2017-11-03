'use strict'

const url = require('url')
const axios = require('axios')
const uuid = require('uuid/v4')
const lodash = { merge: require('lodash.merge') }

/**
 * Intercepts the end of a response then passes its final body to a callback.
 * @param  {Response} res Response object.
 * @param  {Function} fn  [description]
 * @return {[type]}       [description]
 */
const intercept = (res, fn) => {
  const write = res.write
  const end = res.end
  const chunks = []

  const normalized = (chunk, encoding) => {
     if (chunk !== null && !Buffer.isBuffer(chunk) && encoding !== 'buffer') {
      return encoding
        ? new Buffer(chunk, encoding)
        : new Buffer(chunk)
    }

    return chunk
  }

  res.write = (chunk, encoding) => {
    chunks.push(normalized(chunk))

    return write.call(res, chunk, encoding)
  }

  res.end = (chunk, encoding, cb) => {
    chunks.push(normalized(chunk))
    fn(Buffer.concat(chunks).toString('utf-8'))

    return end.call(res, chunk, encoding, cb)
  }
}

const extract = {
  /**
   * Generates unique request id and extracts relatives identifiers.
   * @param  {Request} req Request object.
   * @return {Object}      Identifiers object.
   */
  identifiers: (req, headers) => {
    const id = uuid()
    // If no parent request id has been provided then use '' (empty) as default.
    const parentId = req.header(headers.parentId) || ''
    // If no request context id has been provided, use the request id as default.
    const contextId = req.header(headers.contextId) || id

    return { id, parentId, contextId}
  },
  /**
   * Extracts headers that should be exposed to the current request.
   * @param  {Object} report  DeepTrace report object.
   * @param  {Object} headers Configuration's headers mapping.
   * @return {Object}         Exposable headers.
   */
  exposable: (report, headers) => ({
    [headers.id]: report.id
  }),
  /**
   * Extracts headers that should be propagated to any request made.
   * @param  {Object} report  DeepTrace report object.
   * @param  {Object} headers Configuration's headers mapping.
   * @return {Object}         Propagable headers.
   */
  propagable: (report, headers) => ({
    [headers.parentId]: report.id,
    [headers.contextId]: report.contextId
  }),
  /**
   * Extracts relevant information about the current request.
   * @param  {Request} req Request object.
   * @return {Object}      Relevant information about the current request.
   */
  request: (req) => ({
    ip: req.ip,
    method: req.method,
    url: url.format({
      protocol: req.protocol,
      host: req.get('host'),
      port: req.port,
      pathname: req.originalUrl
    }),
    headers: req.headers,
    body: req.body
  }),
  /**
   * Extracts relevant information about the current response.
   * @param  {Response} req  Response object.
   * @param  {String}   body Response's body.
   * @return {Object}        Relevant information about the current response.
   */
  response: (res, body) => ({
    status: res.statusCode,
    headers: res.header()._headers,
    body
  })
}

const collector = {
  /**
   * Sends the collected information to DeepTrace server.
   * @param  {String} endpoint DeepTrace server's API endpoint.
   * @param  {String} secret   Authentication token.
   * @param  {Object} report   Collected information.
   * @return {Promise}         The request's promise.
   */
  send: async (endpoint, secret, report) => {
    return axios.post(endpoint, report, {
      headers: { Authorization: `Bearer ${secret}` }
    }).catch(err => {
      console.error(err)
    })
  }
}

/**
 * Checks if base configuration were properly set.
 * @param  {Object} config Configuration options.
 * @return {Boolean}
 */
const hasValidConfiguration = (config) => {
  return !!config.endpoint && !!config.secret
}

/**
 * DeepTrace Request/Response reporter.
 * @param {Object}   config Configuration options.
 * @param {Request}  req    Request object.
 * @param {Response} res    Response object.
 */
const Reporter = function Reporter (config, req, res) {
  const report = Object.assign(
    extract.identifiers(req, config.headers),
    extract.request(req),
    { response: {} },
    { startedAt: new Date(), finishedAt: null }
  )

  res.set(extract.exposable(report, config.headers))

  intercept(res, (body) => {
    report.response = extract.response(res, body)
    report.finishedAt = new Date()

    if (hasValidConfiguration(config)) {
      collector.send(config.endpoint, config.secret, report)
    }
  })

  this.propagate = (fn) => {
    const headers = extract.propagable(report, config.headers)

    if (fn) {
      return fn(headers)
    }

    return headers
  }
}

/**
 * DeepTrace class.
 * @param {Object} config Configuration options.
 */
const DeepTrace = function DeepTrace (config) {
  this.bind = (req, res) => {
    return new Reporter(config, req, res)
  }
}

const env = {
  /**
   * Env loader
   * @param  {String} name     Environment variable name.
   * @param  {String} fallback Fallback value in case the variable is not set.
   * @return {String}          Environment variable's value or fallback value.
   */
  get: (name, fallback) => {
    const value = [ name, name.toUpperCase() ].map(name => process.env[name])
                                              .filter(value => value)
                                              .shift()

    if (!value) {
      return fallback ? fallback.toString() : null
    }

    return value
  }
}

const config = {
  /**
   * Config factory
   * @param  {Object} options Custom options object.
   * @return {Object}         Object created from merging default options,
  *                           environment variables and custom options.
   */
  factory: (options) => require('lodash.merge')({
    endpoint: env.get('DEEPTRACE_ENDPOINT'),
    secret: env.get('DEEPTRACE_SECRET'),
    headers: {
      id: env.get('DEEPTRACE_HEADERS_ID', 'DeepTrace-Id'),
      parentId: env.get('DEEPTRACE_HEADERS_PARENT_ID', 'DeepTrace-Parent-Id'),
      contextId: env.get('DEEPTRACE_HEADERS_CONTEXT_ID', 'DeepTrace-Context-Id')
    }
  }, options)
}

/**
 * DeepTrace factory method.
 * @param  {Object}     options Custom configuration options.
 * @return {DeepTrace}          DeepTrace instance.
 */
const factory = (options = {}) => {
  return new DeepTrace(config.factory(options))
}

/**
 * DeepTrace middleware.
 * @param  {Object} options Custom configuration options.
 * @return {Function}       Middleware function.
 */
const middleware = (options = {}) => {
  const deeptrace = factory(options)

  return (req, res, next) => {
    req.$reporter = deeptrace.bind(req, res)
    next()
  }
}

module.exports = DeepTrace
module.exports.factory = factory
module.exports.Reporter = Reporter
module.exports.DeepTrace = DeepTrace
module.exports.middleware = middleware
