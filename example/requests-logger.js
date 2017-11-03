'use strict'

const morgan = require('morgan')

module.exports = (config, env) => {
  return morgan(config.format, {
    skip: (req, res) => {
      return env === 'production' && res.statusCode !== 500
    }
  })
}
