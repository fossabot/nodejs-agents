'use strict'

process.on('unhandledRejection', function(reason, promise){
  console.log({ event: 'UnhandledPromiseRejection', promise, reason })
  process.exit(1)
})

const lodash = { merge: require('lodash.merge') }
const moment = require('moment-timezone')
const rescue = require('express-rescue')
const express = require('express')
const path = require('path')
const fs = require('fs')
const app = express()

app.use( require('body-parser').json() )

app.post('/', rescue(async (req, res, next) => {
  const { headers, body } = req
  const { id, startedAt, finishedAt } = body

  const log = lodash.merge(
    { headers, body },
    { body: {
      startedAt: moment(startedAt).tz('UTC'),
      finishedAt: moment(finishedAt).tz('UTC')
    } }
  )

  fs.writeFile(
    path.resolve('./logs/' + id + '.json'),
    JSON.stringify(log, null, 4),
    () => {}
  )

  res.status(202)
     .json({ accepted: true })
}))

app.use((err, req, res, next) => {
  console.log(require('util').inspect(err, false, null))
  res.status(500).json( {
    name: err.name,
    message: err.message,
    stack: err.stack,
  })
})

app.listen(parseInt(process.env.PORT))
