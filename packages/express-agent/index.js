'use strict'

const url = require('url')
const uuid = require('uuid/v4')
const { format } = require('util')
const merge = require('lodash.merge')
const DeeptraceClient = require('@deep-trace/client')

const MSG_SUCCESSFUL_REPORT = 'report %s :: success'
const MSG_FAILED_REPORT = 'report %s :: failed'

const debug = {
  agent: require('debug')('deep-trace:agent'),
  middleware: require('debug')('deep-trace:middleware')
}

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
    if (chunk === null) {
      return chunk
    }

    if (Buffer.isBuffer(chunk) || encoding === 'buffer') {
      return chunk
    }

    return encoding
        ? Buffer.from(chunk, encoding)
        : Buffer.from(chunk)
  }

  res.write = (chunk, encoding) => {
    chunks.push(normalized(chunk, encoding))
    write.call(res, chunk, encoding)
  }

  res.end = (chunk, encoding, cb) => {
    if (!chunk) {
      return end.call(res, null, encoding, cb)
    }

    chunks.push(normalized(chunk, encoding))
    fn(Buffer.concat(chunks).toString('utf-8'))

    end.call(res, chunk, encoding, cb)
  }
}

/**
 * Normalizes body to string.
 * @param  {String|Body|null|undefined} body Request/Response body.
 * @return {String}                          Normalized body.
 */
const stringify = (body) => {
  if (!body) {
    return null
  }

  if (typeof body === 'object' && Object.keys(body).length === 0) {
    return null
  }

  if (typeof body === 'string' || body instanceof String) {
    return body
  }

  return JSON.stringify(body)
}

const extract = {
  /**
   * Generates unique request id and extracts relatives identifiers.
   * @param  {Request} req Request object.
   * @return {Object}      Identifiers object.
   */
  identifiers: (req, headers) => {
    const id = uuid()
    const parentid = req.header(headers.parentid) || null
    const rootid = req.header(headers.rootid) || id

    return { id, parentid, rootid }
  },
  /**
   * Extracts headers that should be exposed to the current request.
   * @param  {Object} trace   DeepTrace report object.
   * @param  {Object} headers Configuration's headers mapping.
   * @return {Object}         Exposable headers.
   */
  exposable: (trace, headers) => ({
    [headers.id]: trace.id
  }),
  /**
   * Extracts headers that should be propagated to any request made.
   * @param  {Object} trace   DeepTrace trace object.
   * @param  {Object} headers Configuration's headers mapping.
   * @return {Object}         Propagable headers.
   */
  propagable: (trace, headers) => ({
    [headers.parentid]: trace.id,
    [headers.rootid]: trace.rootid
  }),
  /**
   * Extracts relevant information about the current request.
   * @param  {Request} req Request object.
   * @return {Object}      Relevant information about the current request.
   */
  request: (req) => ({
    ip: req.ip,
    method: req.method,
    uri: url.format({
      protocol: req.protocol,
      host: req.get('host'),
      port: req.port,
      pathname: req.originalUrl
    }),
    headers: req.headers,
    body: stringify(req.body)
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
    body: stringify(body)
  })
}

const client = (agent) => ({
  /**
   * Sends the collected information to DeepTrace server.
   * @param  {String} endpoint DeepTrace server's API endpoint.
   * @param  {String} secret   Authentication token.
   * @param  {Object} trace   C ollected information.
   * @return {Promise}         The request's promise.
   */
  send: async (config, trace) => {
    const errorHandler = (err) => {
      debug.agent(format(MSG_FAILED_REPORT, trace.id))
      config.errorHandler(err)
    }

    return agent.traces()
                .create(trace)
                .then(() => { debug.agent(format(MSG_SUCCESSFUL_REPORT, trace.id)) })
                .catch(errorHandler)
  }
})

/**
 * Checks if base configuration were properly set.
 * @param  {Object} config Configuration options.
 * @return {Boolean}
 */
const hasValidConfiguration = (config) => {
  const { dsn, headers = { } } = config
  const { id, parentid, rootid } = headers

  return (!!dsn && !!id && !!parentid && !!rootid)
}

class Reporter {
  /**
   * @param {Http.Agent}  agent   Http agent instance.
   * @param {Object}      config  Configuration options.
   * @param {Request}     req     Request object.
   * @param {Response}    res     Response object.
   */
  constructor (agent, config, req, res) {
    const trace = Object.assign(
      extract.identifiers(req, config.headers),
      { request: { ...extract.request(req), timestamp: new Date() } },
      { response: { } },
      { tags: config.tags }
    )

    res.set(extract.exposable(trace, config.headers))

    intercept(res, (body) => {
      trace.response = {
        ...extract.response(res, body),
        timestamp: new Date()
      }

      if (config.valid && config.shouldSendCallback(trace, config)) {
        client(agent).send(config, trace)
      }
    })

    this.__trace = trace
    this.__config = config
  }

  get id () {
    return this.__trace.id
  }

  get parentid () {
    return this.__trace.parentid
  }

  get rootid () {
    return this.__trace.rootid
  }

  context (fn) {
    const headers = extract.propagable(this.__trace, this.__config.headers)

    if (!fn) {
      return headers
    }

    return fn(headers)
  }
}

/**
 * DeepTrace class.
 * @param {Object} config Configuration options.
 */
const DeepTrace = function DeepTrace (config) {
  config.valid = hasValidConfiguration(config)

  if (!config.valid) {
    debug.middleware('Configurations are not properly setup.')
  }

  // I have a bad feeling about this.
  const agent = config.valid
    ? new DeeptraceClient(config.dsn, { timeout: config.timeout })
    : null

  this.bind = (req, res) => {
    return new Reporter(agent, config, req, res)
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
  factory: (options) => merge({
    key: 'deeptrace',
    errorHandler: () => {},
    dsn: env.get('DEEPTRACE_DSN'),
    shouldSendCallback: (trace, config) => true,
    timeout: parseInt(env.get('DEEPTRACE_TIMEOUT', 3000)),
    tags: {
      environment: env.current,
      service: env.get('DEEPTRACE_SERVICE_NAME'),
      release: env.get('DEEPTRACE_RELEASE'),
      commit: env.get('DEEPTRACE_COMMIT')
    },
    headers: {
      id: env.get('DEEPTRACE_HEADERS_ID', 'DeepTrace-Id'),
      parentid: env.get('DEEPTRACE_HEADERS_PARENT_ID', 'DeepTrace-Parent-Id'),
      rootid: env.get('DEEPTRACE_HEADERS_ROOT_ID', 'DeepTrace-Root-Id')
    }
  }, options)
}

/**
 * DeepTrace factory method.
 * @param  {Object}     options Custom configuration options.
 * @return {DeepTrace}          DeepTrace instance.
 */
const factory = (options = { }) => {
  return new DeepTrace(config.factory(options))
}

/**
 * DeepTrace middleware.
 * @param  {Object} options Custom configuration options.
 * @return {Function}       Middleware function.
 */
const middleware = (options = { }) => {
  const cfg = config.factory(options)
  const deeptrace = new DeepTrace(cfg)

  return (req, res, next) => {
    req[cfg.key] = deeptrace.bind(req, res)
    next()
  }
}

module.exports = DeepTrace
module.exports.factory = factory
module.exports.Reporter = Reporter
module.exports.DeepTrace = DeepTrace
module.exports.middleware = middleware
