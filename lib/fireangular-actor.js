/* See license.txt for terms of usage */

"use strict";

/**
 * This module is loaded on the backend (can be a remote device) where
 * some module or features (such as Tracing console) don't have to
 * be available. Also Firebug SDK isn't available on the backend.
 */

// Add-on SDK
const { Cu } = require("chrome");

// DevTools
const { DebuggerServer } = Cu.import("resource://gre/modules/devtools/dbg-server.jsm", {});
const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const protocol = devtools["require"]("devtools/server/protocol");
const { method, RetVal, ActorClass, Actor, Arg, types } = protocol;
const Events = require("sdk/event/core");
const { makeInfallible } = devtools["require"]("devtools/toolkit/DevToolsUtils.js");
const DevToolsUtils = devtools["require"]("devtools/toolkit/DevToolsUtils");

// For debugging purposes. Note that the tracing module isn't available
// on the backend (in case of remote device debugging).
 const baseUrl = "resource://fireangular-at-alcacoop-dot-it/";
 const { getTrace } = Cu.import(baseUrl + "node_modules/firebug.sdk/lib/core/actor.js");
 const Trace = getTrace();
//const Trace = {sysout: () => {}};

/**
 * Helper actor state watcher.
 */
function expectState(expectedState, method) {
  return function(...args) {
    if (this.state !== expectedState) {
      Trace.sysout("actor.expectState; ERROR wrong state, expected '" +
        expectedState + "', but current state is '" + this.state + "'" +
        ", method: " + method);

      let msg = "Wrong State: Expected '" + expectedState + "', but current " +
        "state is '" + this.state + "'";

      return Promise.reject(new Error(msg));
    }

    try {
      return method.apply(this, args);
    } catch (err) {
      Cu.reportError("actor.js; expectState EXCEPTION " + err, err);
    }
  };
}

/**
 * @actor This object represents an actor that is dynamically injected
 * (registered) to the debuggee target (back-end). The debuggee target
 * can be a running instance of the browser on local machine or remote
 * device such as mobile phone. The communication with this object is
 * always done through RDP (Remote Debugging Protocol). Read more about
 * {@link https://wiki.mozilla.org/Remote_Debugging_Protocol|RDP}.
 */
var FireAngularActor = ActorClass(
/** @lends FireAngularActor */
{
  typeName: "FireAngularActor",

  /**
   * Events emitted by this actor.
   */
  events: {
  },

  // Initialization

  initialize: function(conn, parent) {
    Trace.sysout("FireAngularActor.initialize; parent: " +
      parent.actorID + ", conn: " + conn.prefix, this);

    Actor.prototype.initialize.call(this, conn);

    this.parent = parent;
    this.state = "detached";

    this.onDomNodeForm = this.onDomNodeForm.bind(this);
    this.onNavigate = this.onNavigate.bind(this);
  },

  /**
   * The destroy is only called automatically by the framework (parent actor)
   * if an actor is instantiated by a parent actor.
   */
  destroy: function() {
    Trace.sysout("FireAngularActor.destroy; state: " + this.state, arguments);

    if (this.state === "attached") {
      this.detach();
    }

    Actor.prototype.destroy.call(this);
  },

  /**
   * Automatically executed by the framework when the parent connection
   * is closed.
   */
  disconnect: function() {
    Trace.sysout("FireAngularActor.disconnect; state: " + this.state, arguments);

    if (this.state === "attached") {
      this.detach();
    }
  },

  /**
   * Attach to this actor. Executed when the front (client) is attaching
   * to this actor.
   */
  attach: method(expectState("detached", function() {
    Trace.sysout("FireAngularActor.attach;", arguments);

    this.state = "attached";

    Events.on(this.parent, "navigate", this.onNavigate);
    DebuggerServer.on("domnode-form", this.onDomNodeForm);
  }), {
    request: {},
    response: {
      type: "attached"
    }
  }),


  /**
   * Detach from this actor. Executed when the front (client) detaches
   * from this actor.
   */
  detach: method(expectState("attached", function() {
    Trace.sysout("FireAngularActor.detach;", arguments);

    this.state = "detached";

    Events.off(this.parent, "navigate", this.onNavigate);
    DebuggerServer.off("domnode-form", this.onDomNodeForm);

    // xxxHonza: remove previewer
  }), {
    request: {},
    response: {
      type: "detached"
    }
  }),

  // Events

  /**
   * Page navigation handler.
   */
  onNavigate: function({isTopLevel}) {
    Trace.sysout("FireAngularActor.onNavigate " + isTopLevel);
  },

  // Debugger Server Events

  onDomNodeForm: makeInfallible(function(eventId, nodeActor, form) {
    // add bool property if the dom node has associated angular scope data
    form.hasAngularScopeData = hasAngularScopeData(nodeActor.rawNode);
  })
});

// Helpers

function hasAngularScopeData(object) {
  try {
    var win = object.ownerDocument.defaultView;
    var wrapper = win.wrappedJSObject || win;
    var angular = wrapper.angular;
    var angularEl = angular.element(object.wrappedJSObject || object);

    if (angularEl && angularEl.scope()) {
      return true;
    }
  } catch (ex) {
  }

  return false;
};

// Exports from this module
exports.FireAngularActor = FireAngularActor;

// Patching NodeActor (add custom info into actor form)
// xxxHonza: Bug 1036949 - New API: MarkupView customization
const { NodeActor } = devtools["require"]("devtools/server/actors/inspector");

let originalForm = NodeActor.prototype.form;
NodeActor.prototype.form = function() {
  let form = originalForm.apply(this, arguments);
  DebuggerServer.emit("domnode-form", this, form);
  return form;
}
