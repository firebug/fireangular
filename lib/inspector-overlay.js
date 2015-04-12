/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "stable"
};

// Add-on SDK
const self = require("sdk/self");
const { Cu, Ci } = require("chrome");
const { Class } = require("sdk/core/heritage");
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const { on, off } = require("sdk/event/core");

// Firefox Chrome

Cu.import("resource:///modules/devtools/VariablesView.jsm");
Cu.import("resource:///modules/devtools/VariablesViewController.jsm");

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "EnvironmentClient",
   "resource://gre/modules/devtools/dbg-client.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "ObjectClient",
   "resource://gre/modules/devtools/dbg-client.jsm");

// Firebug SDK
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { PanelOverlay } = require("firebug.sdk/lib/panel-overlay.js");
const { Dom } = require("firebug.sdk/lib/core/dom.js");
const { Content } = require("firebug.sdk/lib/core/content.js");

const { Rdp } = require("firebug.sdk/lib/core/rdp.js");
// FireQuery
const { FireAngularFront } = require("./fireangular-front");

// URL of the {@FireAngularActor} module. This module will be
// installed and loaded on the backend.
const options = require("@loader/options");
const actorModuleUrl = options.prefixURI + "lib/fireangular-actor.js";


// Constants
const XHTML_NS = "http://www.w3.org/1999/xhtml";

const VARIABLES_VIEW_URL = "chrome://browser/content/devtools/widgets/VariablesView.xul";

/**
 * @overlay This object represents an overlay for the existing
 * Inspector panel it's responsible for the panel customization.
 * FireAngular is rendering additional info related to jAngular objects.
 */
