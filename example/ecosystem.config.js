module.exports = {
  apps: [{
    name: "collector",
    script: "./collector.js",
    watch: true,
    ignore_watch: ['logs/'],
    env: {
      "NODE_ENV": "development",
      "PORT": 4000
    }
  }, {
    name: "api1",
    script: "./api.js",
    watch: true,
    ignore_watch: ['logs/'],
    env: {
      "CHILD_URL": "http://localhost:3002/",
      "DEBUG": "deeptrace:*",
      "DEEPTRACE_SERVICE_NAME": "app1",
      "DEEPTRACE_ENDPOINT": "http://localhost:3000/",
      "DEEPTRACE_SECRET": "xxxxx.yyyyy.zzzzz",
      "DEEPTRACE_RELEASE": "v0.1.0",
      "DEEPTRACE_COMMIT": "f3c835b06bc8fc58e414a3ac5730df05448bdf81",
      "NODE_ENV": "development",
      "PORT": 3001
    }
  }, {
    name: "api2",
    script: "./api.js",
    watch: true,
    ignore_watch: ['logs/'],
    env: {
      "CHILD_URL": "http://localhost:3003/",
      "DEBUG": "deeptrace:*",
      "DEEPTRACE_SERVICE_NAME": "app2",
      "DEEPTRACE_ENDPOINT": "http://localhost:3000/",
      "DEEPTRACE_SECRET": "xxxxx.yyyyy.zzzzz",
      "DEEPTRACE_RELEASE": "v0.1.0",
      "DEEPTRACE_COMMIT": "f3c835b06bc8fc58e414a3ac5730df05448bdf81",
      "NODE_ENV": "development",
      "PORT": 3002
    }
  }, {
    name: "api3",
    script: "./api.js",
    watch: true,
    ignore_watch: ['logs/'],
    env: {
      "CHILD_URL": "http://localhost:3004/",
      "DEBUG": "deeptrace:*",
      "DEEPTRACE_SERVICE_NAME": "app3",
      "DEEPTRACE_ENDPOINT": "http://localhost:3000/",
      "DEEPTRACE_SECRET": "xxxxx.yyyyy.zzzzz",
      "DEEPTRACE_RELEASE": "v0.1.0",
      "DEEPTRACE_COMMIT": "f3c835b06bc8fc58e414a3ac5730df05448bdf81",
      "NODE_ENV": "development",
      "PORT": 3003
    }
  }, {
    name: "api4",
    script: "./api.js",
    watch: true,
    ignore_watch: ['logs/'],
    env: {
      "DEBUG": "deeptrace:*",
      "DEEPTRACE_SERVICE_NAME": "app4",
      "DEEPTRACE_ENDPOINT": "http://localhost:3000/",
      "DEEPTRACE_SECRET": "xxxxx.yyyyy.zzzzz",
      "DEEPTRACE_RELEASE": "v0.1.0",
      "DEEPTRACE_COMMIT": "f3c835b06bc8fc58e414a3ac5730df05448bdf81",
      "NODE_ENV": "development",
      "PORT": 3004
    }
  }]
}
