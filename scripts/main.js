//wrapper width and height
var width = 600,
    height = 500;

// create tooltip
var div = d3.select('#wrapper')
  .append("div")  
  .attr("class", "tooltip")        
  .style("opacity", 0);      

//Map projection
var projection = d3.geo.mercator()
    .scale(300)
    .center([-135.77330276459485,75.44927205499978]) //projection center
    .translate([width/10,height/10]) //translate to center the map in view

//Generate paths based on projection
var path = d3.geo.path()
    .projection(projection);

//Create an SVG and append to wrapper
var svg = d3.select("#wrapper")
    .append("svg")
    .attr("width", width)
    .attr("height", height)

//Group for the map features
var features = svg.append("g")
    .attr("class","features")

//Create zoom/pan listener
//Change [1,Infinity] to adjust the min/max zoom scale
var zoom = d3.behavior.zoom()
    .scaleExtent([1, Infinity])
    .on("zoom",zoomed);

svg.call(zoom);

//use queue library to load data togetger so it can be combined
queue()
  .defer(d3.json, "/scripts/newcensus3.geojson")
  .defer(d3.json, "/scripts/data.json")
  .await(ready);

// put intial data on the map
// loop through the geojson, find matches between the two IDs and save to result. Use parseInt to ensure integers
// if the ID is in both files, participants becomes the value from the other file
// otherwise set the values to zero
// create a path for each map feature in the data & add to map
// use the color range for the fill
function ready(error, geo, data) {
  if (error) throw error;
  var geo2 = geo.features;
  geo2.forEach(function(mapdata){
    var result = data.filter(function(responses) {
        return parseInt(responses.id) === parseInt(mapdata.properties.CENSUSID);
    });
    if (result[0]!== undefined){
      mapdata.participants = result[0].value;
      mapdata.participantsperpop = mapdata.participants / mapdata.properties.population;
    }
    else {
      mapdata.participants = 0;
      mapdata.participantsperpop = 0;
    }
  });

  var dataArray = [];
  for (var d = 0; d < geo2.length; d++) {
    dataArray.push(parseFloat(geo2[d].participantsperpop))
  }
  var domainpicker = chroma.limits(dataArray, 'k', 7);
  var color = chroma.scale(["#fcfbfd", "#3f007d"])
      .domain(domainpicker);

  features.selectAll("path")
    .data(geo2)
    .enter()
    .append("path")
    .attr("d",path)
    .style("fill", function(d) {
      return color(d.participantsperpop); 
    })
    .on("mouseover",tooltip)
    .on("mouseout",tooltipout);
    legendgenerator(domainpicker, color);
    updateData(geo2);
}

// on click of button, change the data on the map by updating the domain, colors and fill
function updateData(geo2){
  $("input").click(function(){
    var updatedata = $(this).val();
    dataArray = []

    if (updatedata === "participants") {
      for (var d = 0; d < geo2.length; d++) {
        dataArray.push(parseFloat(geo2[d].participants))
      }
      domainpicker = chroma.limits(dataArray, 'k', 7);
      color = chroma.scale(["#fcfbfd", "#3f007d"])
          .domain(domainpicker);
      features.selectAll("path")
        .style("fill", function(d) {
          return color(d.participants); 
        })
        legendgenerator(domainpicker, color);
    }
    else {
      for (var d = 0; d < geo2.length; d++) {
        dataArray.push(parseFloat(geo2[d].participantsperpop))
      }
      domainpicker = chroma.limits(dataArray, 'k', 7);
      color = chroma.scale(["#fcfbfd", "#3f007d"])
          .domain(domainpicker);
      features.selectAll("path")
        .style("fill", function(d) {
          return color(d.participantsperpop); 
        })
        legendgenerator(domainpicker, color);
    } 
  });
}

// generate legend based on colors picked and data
function legendgenerator(domainpicker, color){
  $(".legend").empty();
  $(".legend").append("<p>Legend</p>");
  for (i=0; i < domainpicker.length; i++) {
    var legendcolor = color(domainpicker[i]).css();
    $(".legend").append(
      "<div class='legendcontainer'>" +
      "<div class='legendpiece' style='background:" + legendcolor + "'></div>" 
      + "<span>" + parseFloat(domainpicker[i].toFixed(6)) + "</span>"
      + "</div>"
      );
  }
}

// onclick/mousein/mouseout events with access to d
function tooltip(d,i) {
  div.transition()   
  .duration(200)    
  .style("opacity", 1);   
  div.html("<strong class='title'>"+d.properties.censusinfo_GeographicName + 
    "</strong><br>Participants / population: " + parseFloat(d.participantsperpop.toFixed(6)) + 
    "<br> Participants: " + d.participants + 
    "<br> Population: " + d.properties.population) 
     .style("left", (d3.event.pageX) + "px")    
     .style("top", (d3.event.pageY) + "px");  
}

function tooltipout(d,i) {
  div.transition()    
      .duration(500)    
      .style("opacity", 0); 
}

//Update map on zoom/pan
function zoomed() {
  features.attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")")
      .selectAll("path").style("stroke-width", 0.5 / zoom.scale() + "px" );
}
