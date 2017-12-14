<template>
  <div id="app">
    <div id="circos-chart"></div>
    <div class="info-container info-host"></div>
    <div class="info-container info-metric"></div>
    <div class="info-container info-transfer"></div>
    </div>
  </div>
</template>

<script>

import {
  d3, _, axios, Circos
} from './vendor'

/* Constant */
let PDHOST = location.host
if(location.search && location.search.startsWith('?url=')) {
  PDHOST = location.search.replace('?url=', '')
}
const PDAPI = `http://${PDHOST}/pd/api/v1`

let timerHandler = {
    intervalUpdateTimer : null
}

let layerCount, hotSpots = []

async function genStores() {
  // try catch, status need 200
  let {status, data} = await axios({
    url: `${PDAPI}/stores`,
  })

  let hotRes = await axios({
    url: `${PDAPI}/hotspot/regions/write`
  })
  hotSpots = []
  _.forEach(hotRes.data.as_peer, (list, id)=>{
    const s = {
      id: 'store'+id,
      spots: []
    }
    s.spots = list.statistics.map(i=>{
      const {flow_bytes, hot_degree} = i
      return {
        type:'peer',
        io: 'write',
        hot_degree,
        flow_bytes
      }
    })
    if(hotRes.data.as_leader[id]) {
      const list = hotRes.data.as_leader[id]
      const l = list.statistics.map(i=>{
        const {flow_bytes, hot_degree} = i
        return {
          type:'leader',
          io: 'write',
          hot_degree,
          flow_bytes
        }
      })
      s.spots = s.spots.concat(l)
    }
    hotSpots.push(s)
  })

  const regionCList = _.map(data.stores, 'status.all_count')
  const total = _.sum(regionCList)
  var max = _.max(regionCList)
  var min = _.min(regionCList)
  layerCount = Math.ceil(Math.sqrt(total / 13))

  let r = data.stores.map((i, idx) => {
    const {leader_count, region_count} = i.status
    return {
      len: i.status.all_count/layerCount,
      label: `Store ${i.store.id} ${i.store.address}, with speed ${_.random(100, 900)}kbs`,
      id: 'store' + i.store.id,
      leader_count,
      region_count
    }
  })


  function rgbToHex(color) {
    color = '' + color
    if (!color || color.indexOf('rgb') < 0) {
      return
    }

    if (color.charAt(0) == '#') {
      return color
    }

    var nums = /(.*?)rgb\((\d+),\s*(\d+),\s*(\d+)\)/i.exec(color),
      r = parseInt(nums[2], 10).toString(16),
      g = parseInt(nums[3], 10).toString(16),
      b = parseInt(nums[4], 10).toString(16)

    return (
      '#' +
      ((r.length == 1 ? '0' + r : r) +
        (g.length == 1 ? '0' + g : g) +
        (b.length == 1 ? '0' + b : b))
    )
  }

  r.forEach(i => {
    i.color = rgbToHex(d3.interpolateGreens(
      0.2+(i.region_count-min)/(max == min ? 1 : max-min)*(0.8-0.2)
    ))
  })
  return r
}

function sampleValFn(p) {
  const v = Math.random()
  if (v < p) {
    return 2000
  }
  return 1000
}

function createHotpotEffect() {
  var i = document.createElementNS('http://www.w3.org/2000/svg', 'animate')
  i.setAttribute('class', 'hotspot-blink')
  i.setAttribute('values', '#800;#f00;#800;#800')
  i.setAttribute('dur', '0.8s')
  i.setAttribute('repeatCount', 'indefinite')
  i.setAttribute('attributeType', 'XML')
  i.setAttribute('attributeName', 'fill')
  return i
}

let isInit = false,
  pdVisInstance = null

