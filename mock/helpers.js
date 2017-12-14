
const _merge = require('lodash.merge')

function merge(def, over) {
  return _merge({}, def, over)
}
/*
  helper for easy usage
  field can be function, which will be call
 */
function iterObj(obj) {
  const ret = Object.assign(Array.isArray(obj) ? [] : {}, obj)
  for (var key in obj) {
    if (obj[key] == null) continue
    if (typeof obj[key] === 'object') {
      ret[key] = iterObj(obj[key])
    }
    if (typeof obj[key] === 'function') {
      ret[key] = obj[key]()
    }
  }
  return ret
}

function jsonSend(data, code = 200, message = null) {
  return (req, res, next) => {
    res.send(iterObj(data))
  }
}

function variety(defVal, mapVals) {
  return (req, res, next) => {
    const type = req.query._type
    let _ret = type && mapVals[type] ? mapVals[type] : defVal
    if (!_ret.code) {
      // _ret = { data: _ret }
      _ret = {
        payload: _ret,
      }
    }
    // const ret = merge({ code: 200, message: null }, _ret)
    const ret = merge(
      {
        action: '',
        status_code: 200,
        message: null,
      },
      _ret
    )
    res.send(iterObj(ret))
  }
}

exports = module.exports = {
  merge, variety, iterObj, jsonSend
}
