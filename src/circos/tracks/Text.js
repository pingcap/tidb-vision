import Track from './Track'
import {parsePositionTextData} from '../data-parser'
import forEach from 'lodash/forEach'
import assign from 'lodash/assign'
import {common, radial} from '../configs'

const defaultConf = assign({
  style: {
    value: {},
    iteratee: true
  },
  color: {
    value: 'black',
    iteratee: true
  },
  backgrounds: {
    value: [],
    iteratee: false
  }
}, common, radial)

export default class Text extends Track {
  constructor (instance, conf, data) {
    super(instance, conf, defaultConf, data, parsePositionTextData)
  }

  renderDatum (parentElement, conf, layout) {
    let text = parentElement.selectAll('g')
      .data(d => d.values.map((item) => {
        item._angle = this.theta(
          item.position,
          layout.blocks[item.block_id]
        ) * 360 / (2 * Math.PI) - 90
        item._anchor = item._angle > 90 ? 'end' : 'start'
        item._rotate = item._angle > 90 ? 180 : 0
        return item
      }), d => JSON.stringify(d.value))
      text.exit().attr('class', 'slideOutDown').transition().delay(1000).remove()

      text = text.enter().append('g')
      .attr('class', 'slideInUp')
      .append('text')
      .attr('transform', (d) => {
        return `
          rotate(${d._angle})
          translate(${conf.innerRadius}, 0)
          rotate(${d._rotate})
        ` // rotate(${d._angle}) rotate(${d._rotate})
      })
      .attr('text-anchor', (d) => d._anchor)
      .selectAll('tspan')
      .data(d=>d.value).enter().append('tspan')
      .text(d=>d).attr('x', 0).attr('dy', '1.2em')

      text.exit().transition().delay(2000).attr('class', 'slideInUp').remove()

    forEach(conf.style, (value, key) => {
      text.style(key, value)
    })
    return text
  }
}
