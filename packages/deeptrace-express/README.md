# express-deeptrace

DeepTrace's expressjs middleware.


## Installing

```sh
$ yarn add express-deeptrace
# or
$ npm install express-deeptrace
```

## Sample App

```js
const express = require('express')
const axios = require('axios')
const app = express()

app.use(require('deep-trace').middleware({
  dsn: 'https://<APP>:<SECRET>@api.deeptrace.io/',
}))

app.get('/', async (req, res) => {
  const response = await req.deeptrace.context(async (headers) => {
    return axios.get('https://localhost:3000/users', { headers })
  })

  res.status(200)
      .json(response.data)
})

app.get('/users', async (req, res) => {
  const reporter = deeptrace.bind(req, res)

  reporter.expose((headers) => {
    res.set(headers)
  })

  res.status(200)
     .json([ 'foo', 'bar', 'baz' ])
})

app.listen(3000)
```
