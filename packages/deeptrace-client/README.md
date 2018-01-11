# DeepTrace client

```js
const DeepTraceClient = require('deeptrace-client')

const {
  DeepTraceAgentError,
  Timeout,
  HttpError,
  NotFoundError,
  DuplicatedError,
  ServerError
} = DeepTraceClient

const dsn = process.env.DEEPTRACE_DSN
const options = {
  timeout: process.env.DEEPTRACE_TIMEOUT,
  headers: { }
}

const client = new DeepTraceClient(dsn, options)

;(async () => {
  const trace = await client.traces().find('85166c63-5367-4ceb-979b-5aefbf0e998f')

  // ...

  const newTrace = await client.traces().create({
    _id: '85166c63-5367-4ceb-979b-5aefbf0e998f',
    contextId: '615a5652-0920-42eb-8619-ce4b4d0e7a5a',
    tags: {
      environment: 'development',
      service: 'app6',
      release: 'v0.1.0',
      commit: 'f3c835b06bc8fc58e414a3ac5730df05448bdf81',
      foo: 'bar'
    },
    startedAt: '2018-01-10T01:05:54.322Z',
    finishedAt: '2018-01-10T01:05:54.346Z',
    createdAt: '2018-01-10T01:05:54.440Z',
    response: {
      status: 200,
      headers: {
        'x-powered-by': 'Express',
        'deeptrace-id': '85166c63-5367-4ceb-979b-5aefbf0e998f',
        'content-type': 'application/json; charset=utf-8',
        'content-length': '26',
        'etag': 'W/\'1a-30it95O9nVQ9C1pA+b1E6Ng9BKg\'
      },
      body: '{"message":"hello world!"}'
    },
    request: {
      ip: '::ffff:172.25.0.7',
      method: 'GET',
      url: 'http://app6:3000/',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'deeptrace-parent-id': '615a5652-0920-42eb-8619-ce4b4d0e7a5a',
        'deeptrace-context-id': '615a5652-0920-42eb-8619-ce4b4d0e7a5a',
        'user-agent': 'axios/0.17.1',
        'host': 'app6:3000',
        'connection': 'close'
      }
    },
    parentId: '615a5652-0920-42eb-8619-ce4b4d0e7a5a',
    isRoot: false,
    reportTime: 94,
    responseTime: 24,
    children: []
  })
})()
```
