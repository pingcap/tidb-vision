
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


export {createHotpotEffect, sampleValFn, rgbToHex}