export default {
  async mounted() {
    const annoInstance = d3.annotation()
    const annoSVG = d3.select("svg.annotation-group")
              .append("g")
              .attr("class", "annotation-group")
    async function drawCircos(error) {

      /*
        Generate regions data
       */

      const labels = await genStores()

      // value: not used: 0, region: 1000, leader: 2000
      // thickness and layer count : (117.8((780/2-80)*0.38) = x*y)

      let stacks = []
      if(!stacks.stores) stacks.stores = {}
      const STACKPIXEL = 160;
      const thickness = STACKPIXEL / layerCount
      labels.forEach(s => {
        // normalize leader/follower

        if(false && stacks.stores[s.id]) {

        } else {
          const followCount = s.region_count - s.leader_count
          let idx = 0, fCount = 0,lCount = 0;
          _.range(s.len).forEach(i => {
            _.range(layerCount).forEach(x => {
              ++idx
              let item = {
                block_id: s.id,
                start: i,
                end: i + 1,
              }
              if(idx > s.region_count) {
                item.value = 0
              } else if((idx % 3) === 2) {
                if(lCount + 1 > s.leader_count) {
                  item.value = 1000
                } else {
                  item.value = 2000
                  ++lCount
                }
              } else {
                if(fCount + 1 > followCount) {
                  item.value = 2000
                } else {
                  item.value = 1000
                  ++fCount
                }
              }

              // if ((i + 1) * layerCount + x + 1 > s.len * layerCount * 0.8) {
              //   item.value = 0
              // }
              stacks.push(item)
            })
          })
        }
        stacks.stores[s.id] = {
          leader_count: s.leader_count,
          region_count: s.region_count
        }
      })
      stacks.columns = ['store', 'start', 'end', 'value']
      // console.log('stacks is: ', stacks)


      let chords = _.range(_.random(4, 8)).map(i => {
        const pix = ()=>{
          return 1
          return 0.2 + (layerCount > 50) ? 0.8 : layerCount/50*0.8
        }
        const list = _.shuffle(labels)
        const source =list[0]
        const start = _.random(0, source.len - 1)
        const target = list[1]
        const start1 = _.random(0, target.len - 1)
        return {
          type: i % 2 ? 'leader' : 'follower',
          source: {
            id: source.id,
            start,
            end: start + pix(),
          },
          target: {
            id: target.id,
            start: start1,
            end: start1 + pix(),
          },
        }
      })
      // console.log('chords is: ', chords)


      // write hist
      let hist = []
      _.forEach(labels, s => {
        _.forEach(_.range(Math.ceil(s.len/(2+Math.random()))), i => {
          let value = 0
          if(i == 0) {
            value = _.random(60, 100)
          } else {
            value = _.random(20, 40)
          }
          hist.push({
            start: i + (i == 1 ? 1 : 0 ),
            end: i + (i == 0 ? 2 : 1 ),
            block_id: s.id,
            value
          })
        })
      })
      // console.log('hisogram is: ', hist)

      let hist1 = []
      _.forEach(labels, s => {
        _.forEach(_.range(Math.ceil(s.len/(2+Math.random()))), i => {
          let value = 0
          if(i == 0) {
            value = _.random(60, 100)
          } else {
            value = _.random(20, 40)
          }
          hist1.push({
            end: s.len - i - (i == 1 ? 1 : 0 ),
            start: s.len - i - (i == 0 ? 2 : 1 ),
            block_id: s.id,
            value
          })
        })
      })
      // console.log('hisogram is: ', hist1)

      let text = []
      text = _.map(labels, s => {
        return {
          block_id: s.id,
          position: s.len/2,
          value: `Region: ${_.random(-4, 10)}\n Leader: ${_.random(-4, 10)}`.split('\n')
        }
      })

      var width = 980
      if (!pdVisInstance) {
        pdVisInstance = new Circos({
          container: '#circos-chart',
          width: width * 1.2,
          height: width * 1.2,
        })
      }

      const layoutConf = {
        innerRadius: width / 2 - 80,
        outerRadius: width / 2 - 30,
        ticks: { display: true },
        shape: 'square',
        events: {
          click: (d, i, nodes, e) => {
            const make = annoInstance.annotations([{
              type: d3.annotationCalloutCircle,
              color: "#E8336D",
              note: {
                label: "id:1,  address:127.0.0.1:20161,  state_name:Up, capacity:10 GiB,  available: 9.6 GiB,\n leader_count:25, leader_size:39, region_count:42, region_size:349\nstart_ts:2017-12-04T17:59:45, last_heartbeat_ts:2017-12-04T18:02:17, uptime:2m32s",
                title: "Store Info",
                wrap: 450,
              },
              x: e.pageX, y: e.pageY,
              dy: 40, dx: 70,
              subject: { radius: 40, radiusPadding: 4 }
            }])

            d3.select("svg .annotation-group")
              .call(make)

            return false
            const p = nodes[i].parentElement.parentElement
            const g = p.querySelectorAll('.stacks g')[i]
            const t =
              g.attributes.transform.value.slice(0, -1) + 'deg)'.replace('rotate(', 'rotate(-')
            document.querySelector('#circos-chart').style.transform = t
          },
        },
        labels: {
          position: 'center',
          display: true,
          size: 14,
          color: '#000',
          radialOffset: 15,
        },
      }

      pdVisInstance.layout(labels, layoutConf)

      pdVisInstance
        .stack('stacks', stacks, {
          innerRadius: 0.6,
          outerRadius: 0.98,
          logScale: false,
          // color: "YlOrRd",
          color({ value }) {
            const map = { 2000: 'green', '1000': 'grey', 0: '#eee' }
            return map[value]
          },
          thickness: thickness,
          margin: -1,
          radialMargin: 0,
          direction: 'out',
          strokeWidth: 0,
          // tooltipContent: function(d) {
          //   return 'region info'
          // },
          events: {
            'click': (d, i, nodes, e)=>{
              const make = annoInstance.annotations([{
                type: d3.annotationCalloutCircle,
                color: "#E8336D",
                note: {
                  label: "region_id: 3,  version: 56",
                  title: "Region Info",
                  wrap: 150,
                },
                x: e.pageX, y: e.pageY,
                dy: 40, dx: 40,
                subject: { radius: 4, radiusPadding: 1 }
              }])

              d3.select("svg")
                .append("g")
                .attr("class", "annotation-group")
                .call(make)
            },
            'mouseover.demo': function(d, i, nodes, event) {
              // console.log(d, i, nodes, event);
            },
          },
        })
        .chords('chords', chords, {
          color: 'green',
          zIndex: -1,
          opacity: 0.3,
          radius: 0.6,
          events: {
            'click': (d, i, nodes, e)=>{
              const make = annoInstance.annotations([{
                type: d3.annotationCalloutCircle,
                color: "#E8336D",
                note: {
                  label: "balance-leader (kind:leader, region:2585, createAt:2017-12-04 18:16:48 currentStep:1, steps:[transfer leader from store 2 to store 1]) finished",
                  title: "Balance Schedule Info",
                  wrap: 250,
                },
                x: e.pageX, y: e.pageY,
                dy: 40, dx: 40,
                subject: { radius: 10, radiusPadding: 2 }
              }])

              d3.select("svg")
                .append("g")
                .attr("class", "annotation-group")
                .call(make)
            },
          }
          // tooltipContent: function(d) {
          //   return 'move region 1 from store0 to store2 ...'
          // },
        })
        .histogram('histogram', hist, {
          innerRadius: 1.01,
          outerRadius: 1.2,
          color: 'OrRd',
          events: {
            'click': (d, i, nodes, e)=>{
              const make = annoInstance.annotations([{
                type: d3.annotationCalloutCircle,
                color: "#E8336D",
                note: {
                  label: "region_id: 3,  version: 56",
                  title: "Flow Bytes Info",
                  wrap: 150,
                },
                x: e.pageX, y: e.pageY,
                dy: -40, dx: 40,
                subject: { radius: 10, radiusPadding: 2 }
              }])

              d3.select("svg")
                .append("g")
                .attr("class", "annotation-group")
                .call(make)
            },
          }
        })
        .histogram('histogram1', hist1, {
          innerRadius: 1.01,
          outerRadius: 1.2,
          color: 'GnBu',
        })
        .text('text', text, {
          innerRadius: 1.1,
          outerRadius: 1.2,
          style: {
            'font-size': 18,
            fill: 'pink',
            opacity: 1,
          },
        })
        .render()

      setTimeout(() => {
        // const count = _.random(15, 30)
        // const length = document.querySelectorAll('path.tile').length
        // _.forEach(_.range(count), i => {
        //   try{
        //     document
        //       .querySelectorAll('path.tile')
        //       [_.random(0, length)].appendChild(createHotpotEffect())
        //   }catch(e) {}
        // })
        d3.selectAll('.hotspot-blink').remove()
        hotSpots.forEach(s=>{
          _.forEach(s.spots, i=>{
            try{
              const tiles = document.querySelectorAll(`.stacks #block-${s.id} path.tile`)
              tiles[_.random(0, tiles.length -1)].appendChild(createHotpotEffect())
            }catch(e){}
          })
        })
      }, 16)
    }

    drawCircos()

    timerHandler.intervalUpdateTimer = setInterval(drawCircos, 6000)
    window.drawCircos = drawCircos

    d3.select(document).on('visibilitychange', function(){
      console.log('is runing visibilitychange')
      clearInterval(timerHandler.intervalUpdateTimer);
      if(document.hidden) {
        clearInterval(timerHandler.intervalUpdateTimer);
      } else {
        drawCircos()
        timerHandler.intervalUpdateTimer = setInterval(drawCircos, 6000)
      }
    });
  },
  methods: {
    startHacking() {
      console.log('doing')
    },
  },
}
</script>

