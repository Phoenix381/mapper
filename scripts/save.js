//taggle text field with tag support
var field = new Taggle('tags', {placeholder: "Enter tags here", duplicateTagClass: 'bounce'});
var container = field.getContainer();
var input = field.getInput();

var currentBookmark;
var activeTab;

document.getElementById("save").addEventListener("click", saveClick);

//update based on currentBookmark var
function updateIcon(status, tab) {
  browser.browserAction.setIcon({
    path: status ? {
      19: "icons/star-filled-19.png",
      38: "icons/star-filled-38.png"
    } : {
      19: "icons/star-empty-19.png",
      38: "icons/star-empty-38.png"
    },
    tabId: tab.id
  });
}

//check if protocol is supported
function checkProtocol(urlString) {
  var supportedProtocols = ["https:", "http:", "ftp:", "file:"];
  var url = document.createElement('a');
  url.href = urlString;
  return supportedProtocols.indexOf(url.protocol) != -1;
}

//check db for link
async function loadTags(link) {
  let response = await fetch('http://localhost:60381/load', { method: 'POST', mode: 'cors', body: link});
  let body = await response.json();
  // console.log(['tags'].values());
  if (body['faved'] == 'true') {
    currentBookmark = true;
    for (let tag of body['tags'])
      field.add(tag);
  }
}

//tag list
async function tagList() {
  let response = await fetch('http://localhost:60381/tagList', { method: 'POST', mode: 'cors'});
  let body = await response.json();
  return body['tags'];
}

//checks if url is in db
async function initTags() {
  activeTab = await browser.tabs.query({active: true, currentWindow: true});
  if (activeTab[0])
    if (checkProtocol(activeTab[0].url))
      await loadTags(activeTab[0].url);

  let tagCompl = await tagList();
  //tag autocompletion
  $(input).autocomplete({
    source: tagCompl, // See jQuery UI documentaton for options
    appendTo: container,
    position: { at: "left bottom", of: container },
    select: function(event, data) {
        event.preventDefault();
        //Add the tag if user clicks
        if (event.which === 1) {
            field.add(data.item.value);
        }
    }
  });
  
  //set focus on input field
  input.focus();
}

//Save button click
//todo: favicons
async function saveClick() {
  if (currentBookmark == true)
    await removeBookmark();
  else 
    await saveBookmark();

  updateIcon(currentBookmark, activeTab[0]);
}

async function removeBookmark() {
  let response = await fetch('http://localhost:60381/remove', { method: 'POST', mode: 'cors', body:activeTab[0].url});

  currentBookmark = false;
}

async function saveBookmark() {
  let payload = JSON.stringify( {url:activeTab[0].url, title:activeTab[0].title, tags:field.getTagValues()} );
  let response = await fetch('http://localhost:60381/save', { method: 'POST', mode: 'cors', body:payload});

  currentBookmark = true;
}

initTags();
