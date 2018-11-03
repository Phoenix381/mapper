//tag list
async function tagList() {
  let response = await fetch('http://localhost:60381/tagList', { method: 'POST', mode: 'cors'});
  let body = await response.json();
  return body['tags'];
}


//parsing tag tree
async function getTree() {
  let response = await fetch('http://localhost:60381/getTree', { method: 'POST', mode: 'cors'});
  let flatData = await response.json();
  flatData.unshift({ name: "Top Level", parent: null });

  // convert the flat data into a hierarchy 
  var treeData = d3.stratify()
  .id(function(d) { return d.name; })
  .parentId(function(d) { return d.parent; })
  (flatData);

  // assign the name to each node
  treeData.each(function(d) {
    d.name = d.id;
  });

  return treeData;
}

//drawing tree
function drawTree(treeData) {
  // set the dimensions and margins of the diagram
  var margin = {top: 20, right: 90, bottom: 30, left: 90},
      width = 660 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  // declares a tree layout and assigns the size
  var treemap = d3.tree()
      .size([height, width]);

  //  assigns the data to a hierarchy using parent-child relationships
  var nodes = d3.hierarchy(treeData, function(d) {
      return d.children;
    });

  // maps the node data to the tree layout
  nodes = treemap(nodes);

  // append the svg object to the body of the page
  // appends a 'group' element to 'svg'
  // moves the 'group' element to the top left margin
  var svg = d3.select("#map").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom),
      g = svg.append("g")
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");

  // adds the links between the nodes
  var link = g.selectAll(".link")
      .data( nodes.descendants().slice(1))
    .enter().append("path")
      .attr("class", "link")
      .attr("d", function(d) {
         return "M" + d.y + "," + d.x
           + "C" + (d.y + d.parent.y) / 2 + "," + d.x
           + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
           + " " + d.parent.y + "," + d.parent.x;
         });

  // adds each node as a group
  var node = g.selectAll(".node")
      .data(nodes.descendants())
    .enter().append("g")
      .attr("class", function(d) { 
        return "node" + 
          (d.children ? " node--internal" : " node--leaf"); })
      .attr("transform", function(d) { 
        return "translate(" + d.y + "," + d.x + ")"; });

  // adds the circle to the node
  node.append("circle")
    .attr("r", 10);

  // adds the text to the node
  node.append("text")
    .attr("dy", ".35em")
    .attr("x", function(d) { return d.children ? -13 : 13; })
    .style("text-anchor", function(d) { 
      return d.children ? "end" : "start"; })
    .text(function(d) { return d.data.name; });

  node.on("click", function(d) {
    if (!d3.select(this).classed("selected") ) {
      //deselect all nodes
      d3.selectAll(".node").classed("selected", false);
      d3.selectAll(".node").transition().attr("stroke","none");
      //set controls
      document.getElementsByClassName("controls")[0].innerHTML = `
        <div id="delete" class="button">Remove tag</div>
        <div id="save" class="button">Save</div>
        <div id="parent">Parent node: <input id="textbox" type="text" value="`+d.data.data.parent+`"></div>`;
      //save button click
      document.getElementById("save").addEventListener("click", function(){
        updateTag(d.data.data.name, document.getElementById("textbox").value);
      });
      //delete button click
      document.getElementById("delete").addEventListener("click", function(){
        if (d.data.data.name == 'Top Level')
          alert('You simply can`t.');
        else
          if (confirm("Are you sure?"))
            deleteTag(d.data.data.name);
      });
      //select node and load links
      d3.select(this).classed("selected", true);
      d3.select(this).transition().attr("stroke","steelblue");
      openTag(d.data.data.name);
    }
  });
}

async function openTag(tag) {
  let response = await fetch('http://localhost:60381/loadTag', { method: 'POST', mode: 'cors', body:tag});
  let links = await response.json();

  //remove all links
  document.getElementById("list").innerHTML = null;

  for (let link of links) {
    let div = document.createElement('div');
    div.setAttribute('class', 'link');

    let img = document.createElement('img');
    img.setAttribute('src', link.icon);
    div.appendChild(img);

    let a = document.createElement('a');
    a.setAttribute('href', link.url);
    a.innerHTML = link.title;
    div.appendChild(a);

    document.getElementById("list").appendChild(div);
  }
}

async function openTab() {
  let response = await fetch('http://localhost:60381/loadTag', { method: 'POST', mode: 'cors', body:'show'});
  let links = await response.json();

  for (let link of links) {
    let div = document.createElement('div');
    div.setAttribute('class', 'biglink');

    let img = document.createElement('img');
    img.setAttribute('src', link.icon);
    div.appendChild(img);

    let a = document.createElement('a');
    a.setAttribute('href', link.url);
    a.innerHTML = link.title;
    div.appendChild(a);

    document.getElementById("tab").appendChild(div);
  }
}

async function updateTag(tag, parent) {
  let payload = JSON.stringify( {tag:tag, parent:parent} );
  let response = await fetch('http://localhost:60381/updateTag', { method: 'POST', mode: 'cors', body:payload});

  treeMode();
}

async function deleteTag(tag) {
  let response = await fetch('http://localhost:60381/deleteTag', { method: 'POST', mode: 'cors', body:tag});

  treeMode();
}

//TODO edit link tags
function openLink(link) {

}

function updateLink(link, tags) {

}

function treeMode() {
  document.getElementById("display").innerHTML = `
    <div id="map"></div>
    <div id="list"></div>`;
  document.getElementById("display").setAttribute('class', 'sides');

  document.getElementsByClassName("controls")[0].innerHTML = '';

  getTree()
  .then((treeData) => drawTree(treeData));
}

function tabMode() {
  document.getElementById("display").innerHTML = `
    <div id="tab"></div>`;
  document.getElementById("display").setAttribute('class', 'full');

  document.getElementsByClassName("controls")[0].innerHTML = '';

  openTab();
}

var mode = true;

function changeMode() {
  if (mode) {
    treeMode();
    mode = false;
  } else {
    tabMode();
    mode = true;
  }

}

document.getElementById("mode").addEventListener("click", changeMode);

tabMode();