<style>
#app {
  font-family: Helvetica, sans-serif;
  text-align: center;
}
.chord.follower {
  stroke-width: 3;
  stroke-dasharray: 500;
  stroke-dashoffset: 500;
  animation: dash 3s linear forwards;
  animation-iteration-count: infinite;
}
.chord.leader{

}
.histogram .bin, .histogram1 .bin {
  animation: tada 3s linear forwards;
  animation-iteration-count: infinite;
}
@keyframes tada {
   0% {transform: scale(1);}
   10%, 20% {transform: scale(0.99) rotate(-0.2deg);}
   30%, 50%, 70%, 90% {transform: scale(1.02) rotate(0.2deg);}
   40%, 60%, 80% {transform: scale(1.02) rotate(-0.2deg);}
   100% {transform: scale(1) rotate(0);}
}

@keyframes dash {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes slideInUp {
  from {
    transform: translate3d(-100%, 0, 0);
    visibility: visible;
  }

  to {
    transform: translate3d(0, 0, 0);
  }
}

.slideInUp {
  animation-duration: 1s;
animation-fill-mode: both;
animation-iteration-count: 1;
  animation-name: slideInUp;
}

@keyframes slideOutDown {
  from {
    transform: translate3d(0, 0, 0);
    opacity: 1;
  }

  to {
    visibility: hidden;
    opacity: 0;
    transform: translate3d(100%, 0, 0);
  }
}

.slideOutDown {
  animation-duration: 1s;
animation-fill-mode: both;
animation-iteration-count: 1;
  animation-name: slideOutDown;
}

</style>
