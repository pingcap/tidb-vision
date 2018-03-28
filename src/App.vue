<template>
  <div id="app">
    <div id="circos-chart"></div>
    <div class="info-container info-host"></div>
    <svg class="info-container info-legend"></svg>
    <div class="info-container info-transfer"></div>
  </div>
</template>

<script>

import {
  d3, _, axios, Circos
} from './vendor'

import {createHotpotEffect, sampleValFn, rgbToHex} from './helper'

/* Constant */
let PDHOST = location.host
if(location.search && location.search.startsWith('?url=')) {
  PDHOST = location.search.replace('?url=', '')
}
const PDAPI = `http://${PDHOST}/pd/api/v1`

let timerHandler = {
    intervalUpdateTimer : null
}

let layerCount, thickness, hotSpots = [], lastDataM = {}
const STACKPIXEL = 160;
async function genStores() {
  // try catch, status need 200
  let {status, data} = await axios({
    url: `${PDAPI}/trend`,
  })

  // filter out down store
  data.stores = data.stores.filter(s=>s.state_name != 'Down')

  // debugger;
  hotSpots = data.stores.map(i=>{
    let s = {
      id: 'store'+i.id,
      spots: []
    }
    for(let t of ['hot_write_region_flows', 'hot_read_region_flows']) {
      i[t] && i[t].forEach(value=>{
        s.spots.push({
          type:'peer',
          io: t,
          value
        })
      })
    }
    return s
  })


  data.stores = data.stores.map(i=>{
    i.all_count = Math.ceil(i.capacity / ((i.capacity - i.available) / i.region_count))
    return i
  })
  const regionCList = _.map(data.stores, 'all_count')
  const total = _.sum(regionCList)
  var max = _.max(regionCList)
  var min = _.min(regionCList)
  layerCount = Math.ceil(Math.sqrt(total / 13))

  const storeM = {}
  let labels = data.stores.map((i, idx) => {
    const {leader_count, region_count} = i
    const {hot_write_flow, hot_read_flow, hot_write_region_flows, hot_read_region_flows,} = i
    return {
      len: i.all_count/layerCount,
      ratio: 1 - i.available/i.capacity,
      label: `Store ${i.id}`, // ${i.address}, with speed ${_.random(100, 900)}kbs
      id: 'store' + i.id,
      _id: i.id,
      hot_write_flow, hot_read_flow,
      hot_write_region_flows, hot_read_region_flows,
      leader_count,
      region_count
    }
  })
  // labels.sort((a,b)=>Math.random()-0.5)
  labels.sort((a,b)=>a._id-b._id)
  labels.forEach(i=>{
    storeM[i._id] = i
  })

  labels.forEach(i => {
    i.color = 'url(#mainGradient)'
    /*rgbToHex(d3.interpolateGreens(
      0.2+(i.region_count-min)/(max == min ? 1 : max-min)*(0.8-0.2)
    ))*/
  })


  let text = []
  text = _.map(labels, s => {
    const t = v=> v > 0 ? ('+'+v) : (''+v)
    const b = lastDataM[s._id]
    const rdiff = b ? (s.region_count - b.region_count) : 0
    const ldiff = b ? (s.leader_count - b.leader_count) : 0
    const has = rdiff && ldiff
    return {
      block_id: s.id,
      position: s.len/2,
      value: has ? `Region: ${t(rdiff)}\n Leader: ${t(ldiff)}`.split('\n') : ''
    }
  })


  // value: not used: 0, region: 1000, leader: 2000
  // thickness and layer count : (117.8((780/2-80)*0.38) = x*y)
  thickness = STACKPIXEL / layerCount
  let stacks = []
  if(!stacks.stores) stacks.stores = {}
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
          if(item.value === 0) {
            item.type = 'empty'
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

  // 动态根据 store 数量和
  let chords = _.map(data.history.entries, i=>{
    const pix = ()=>{
      return 0.5 + 0.2 * i.count
      // return 0.2 + (layerCount > 50) ? 0.8 : layerCount/50*0.8
    }
    const s = storeM[i.from]
    const t = storeM[i.to]
    const w = pix()
    const start = _.random(0, s.len*s.ratio-w)
    const start1 = t ? _.random(0, t.len*t.ratio-w) : 2
    return {
      type: i.kind,
      source: {
        id: 'store'+i.from,
        start,
        end: start + w,
      },
      target: {
        id: 'store'+i.to,
        start: start1,
        end: start1 + w,
      },
    }
  })
  // console.log('chords is: ', chords)

  // write hist
  let hist = []
  _.forEach(labels, s => {
    let flows = s.hot_write_region_flows
    s.hot_write_flow && hist.push({
      start: 0,
      end: 2,
      block_id: s.id,
      value: s.hot_write_flow
    })
    flows && flows.forEach((value, i) => {
      hist.push({
        start: i + 2,
        end: i + 3,
        block_id: s.id,
        value
      })
    })
  })
  // console.log('hisogram is: ', hist)

  let hist1 = []
  _.forEach(labels, s => {
    let flows = s.hot_read_region_flows
    s.hot_read_flow && hist1.push({
      start: s.len - 2,
      end: s.len,
      block_id: s.id,
      value: s.hot_read_flow
    })
    flows && flows.forEach((value, i) => {
      hist1.push({
        start: s.len - i - 3,
        end: s.len - i - 2,
        block_id: s.id,
        value
      })
    })
  })
  // console.log('hisogram is: ', hist1)

  labels.forEach(i=>{
    lastDataM[i._id] = i
  })
  return {labels, stacks, chords, hist, hist1, text}
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

      const {labels, stacks, chords, hist, hist1, text} = await genStores()

      var width = 980
      if (!pdVisInstance) {
        pdVisInstance = new Circos({
          container: '#circos-chart',
          width: width * 1.2,
          height: width * 1.2,
        })

        var svgDefs = d3.select('#circos-chart svg').append('defs');
        const c1 = rgbToHex(d3.interpolateGreens(0.1))
        const c2 = rgbToHex(d3.interpolateGreens(0.5))
        var mainGradient = svgDefs.append('linearGradient')
            .attr('id', 'mainGradient');
        // Create the stops of the main gradient. Each stop will be assigned
        // a class to style the stop using CSS.
        mainGradient.append('stop')
            .attr('stop-color', c1)
            .attr('offset', '0');
        mainGradient.append('stop')
            .attr('stop-color', c2)
            .attr('offset', '1');
      }

      const layoutConf = {
        innerRadius: width / 2 - 80,
        outerRadius: width / 2 - 30,
        ticks: { display: true },
        shape: 'square',
        events: {
          click: (d, i, nodes, e) => {
            return
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
            }]).editMode(true)

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
        d3.selectAll('.hotspot-blink').remove()
        hotSpots.forEach(s=>{
          _.forEach(s.spots, i=>{
            try{
              const tiles = document.querySelectorAll(`.stacks #block-${s.id} path.tile:not(.empty)`)
              tiles[_.random(0, tiles.length -1)].appendChild(createHotpotEffect())
            }catch(e){}
          })
        })
      }, 16)
    }

    drawCircos()

    timerHandler.intervalUpdateTimer = setInterval(drawCircos, 6000)
    window.drawCircos = drawCircos

    // https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
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

    // var quantize = d3.scaleQuantize()
    //   .domain([ 0, 0.15 ])
    //   .range(d3.range(9).map(function(i) { return "q" + i + "-9"; }));
    //
    // var svg = d3.select(".info-legend");
    //
    // svg.append("g")
    //   .attr("class", "legendQuant")
    //   .attr("transform", "translate(20,20)");
    //
    // var legend = d3.legendColor()
    //   .labelFormat(d3.format(".2f"))
    //   .useClass(true)
    //   .title("A really really really really really long title")
    //   .titleWidth(100)
    //   .scale(quantize);
    //
    // svg.select(".legendQuant")
    //   .call(legend);
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
/*.cs-layout .layout-path {
    stroke-width: 3;
  stroke-dasharray: 10;
  animation: dash2 2s linear;
  animation-iteration-count: 1;
  stroke: black;
}
@keyframes dash2 {
  to {
    stroke-dashoffset: 2000;
    stroke: inherit;
  }
}*/
.chord.region {
  stroke-width: 3;
  stroke-dasharray: 500;
  stroke-dashoffset: 500;
  animation: dash 3s linear forwards;
  animation-iteration-count: infinite;
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
