/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "stable"
};

// Add-on SDK
const { prefs } = require("sdk/simple-prefs");

/**
 * Angularify (jQuerify by Karl Swedberg), based taken from:
 * http://www.learningjquery.com/2009/04/better-stronger-safer-jquerify-bookmarklet
 * and slightly modified styles
 */
const AngularifyCode = "\
(function() {\
  var el = document.createElement('div');\
  var b = document.getElementsByTagName('body')[0];\
  var otherlib = false;\
  var msg = '';\
  el.style.fontFamily = 'Arial, Verdana';\
  el.style.position = 'fixed';\
  el.style.padding = '5px 10px 5px 10px';\
  el.style.margin = '0';\
  el.style.zIndex = 1001;\
  el.style.lineHeight = '46px';\
  el.style.fontSize = '40px';\
  el.style.fontWeight = 'bold';\
  el.style.color = '#444';\
  el.style.backgroundColor = '#FFFB00';\
  el.style.MozBorderRadius = '8px';\
  el.style.opacity = '0.8';\
  el.style.textAlign = 'center';\
  if (typeof angular != 'undefined') {\
    msg = 'This page already using angular v' + angular.version.full;\
    if (typeof $jq == 'function') {\
      msg += ' and noConflict().<br/>Use $jq(), not $().';\
    }\
    return showMsg();\
  } else if (typeof $ == 'function') {\
    otherlib = true;\
  }\
  function getScript(url, success, failure) {\
    var script = document.createElement('script');\
    script.src = url;\
    var head = document.getElementsByTagName('head')[0],\
    done = false;\
    var timeout = setTimeout(function() { failure(); }, {{AngularURLTimeout}});\
    script.onload = script.onreadystatechange = function() {\
      if (!done && (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) {\
        done = true;\
        clearTimeout(timeout);\
        success();\
      }\
    };\
    head.appendChild(script);\
  }\
  getScript('{{AngularURL}}', \
  function() {\
    if (typeof angular == 'undefined') {\
      msg = 'Sorry, but Angular wasn\\'t able to load';\
      return showMsg(true);\
    } else {\
      msg = 'This page is now Angularified with v' + angular.version.full;\
      if (otherlib) {\
        msg += ' and noConflict().<br/>Use angular.';\
      }\
    }\
    return showMsg();\
  }, function() {\
    msg = 'Unable to load Angular from:<br/>{{AngularURL}}';\
    return showMsg(true);\
  });\
  function showMsg(isError) {\
    el.innerHTML = msg;\
    if (isError) el.style.backgroundColor = '#FF4444';\
    b.appendChild(el);\
    el.style.left = Math.floor((window.innerWidth - el.clientWidth) / 2) + 'px';\
    el.style.top = Math.floor((window.innerHeight - el.clientHeight) / 2) + 'px';\
    window.setTimeout(function() {\
      if (typeof angular == 'undefined') {\
        b.removeChild(el);\
      } else {\
        b.removeChild(el);\
      }\
    },\
    2500);\
  }\
})();\
";

/**
 * xxxHonza TODO docs
 *
 * @returns
 */
function getAngularifyCode() {
  let defaultUrl = "chrome://fireangular-resources/content/angular.js";
  let AngularUrl = prefs.AngularURL || defaultUrl;
  let AngularUrlTimeout = prefs.AngularURLTimeout || 5000;

  var code = AngularifyCode;
  code = code.replace(/\{\{AngularURL\}\}/g, AngularUrl.replace("'", "\\'"));
  code = code.replace(/\{\{AngularURLTimeout\}\}/g, AngularUrlTimeout + "");
  return code;
}

// Exports from this module
exports.getAngularifyCode = getAngularifyCode;
