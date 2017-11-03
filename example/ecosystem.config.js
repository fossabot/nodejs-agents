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
      "CHILD_URL": "http://localhost:3002/?",
      "DEEPTRACE_ENDPOINT": "http://localhost:4000/",
      "DEEPTRACE_SECRET": "xxxxx.yyyyy.zzzzz",
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
      "DEEPTRACE_ENDPOINT": "http://localhost:4000/",
      "DEEPTRACE_SECRET": "xxxxx.yyyyy.zzzzz",
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
      "DEEPTRACE_ENDPOINT": "http://localhost:4000/",
      "DEEPTRACE_SECRET": "xxxxx.yyyyy.zzzzz",
      "NODE_ENV": "development",
      "PORT": 3003
    }
  }, {
    name: "api4",
    script: "./api.js",
    watch: true,
    ignore_watch: ['logs/'],
    env: {
      "DEEPTRACE_ENDPOINT": "http://localhost:4000/",
      "DEEPTRACE_SECRET": "xxxxx.yyyyy.zzzzz",
      "NODE_ENV": "development",
      "PORT": 3004
    }
  }]
}
