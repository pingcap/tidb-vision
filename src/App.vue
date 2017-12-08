<template>
  <div id="app">
    <!-- <svg width="1200" height="960" font-family="sans-serif" font-size="10" text-anchor="middle"></svg> -->
    <div id="circos-chart">
    </div>
    <div class="info-container info-host"></div>

      <div class="info-container info-metric"></div>

        <div class="info-container info-transfer"></div>

      <!-- <button @click="startHacking">Start</button> -->
    </div>
  </div>
</template>

<script>
const PDHOST = location.host
const PDAPI = `http://${PDHOST}/pd/api/v1`


const d3Base = require('d3')
const annotation = require('d3-svg-annotation')
// import "d3-hierarchy";
import Circos from './circos/src/circos'
import { interpolateYlGn } from 'd3-scale-chromatic'
import _ from 'lodash'
import axios from 'axios'

let d3 = Object.assign(d3Base, annotation, { interpolateYlGn })
let layerCount

async function genStores() {
  // try catch, status need 200
  let {status, data} = await axios({
    url: `${PDAPI}/stores`,
  })

  console.log(data)
  data = {count: 3, stores: [{
    store: {
      address: "172.16.10.50:20160",
      id: 5,
    },
    status: {
      leader_count: 6,
      region_count: 19,
      all_count: 20,
    }
  }, {
    store: {
      address: "172.16.10.50:20160",
      id: 4,
    },
    status: {
      leader_count: 8,
      region_count: 19,
      all_count: 20,
    }
  }, {
    store: {
      address: "172.16.10.50:20160",
      id: 2,
    },
    status: {
      leader_count: 5,
      region_count: 19,
      all_count: 20,
    }
  }]}

  const total = _.sum(_.map(data.stores, 'status.all_count'))
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
    i.color = rgbToHex(d3.interpolateYlGn((i.len - 27) / 7))
    // delete i.color;
  })
  return r
}

function sampleValFn(p) {
  const v = Math.random()
  if (v < p) {
    return 2000
  }
  // else if (v > 0.9) {
  //   // 0.1 possible un used
  //   return 0;
  // }
  return 1000
}

function createHotpotEffect() {
  var i = document.createElementNS('http://www.w3.org/2000/svg', 'animate')
  i.setAttribute('values', '#800;#f00;#800;#800')
  i.setAttribute('dur', '0.8s')
  i.setAttribute('repeatCount', 'indefinite')
  i.setAttribute('attributeType', 'XML')
  i.setAttribute('attributeName', 'fill')
  return i
}

let isInit = false,
  pdVisInstance = null


  // "balance-leader (kind:leader, region:2585, createAt:2017-12-04 18:16:48.935239561 +0800 CST m=+1032.706208536, currentStep:1, steps:[transfer leader from store 2 to store 1]) finished",
  // "balance-leader (kind:leader, region:2565, createAt:2017-12-04 18:16:50.111570579 +0800 CST m=+1033.882539610, currentStep:1, steps:[transfer leader from store 2 to store 5]) finished",
  // "balance-leader (kind:leader, region:2561, createAt:2017-12-04 18:16:50.080836039 +0800 CST m=+1033.851805088, currentStep:1, steps:[transfer leader from store 2 to store 1]) finished",


export default {
  async mounted() {
    const annoInstance = d3.annotation()
    const annoSVG = d3.select("svg.annotation-group")
              .append("g")
              .attr("class", "annotation-group")
    async function drawCircos(error) {
      // document.querySelector('body').style.backgroundColor = 'green'
      //
      // d3
      //   .select('body')
      //   .transition(t)
      //   .style('background-color', function() {
      //     return d3.interpolate('green', 'red')
      //   })

      /*
        Generate regions data
       */

      const labels = await genStores()

      // value: not used: 0, region: 1000, leader: 2000
      // thickness and layer count : (117.8((780/2-80)*0.38) = x*y)

      let stacks = []
      const STACKPIXEL = 160;
      const thickness = STACKPIXEL / layerCount
      labels.forEach(s => {
        let slist = _.shuffle([...Array(s.leader_count).fill(2000), ...Array(s.region_count - s.leader_count).fill(1000)])
        _.range(s.len).forEach(i => {
          _.range(layerCount).forEach(x => {
            let item = {
              block_id: s.id,
              start: i,
              end: i + 1,
              value: slist.pop() || 0  // sampleValFn(0.33),
            }
            // if ((i + 1) * layerCount + x + 1 > s.len * layerCount * 0.8) {
            //   item.value = 0
            // }
            stacks.push(item)
          })
        })
      })
      stacks.columns = ['store', 'start', 'end', 'value']
      // end stacks


      let chords = _.range(_.random(4, 8)).map(i => {
        const list = _.shuffle(labels)
        const source =list[0]
        const start = _.random(0, source.len - 1)
        const target = list[1]
        const start1 = _.random(0, target.len - 1)
        return {
          source: {
            id: source.id,
            start,
            end: start + 1,
          },
          target: {
            id: target.id,
            start: start1,
            end: start1 + 1,
          },
        }
      })
      console.log('chords is: ', chords)

      let line = []
      _.forEach(labels, s => {
        _.forEach(_.range(s.len), i => {
          _.forEach(_.range(10), x => {
            line.push({
              block_id: s.id,
              value: _.random(20, 100),
              position: i + x * 0.1,
            })
          })
        })
      })

      let hist = []
      _.forEach(labels, s => {
        _.forEach(_.range(s.len - 4), i => {
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

            // debugger;
            // d3.select("svg")
            //   .append("g")
            //   .attr("class", "annotation-group")
            //   .call(make)

            d3.select("svg .annotation-group")
              .call(make)

            return false
            const p = nodes[i].parentElement.parentElement
            const g = p.querySelectorAll('.stacks g')[i]
            const t =
              g.attributes.transform.value.slice(0, -1) + 'deg)'.replace('rotate(', 'rotate(-')
            console.log(t)
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
          tooltipContent: function(d) {
            return 'region info'
          },
          events: {
            'click': (d, i, nodes, e)=>{
              console.log('d is ', d, i)
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
        // .line('line', line, {
        //   color: 'green',
        //   opacity: 0.6,
        // })
        .render()

      setTimeout(() => {
        const count = _.random(15, 30)
        const length = document.querySelectorAll('path.tile').length
        _.forEach(_.range(count), i => {
          try{
            document
              .querySelectorAll('path.tile')
              [_.random(0, length)].appendChild(createHotpotEffect())
          }catch(e) {}
        })
      }, 16)
    }

    drawCircos()

    // setInterval(drawCircos, 6000)
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
.chord {
  stroke-width: 5;
  stroke-dasharray: 500;
  stroke-dashoffset: 500;
  animation: dash 3s linear forwards;
  animation-iteration-count: infinite;
}
.histogram .bin {
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
</style>
