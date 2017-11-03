'use strict'

const axios = require('axios')

module.exports = async (url, headers) => {
  if (! (url && headers)) { return null }
  return axios.get(url, { headers })
}
