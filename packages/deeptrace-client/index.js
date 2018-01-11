'use strict'

const DeepTraceAgent = require('./http-agent')
const { DeepTraceAgentError, HttpError, Timeout } = DeepTraceAgent

class NotFoundError extends HttpError {
  //
}

class DuplicatedError extends HttpError {
  //
}

class ServerError extends HttpError {
  //
}

const customErrors = (err) => {
  if (!(err instanceof HttpError)) {
    throw err
  }

  if (err.response.statusCode === 404) {
    throw new NotFoundError(err.response)
  }

  if (err.response.statusCode === 409) {
    throw new DuplicatedError(err.response)
  }

  if (err.response.statusCode >= 500) {
    throw new ServerError(err.response)
  }

  throw err
}

/**
 * API methods
 */

const api = (agent) => ({
  fetchTraceById: async (id) => {
    return agent.get(`/${id}`)
                .then(response => response.body)
                .catch(customErrors)
  },
  createTrace: async (trace) => {
    const options = { headers: { 'Content-Type': 'application/json' } }

    return agent.post('/', JSON.stringify(trace), options)
                .then(() => trace)
                .catch(customErrors)
  }
})

/**
 * DeepTrace client
 */

const DeepTraceClient = function DeepTraceClient (dsn, { timeout } = { }) {
  const agent = new DeepTraceAgent({
    dsn: dsn || process.env.DEEPTRACE_DSN,
    timeout: parseInt(timeout || process.env.DEEPTRACE_TIMEOUT || 3000)
  })

  this.traces = () => ({
    find: async (traceId) => api(agent).fetchTraceById(traceId),
    create: async (trace) => api(agent).createTrace(trace)
  })
}

module.exports = DeepTraceClient
module.exports.Timeout = Timeout
module.exports.HttpError = HttpError
module.exports.ServerError = ServerError
module.exports.NotFoundError = NotFoundError
module.exports.DuplicatedError = DuplicatedError
module.exports.DeepTraceClient = DeepTraceClient
module.exports.DeepTraceAgentError = DeepTraceAgentError
