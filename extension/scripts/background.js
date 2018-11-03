
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
  let supportedProtocols = ["https:", "http:", "ftp:", "file:"];
  let url = document.createElement('a');
  url.href = urlString;
  return supportedProtocols.indexOf(url.protocol) != -1;
}

//check db for link
async function checkLink(link) {
  let response = await fetch('http://localhost:60381/check', { method: 'POST', mode: 'cors', body: link});
  let body = await response.json();
  return body['faved'];
}

//checks if url is in db
async function updateActiveTab(tabs) {
  let activeTab = await browser.tabs.query({active: true, currentWindow: true});
  
  if (activeTab[0]) {
    let currentTab = activeTab[0];
    if (checkProtocol(currentTab.url)) {
      let faved = await checkLink(currentTab.url);
      updateIcon(faved, currentTab);
    } 
  }
}

//listeners
browser.tabs.onUpdated.addListener(updateActiveTab);
browser.tabs.onActivated.addListener(updateActiveTab);
browser.windows.onFocusChanged.addListener(updateActiveTab);

// update when the extension loads initially
updateActiveTab();