const InspectorOverlay = Class(
/** @lends InspectorOverlay */
{
  extends: PanelOverlay,

  overlayId: "fireAngularInspectorOverlay",
  panelId: "inspector",

  // Initialization

  initialize: function(options) {
    PanelOverlay.prototype.initialize.apply(this, arguments);

    this.onMarkupViewLoaded = this.onMarkupViewLoaded.bind(this);
    this.onMarkupViewRender = this.onMarkupViewRender.bind(this);
    this.onNodeSelected = this.onNodeSelected.bind(this);
    this.onSidebarReady = this.onSidebarReady.bind(this);
    this.onSidebarSelected = this.onSidebarSelected.bind(this);

    Trace.sysout("InspectorOverlay.initialize;", options);
  },

  destroy: function() {
    Trace.sysout("InspectorOverlay.destroy;", arguments);
  },

  // Overlay Events

  onBuild: function(options) {
    PanelOverlay.prototype.onBuild.apply(this, arguments);

    Trace.sysout("InspectorOverlay.onBuild;", options);

    // Handle MarkupView events.
    this.panel.on("markuploaded", this.onMarkupViewLoaded);
    this.panel.on("markupview-render", this.onMarkupViewRender);
  },

  onReady: function(options) {
    PanelOverlay.prototype.onReady.apply(this, arguments);

    Trace.sysout("InspectorOverlay.onReady;", options);

    this.panel.selection.on("new-node-front", this.onNodeSelected);

    this.target = this.panel.toolbox.target;

    consoleFor(this.target).then( ({webconsoleClient, debuggerClient}) => {
      this.attachDebuggerClient({webconsoleClient, debuggerClient});

      return webconsoleClient;
    }).then((webconsoleClient) => {
      let config = {
        prefix: FireAngularFront.prototype.typeName,
        actorClass: "FireAngularActor",
        frontClass: FireAngularFront,
        moduleUrl: actorModuleUrl
      };

      let client = this.panel.toolbox.target.client;

      // Register as tab actor.
      Rdp.registerTabActor(client, config).then(({registrar, front}) => {
        Trace.sysout("FireAngularToolboxOverlay.attach; READY", this);

        this.front = front;

        // TODO: Unregister at shutdown
        this.registrar = registrar;

        // WORKAROUND: reload the target window if the actor is attached for the first time
        webconsoleClient.evaluateJS("window.location.reload()");
      });
    });
  },

  onMarkupViewLoaded: function() {
    let frame = this.panel._markupFrame;
    let win = frame.contentWindow;

    loadSheet(win, "chrome://fireangular/skin/fireangular.css", "author");
  },

  onMarkupViewRender: function(eventId, node, type, data, options) {
    if (type != "element") {
      return;
    }

    if (data.node._form.hasAngularScopeData && !node.querySelector(".fireAngularScopeData")) {
      let doc = node.ownerDocument;
      let icon = doc.createElementNS(XHTML_NS, "i");
      icon.className = "fireAngularScopeData";
      node.appendChild(icon);
    }
  },

  onNodeSelected: function() {
    // Bail out if the panel is destroyed.
    if (!this.panel.toolbox) {
      return;
    }

    Trace.sysout("inspectorOverlay.onNodeSelected;",
                 this.panel.selection);

    this.updateAngularSidebar(this.panel.selection.nodeFront);
  },

  setupAngularSidebar: function() {
    if (this.panel && this.panel.sidebar) {
      this.sidebar = this.panel.sidebar;
    }

    if (this.sidebar) {
      this.sidebar.on("fireangular-ready", this.onSidebarReady);
      this.sidebar.on("fireangular-selected", this.onSidebarSelected);
      this.sidebar.addTab("fireangular", VARIABLES_VIEW_URL, false);
      this.panel.sidebar.toggleTab(false, "fireangular");
    }
  },

  onSidebarReady: function() {
    let tab = this.panel.sidebar._tabs.get("fireangular");
    tab.setAttribute("label", "FireAngular");

    this.sidebarTab = tab;

    let tabWin = this.panel.sidebar.getWindowForTab("fireangular");

    let container = tabWin.document.querySelector("#variables");
    let target = this._target;

    let variablesView = this._variablesView = new VariablesView(container, {
      searchEnabled: true,
      searchPlaceholder: "Search..."
    });

    var debuggerClient = this._debuggerClient;

    VariablesViewController.attach(this._variablesView, {
      getEnvironmentClient: aGrip => {
        return new EnvironmentClient(debuggerClient, aGrip);
      },
      getObjectClient: aGrip => {
        return new ObjectClient(debuggerClient, aGrip);
      },
      getLongStringClient: aActor => {
        return webConsoleClient.longString(aActor);
      },
      releaseActor: aActor => {
        debuggerClient.release(aActor);
      }
    });

    this.updateAngularSidebar();
  },
  onSidebarSelected: function() {
    this.updateAngularSidebar();
  },

  updateAngularSidebar: function(nodeFront) {
    let panel = this.panel;
    let sidebarTab = this.sidebarTab;

    if (!sidebarTab || !panel._toolbox) {
      // bail out no sidebar or no toolbox
      return;
    }

    if ((!panel.selection || !panel.selection.nodeFront) && !nodeFront) {
      // disable sidebar tab when nothing is selected
      this.panel.sidebar.toggleTab(false, "fireangular");
      return;
    }

    nodeFront = nodeFront || panel.selection.nodeFront
    let view = this._variablesView;

    if (!this._webconsoleClient) {
      return;
    }

    this._webconsoleClient.
      evaluateJS("angular.element($0).scope()", (res) => {
        // refresh variables view
        if (!res.exception && res.result.type === "object") {
          this.panel.sidebar.toggleTab(true, "fireangular");
          var options = !res.exception ? { objectActor: res.result } : {};
          view.empty();
          view.controller.setSingleVariable(options).expanded = true;
        } else {
          // disable the sidebar when a non-angularjs node is selected
          this.panel.sidebar.toggleTab(false, "fireangular");
        }
      }, {
        url: module.url,
        selectedNodeActor: nodeFront.actorID
      });
  },

  attachDebuggerClient: function({webconsoleClient, debuggerClient}) {
    this._webconsoleClient = webconsoleClient;
    this._debuggerClient = debuggerClient;
    this.setupAngularSidebar();
  }

});

// Helpers

function consoleFor(target) {
  let consoleActor = target.form.consoleActor;
  let client = target.client;

  return new Promise((resolve, reject) => {
    client.attachConsole(consoleActor, [], (res, webconsoleClient) => {
      if (res.error) {
        console.error("attachConsole error", res.error);
        reject(res.error);
      } else {
        resolve({
          webconsoleClient: webconsoleClient,
          debuggerClient: client
        });
      }
    });
  });

}
// Exports from this module
exports.InspectorOverlay = InspectorOverlay;
