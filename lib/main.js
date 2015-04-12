/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "stable"
};

const { Cu, Ci } = require("chrome");
const { Trace, TraceError } = require("firebug.sdk/lib/core/trace.js").get(module.id);
const { ToolboxChrome } = require("firebug.sdk/lib/toolbox-chrome.js");
const { Locale } = require("firebug.sdk/lib/core/locale.js");

// FireAngular overlays
const { InspectorOverlay } = require("./inspector-overlay.js");
const { ConsoleOverlay } = require("./console-overlay.js");

// Platform patch (should be removed as soon as it's built-in).
const MarkupViewPatch = require("./markup-view-patch.js");

// Localization files. All strings in the UI should be loaded from these
// files, so the entire extension can be localized into other languages.
Locale.registerStringBundle("chrome://fireangular/locale/fireangular.properties");

/**
 * Entry point of the extension. Both 'main' and 'onUnload' methods are
 * exported from this module and executed automatically by Add-ons SDK.
 */
function main(options, callbacks) {
  ToolboxChrome.initialize(options);

  ToolboxChrome.registerPanelOverlay(InspectorOverlay);
  ToolboxChrome.registerPanelOverlay(ConsoleOverlay);
}

/**
 * Executed on browser shutdown or when the extension is
 * uninstalled/removed/disabled.
 */
function onUnload(reason) {
  Trace.sysout("onUnload; " + reason);

  // Unapply temporary patches
  MarkupViewPatch.shutdown();

  ToolboxChrome.unregisterPanelOverlay(InspectorOverlay);
  ToolboxChrome.unregisterPanelOverlay(ConsoleOverlay);

  ToolboxChrome.shutdown(reason);
}

// Exports from this module
exports.main = main;
exports.onUnload = onUnload;
