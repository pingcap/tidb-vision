var myCircos = new Circos({
  container: "#chart",
  width: 960,
  height: 960
});

var configuration = {
  innerRadius: 250,
  outerRadius: 300,
  cornerRadius: 10,
  gap: 0.04, // in radian
  labels: {
    display: true,
    position: "center",
    size: "14px",
    color: "#000000",
    radialOffset: 20
  },
  ticks: {
    display: true,
    color: "grey",
    spacing: 10000000,
    labels: true,
    labelSpacing: 10,
    labelSuffix: "Mb",
    labelDenominator: 1000000,
    labelDisplay0: true,
    labelSize: "10px",
    labelColor: "#000000",
    labelFont: "default",
    majorSpacing: 5,
    size: {
      minor: 2,
      major: 5
    }
  },
  events: {}
};

var data = [
  { len: 400, color: "#8dd3c7", label: "January", id: "january" },
  { len: 28, color: "#ffffb3", label: "February", id: "february" },
  { len: 31, color: "#bebada", label: "March", id: "march" },
  { len: 31, color: "#bc80bd", label: "October", id: "october" },
  { len: 30, color: "#ccebc5", label: "November", id: "november" },
  { len: 31, color: "#ffed6f", label: "December", id: "december" }
];

myCircos.layout(data, configuration);

myCircos.render();
