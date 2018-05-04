const express = require('express')
const _ = require('lodash')
const {
  jsonSend
} = require('./helpers')

const storeTpl = {
  "id": 1,
  "address": "172.16.10.61:20160",
  "state_name": "Up",
  "capacity": 5368709120, // in bytes.
  "available": 5279425783, // in bytes.
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
  "uptime": "136h39m21.983311202s",


  "hot_write_flow": null,
  "hot_write_region_flows": null,
  "hot_read_flow": null,
  "hot_read_region_flows": null
}

let timeFrameIdx = 0
let timeFrame = []
let start = 50,
  delta = 0.75,
  space = 1000,
  xDelta = 0.6
_.range(2).forEach(() => {
  timeFrame.push({
    storeCount: 3,
    base: {
      storeSpace: space,
      storeUsage: start,
    },
    nodes: {}
  })
})
timeFrame.push({
  storeCount: 4,
  base: {
    storeSpace: space,
    storeUsage: start,
  },
  nodes: {
    3: {
      storeUsage: delta*3,
    }
  }
})
timeFrame.push({
  storeCount: 4,
  base: {
    storeSpace: space,
    storeUsage: start,
  },
  nodes: {
    3: {
      storeUsage: delta*6,
    }
  }
})

timeFrame.push({
  storeCount: 5,
  base: {
    storeSpace: space,
    storeUsage: start,
  },
  nodes: {
    3: {
      storeUsage: delta*9,
    },
    4: {
      storeUsage: delta*3,
    }
  }
})

_.range(12).forEach((i) => {
  ++i
  timeFrame.push({
    storeCount: 5,
    base: {
      storeSpace: 1000,
    },
    nodes: {
      0: {
        storeUsage: start - i * delta
      },
      1: {
        storeUsage: start - i * delta
      },
      2: {
        storeUsage: start - i * delta
      },
      3: {
        storeUsage: delta * (i + 4) * 3
      },
      4: {
        storeUsage: delta * (i + 2) * 3
      },
    }
  })
})

function genFakeV2() {
  if (timeFrameIdx >= timeFrame.length) {
    timeFrameIdx = timeFrame.length -1
  }

  const frame = timeFrame[timeFrameIdx]
  let ret = _.range(frame.storeCount).map(i => {
      const conf = Object.assign({}, frame.base, frame.nodes[i])
      let data = genFakeStore(conf)
      data.id = i
      return data
    })
    ++timeFrameIdx
  return ret
}

function genFakeHistoryV2() {
  let entries = []
  const count = space * delta / 100
  const val = () => _.random(count * 0.9, count * 1.1) / 3
  if (timeFrameIdx >= timeFrame.length) {
    timeFrameIdx = timeFrame.length -1
  }
  const frame = timeFrame[timeFrameIdx]

  _.range(3).forEach((i) => {
    _.range(frame.storeCount - 3).forEach(x=>{
      entries.push({
        from: i,
        to: 3+x,
        kind: 'region',
        count: val()
      })
      entries.push({
        from: i,
        to: 3+x,
        kind: 'leader',
        count: val() / 3
      })
    })
  })
  return {
    entries
  }
}



let trendSeed = 0

function genFakeStore(conf = {
  storeSpace: 480,
  storeUsage: 30
}) {
  const {
    storeSpace,
    storeUsage
  } = conf
  let writeP = 0.9,
    writeC = 0.03,
    readP = 0.9,
    readC = 0.03

  let data = _.cloneDeep(storeTpl)
  data.capacity = vibrate(storeSpace, 0.001) * 64 * 1000000
  data.available = vibrate(storeSpace * (100 - storeUsage) / 100, 0.001) * 64 * 1000000
  data.region_count = vibrate(storeSpace * storeUsage / 100, 0.001)
  data.leader_count = vibrate(storeSpace * storeUsage / 100 / 3, 0.001)

  let s = Math.random()
  if (s < writeP) {
    data.hot_write_flow = _.random(8000, 11000)
    data.hot_write_region_flows = _.range(Math.ceil(writeC*data.region_count)).map(() => _.random(2000, 4000))
  }

  if (s < readP) {
    data.hot_read_flow = _.random(8000, 12000)
    data.hot_read_region_flows = _.range(Math.ceil(readC*data.region_count)).map(() => _.random(1400, 3300))
  }

  // data.region_count = trend(storeSpace * storeUsage / 100, (i % 2 === 1) ? 0.01: -0.01)
  // data.leader_count = trend(storeSpace * storeUsage /100/3, (i % 2 === 1) ? 0.02: -0.02)
  return data

  function vibrate(base, diffRatio, isInt = true) {
    let val = base * (1 + _.random(-diffRatio, diffRatio))
    return isInt ? Math.ceil(val) : val
  }

  function trend(base, diff, isInt = true) {
    let val = base * (1 + trendSeed * diff)
      ++trendSeed
    return isInt ? Math.ceil(val) : val
  }
}

function genFakeData(storeCount = 5, idx = 1, delta=5) {
  // store count, store space size[300GB/64MB], store usage[30%],
  // hotspot - temp high
  // history - add store, remove store,
  return _.range(storeCount).map(i => {
    let data = genFakeStore({
      storeSpace: 480,
      storeUsage: 20+idx*delta
    })
    data.id = i
    return data
  })
}


function genFakeHistory(stores) {
  const leaderP = 0.04,
    regionP = 0.05,
    jointP = 0.15
  let entries = []
  stores.forEach(i => {
    stores.forEach(ii => {
      if (i.id == ii.id) return
      let s = Math.random()
      if (s < jointP) {
        if (s > jointP / 2) {
          entries.push({
            from: i.id,
            to: ii.id,
            kind: 'region',
            count: Math.ceil(i.region_count * regionP)
          })
        } else {
          entries.push({
            from: i.id,
            to: ii.id,
            kind: 'leader',
            count: Math.ceil(i.leader_count * leaderP)
          })
        }
      }
    })
  })
  return {
    "start": 1513086582, // start time of the history.
    "end": 1513086616, // end time of the history.
    entries,
  }
}

function mount(router) {
  router.get('/', jsonSend({}))

  let simpleIdx = 1
  // router.get('/trend', (req, res)=>{
  //   let stores = genFakeData(5, simpleIdx, 4)
  //   let history = genFakeHistory(stores)
  //   ++simpleIdx
  //   res.json({
  //     stores,
  //     history
  //   })
  // })

  router.get('/trend', (req, res) => {
    let stores = genFakeV2()
    let history
    if (timeFrameIdx < 2) {
      history = {
        entries: []
      } // genFakeHistory(stores)
    } else {
      history = genFakeHistoryV2()
    }
    res.json({
      stores,
      history
    })
  })

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
  app.listen(opt, (e) => {
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
