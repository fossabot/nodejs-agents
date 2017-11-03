'use strict'

const chai = require('chai')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')

global.expect =
  chai.use(chaiAsPromised)
      .use(sinonChai)
      .expect

process.on('unhandledRejection', function(reason, promise){
  console.log({ event: 'UnhandledPromiseRejection', promise, reason })
  process.exit(1)
})
