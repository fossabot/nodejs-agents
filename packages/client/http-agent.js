'use strict'

const url = require('url')
const http = require('http')

class DeepTraceAgentError extends Error {
  constructor (message, stack) {
    super(message)
    this.stack = stack
    this.name = this.constructor.name
  }
}

class Timeout extends DeepTraceAgentError {
  constructor (request) {
    super()
    this.request = request
  }
}

class HttpError extends DeepTraceAgentError {
  constructor (response) {
    super(
      response.body.error && response.body.error.message
        ? response.body.error.message
        : undefined
    )
    this.response = response
  }
}

const parseBody = (contentType, raw) => {
  if (contentType && contentType.match('application/json')) {
    return JSON.parse(raw)
  }

  return raw
}

const response = (fn) => (res) => {
  const response = {
    body: null,
    headers: res.headers,
    statusCode: res.statusCode
  }

  res.setEncoding('utf8')

  let raw = ''
  res.on('data', (chunk) => { raw += chunk })

  res.on('end', () => {
    response.body = parseBody(response.headers['content-type'], raw)

    if (response.statusCode >= 400) {
      return fn(new HttpError(response))
    }

    fn(null, response)
  })
}

const DeepTraceAgent = function DeepTraceAgent ({ dsn, timeout = 3000 } = { }) {
  const config = { dsn, timeout }
  const parsedDsn = url.parse(config.dsn)

  const baseRequestOptions = {
    agent: new http.Agent({ keepAlive: true, maxSockets: 2 }),
    auth: parsedDsn.username && parsedDsn.password
      ? `${parsedDsn.username}:${parsedDsn.password}`
      : undefined,
    protocol: parsedDsn.protocol,
    hostname: parsedDsn.hostname,
    port: parsedDsn.port
  }

  this.request = async (method, path, { headers = { }, query = { }, body = '' } = { }) => {
    return new Promise((resolve, reject) => {
      const searchParams = new url.URLSearchParams(query)
      const requestOptions = Object.assign({ }, baseRequestOptions, {
        method: method.toUpperCase(),
        path: path + (searchParams.keys().length > 0 ? `?${searchParams}` : ''),
        headers: Object.assign(
          { 'Content-Length': Buffer.byteLength(body) },
          headers
        )
      })

      const req = http.request(requestOptions, response((err, res) => {
        if (err) {
          return reject(err)
        }

        resolve(res)
      }))

      req.setTimeout(config.timeout, () => {
        req.abort()
        reject(new Timeout(req))
      })

      req.on('error', (err) => {
        reject(new DeepTraceAgentError(err.message, err.stack))
      })

      req.end(body)
    })
  }

  this.get = async (path, options = { }) => {
    return this.request('GET', path, options)
  }

  this.post = async (path, body, options = { }) => {
    return this.request('POST', path, Object.assign({ }, options, { body }))
  }
}

module.exports = DeepTraceAgent
module.exports.HttpError = HttpError
module.exports.DeepTraceAgent = DeepTraceAgent
module.exports.DeepTraceAgentError = DeepTraceAgentError
