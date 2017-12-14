import Vue from "vue";

const d3Base = require('d3')
const annotation = require('d3-svg-annotation')
import Circos from './circos'
import { interpolateYlGn, interpolateGreens } from 'd3-scale-chromatic'
import _ from 'lodash'
import axios from 'axios'

let d3 = Object.assign(d3Base, annotation,
  { interpolateYlGn, interpolateGreens}
)

window.d3 = d3

export {
  d3, Circos, _, axios
}
