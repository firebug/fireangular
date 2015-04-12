/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "stable"
};

const { Cc, Ci, Cu } = require("chrome");
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { FireAngularActor } = require("./fireangular-actor.js");
const Events = require("sdk/event/core");

const { devtools } = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
const { Front, FrontClass } = devtools["require"]("devtools/server/protocol");
const { custom } = devtools["require"]("devtools/server/protocol");

/**
 * @front This object represents client side for the backend FireAngular
 * actor.
 */
var FireAngularFront = FrontClass(FireAngularActor,
/** @lends FireAngularFront */
{
  // Initialization

  initialize: function(client, form) {
    Front.prototype.initialize.apply(this, arguments);

    Trace.sysout("FireAngularFront.initialize;", this);

    this.actorID = form[FireAngularActor.prototype.typeName];
    this.manage(this);
  },

  ensureParentFront: function(...args) {
    this.walker.ensureParentFront.apply(this.walker, args);
  },

  onAttached: function(response) {
    Trace.sysout("FireAngularFront.onAttached;", response);
  },

  onDetached: function(response) {
    Trace.sysout("FireAngularFront.onDetached;", response);
  }
});

// Exports from this module
exports.FireAngularFront = FireAngularFront;
