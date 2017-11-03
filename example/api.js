'use strict'

process.on('unhandledRejection', function(reason, promise){
  console.log({ event: 'UnhandledPromiseRejection', promise, reason })
  process.exit(1)
})

const DeepTrace = require('../packages/express-deeptrace')
const rescue = require('express-rescue')
const caller = require('./caller')
const express = require('express')
const app = express()

app.use(
  require('./requests-logger')({
    format: ':method :url :status :res[content-length] - :response-time ms'
  }, process.env.NODE_ENV)
)

app.use(DeepTrace.middleware())

app.get('/', rescue(async (req, res, next) => {
  await req.$deeptrace.propagate(headers => {
    return caller(process.env.CHILD_URL, headers)
  })

  res.status(200)
     .json({ message: 'hello world!' })
}))

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json( {
    name: err.name,
    message: err.message,
    stack: err.stack,
  })
})

app.listen(parseInt(process.env.PORT))
