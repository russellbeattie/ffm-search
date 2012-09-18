
const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/Services.jsm");

function loadIntoWindow(window) {
  if (!window){
    return;
  }

  window.dump('Loading Window');

  window.SelectionHandler.showContextMenu = function(aX, aY) {
    let [SELECT_ALL, COPY, SHARE, SEARCH] = [0, 1, 2, 3];
    let listitems = [
      { label: window.Strings.browser.GetStringFromName("contextmenu.selectAll"), id: SELECT_ALL },
      { label: window.Strings.browser.GetStringFromName("contextmenu.copy"), id: COPY },
      { label: window.Strings.browser.GetStringFromName("contextmenu.share"), id: SHARE },
      { label: "Search", id: SEARCH }
    ];

    let msg = {
      gecko: {
        type: "Prompt:Show",
        title: "",
        listitems: listitems
      }
    };
    let id = JSON.parse(window.sendMessageToJava(msg)).button;

    switch (id) {
      case SELECT_ALL: {
        let selectionController = window.SelectionHandler._view.QueryInterface(Ci.nsIInterfaceRequestor).
                                             getInterface(Ci.nsIWebNavigation).
                                             QueryInterface(Ci.nsIInterfaceRequestor).
                                             getInterface(Ci.nsISelectionDisplay).
                                             QueryInterface(Ci.nsISelectionController);
        selectionController.selectAll();
        window.SelectionHandler.updateCacheForSelection();
        window.SelectionHandler.positionHandles();
        break;
      }
      case COPY: {
        // Passing coordinates to endSelection takes care of copying for us
        window.SelectionHandler.endSelection(aX, aY);
        break;
      }
      case SHARE: {
        let selectedText = window.SelectionHandler.endSelection();
        window.sendMessageToJava({
          gecko: {
            type: "Share:Text",
            text: selectedText
          }
        });
        break;
      }
      case SEARCH: {
        
        window.dump('Running Search');
      
        let selectedText = window.SelectionHandler.endSelection();
      
        let search = Services.search.currentEngine.getSubmission(selectedText);
                  
        window.BrowserApp.loadURI(search.uri.spec);
        
        break;
      
      }
    }
  }

}

 
// bootstrap template below
 
function unloadFromWindow(window) {
  if (!window)
    return;
}
 
var windowListener = {
  onOpenWindow: function(aWindow) {
    // Wait for the window to finish loading
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    domWindow.addEventListener("load", function() {
      domWindow.removeEventListener("load", arguments.callee, false);
      loadIntoWindow(domWindow);
    }, false);
  },
  
  onCloseWindow: function(aWindow) {},
  onWindowTitleChange: function(aWindow, aTitle) {}
};
 
function startup(aData, aReason) {
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
 
  // Load into any existing windows
  let windows = wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    loadIntoWindow(domWindow);
  }
 
  // Load into any new windows
  wm.addListener(windowListener);
}
 
function shutdown(aData, aReason) {
  // When the application is shutting down we normally don't have to clean
  // up any UI changes made
  if (aReason == APP_SHUTDOWN)
    return;
 
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
 
  // Stop listening for new windows
  wm.removeListener(windowListener);
 
  // Unload from any existing windows
  let windows = wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    unloadFromWindow(domWindow);
  }
}
 
function install(aData, aReason) {}
function uninstall(aData, aReason) {}
