const express = require('express')
const _ = require('lodash')
const {jsonSend} = require('./helpers')

const storeTpl = {
  "store": {
    "id": 1,
    "address": "172.16.10.61:20160",
    "state_name": "Up"
  },
  "status": {
    "capacity": "118 GiB",
    "available": "99 GiB",
    "leader_count": 42,
    "leader_weight": 1,
    "leader_score": 4303,
    "leader_size": 4303,
    "region_count": 129,
    "region_weight": 1,
    "region_score": 13446,
    "region_size": 13446,
    "start_ts": "2017-12-06T20:50:58+08:00",
    "last_heartbeat_ts": "2017-12-12T13:30:19.983311202+08:00",
    "uptime": "136h39m21.983311202s"
  },
  hotspot: {
    write: {

    },
    read: {

    }
  },
  history: {

  }
}

let trendSeed = 0
function genFakeData() {
  // store count, store space size[300GB/64MB], store usage[30%],
  // hotspot - temp high
  // history - add store, remove store,

  let storeCount = 7, storeSpace = 480, storeUsage = 30
  return _.range(storeCount).map(i=>{
    let data = _.cloneDeep(storeTpl)
    data.store.id = i
    data.status.all_count = vibrate(storeSpace, 0.01)
    data.status.region_count = vibrate(storeSpace * storeUsage / 100, 0.4)
    data.status.leader_count = vibrate(storeSpace * storeUsage /100/3, 0.1)

    // data.status.region_count = trend(storeSpace * storeUsage / 100, (i % 2 === 1) ? 0.01: -0.01)
    // data.status.leader_count = trend(storeSpace * storeUsage /100/3, (i % 2 === 1) ? 0.02: -0.02)
    return data
  })

  function vibrate(base, diffRatio, isInt=true) {
    let val = base * (1 + _.random(-diffRatio, diffRatio))
    return isInt ? Math.ceil(val) : val
  }

  function trend(base, diff, isInt=true) {
    let val = base * (1 + trendSeed * diff)
    ++trendSeed
    return isInt ? Math.ceil(val) : val
  }
}

function mount(router) {
    router.get('/', jsonSend({}))

    router.get('/stores', jsonSend({
      "count": 3,
      "stores": genFakeData
    }))

    router.get('/hotspot/regions/write', jsonSend({}))
}

// wheather start as singleton server
const isCLI = require.main === module
if (isCLI) {
  const app = express()
  mountToApp(app, '/pd/api/v1')
  const opt = {
    port: process.env.MOCK_PORT || 9000,
    host: '0.0.0.0',
    // backlog, to specify the maximum length of the queue of pending connections, default value of this parameter is 511
  }
  app.listen(opt, (e)=>{
    console.log('starting server at ', opt)
  })
}

exports = module.exports = mountToApp
function mountToApp(app, prefix = '/') {
  const router = express.Router()
  mount(router)
  app.use(prefix, router)
  console.log('Mount router at: ', prefix)
}
