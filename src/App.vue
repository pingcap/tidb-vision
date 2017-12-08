<template>
  <div id="app">
    <!-- <svg width="1200" height="960" font-family="sans-serif" font-size="10" text-anchor="middle"></svg> -->
    <div id="chart"></div>
    <div id="circos-chart">
    </div>
    <div>
      <button @click="startHacking">Start</button>
    </div>
  </div>
</template>

<script>
const d3Base = require('d3')
// import "d3-hierarchy";
import Circos from 'circos/src/circos'
import { interpolateYlGn } from 'd3-scale-chromatic'
import 'd3-queue'
import _ from 'lodash'

let d3 = Object.assign(d3Base, { interpolateYlGn })

function genStores() {
  let r = _.range(5).map(i => {
    return {
      len: 28 + +i,
      label: `Store ${i} 10.2.0.${i}, with speed ${_.random(100, 900)}kbs`,
      id: 'store' + i,
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

function sampleValFn() {
  const v = Math.random()
  if (v < 0.33) {
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

var t = d3
  .transition()
  .duration(1750)
  .ease(d3.easeLinear)

export default {
  mounted() {
    function drawCircos(error) {
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

      const labels = genStores()

      // value: not used: 0, region: 1000, leader: 2000
      // thickness and layer count : (117.8((780/2-80)*0.38) = x*y)

      let stacks = []
      const layerCount = 20,
        thickness = 8
      labels.forEach(s => {
        _.range(s.len).forEach(i => {
          _.range(layerCount).forEach(x => {
            let item = {
              block_id: s.id,
              start: i,
              end: i + 1,
              value: sampleValFn(),
            }
            if ((i + 1) * layerCount + x + 1 > s.len * layerCount * 0.8) {
              item.value = 0
            }
            stacks.push(item)
          })
        })
      })
      stacks.columns = ['store', 'start', 'end', 'value']

      let chords = _.range(_.random(4, 8)).map(i => {
        const idx = _.random(0, labels.length - 1)
        const start = _.random(0, labels[idx].len - 3)
        const items = _.pull(_.range(labels.length), idx)
        const idx1 = items[Math.floor(Math.random() * items.length)]
        const start1 = _.random(0, labels[idx1].len - 3)
        return {
          source: {
            id: 'store' + idx,
            start,
            end: start + 1,
          },
          target: {
            id: 'store' + idx1,
            start,
            end: start + 1,
          },
        }
      })

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
            value = _.random(90, 100)
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
            return false
            // console.log(arguments);
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
            return 'this is demo ...'
          },
          events: {
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
          // tooltipContent: function(d) {
          //   return 'move region 1 from store0 to store2 ...'
          // },
        })
        .histogram('histogram', hist, {
          innerRadius: 1.01,
          outerRadius: 1.2,
          color: 'OrRd'
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
          document
            .querySelectorAll('path.tile')
            [_.random(0, length)].appendChild(createHotpotEffect())
        })
      }, 16)
    }

    drawCircos()

    setInterval(drawCircos, 6000)
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
  stroke: red;
  stroke-width: 5;
  stroke-dasharray: 500;
  stroke-dashoffset: 500;
  animation: dash 6s linear forwards;
}
.histogram .bin {
  animation: tada 1s linear forwards;
  animation-iteration-count: infinite;
}
@keyframes tada {
   0% {transform: scale(1);}
   10%, 20% {transform: scale(0.98) rotate(-3deg);}
   30%, 50%, 70%, 90% {transform: scale(1.02) rotate(3deg);}
   40%, 60%, 80% {transform: scale(1.02) rotate(-3deg);}
   100% {transform: scale(1) rotate(0);}
}

@keyframes dash {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
