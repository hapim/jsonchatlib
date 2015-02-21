/**
 * jsonchatlib - main file
 * copyright (c) 2015 openmason.
 * MIT Licensed.
 */

var handy = require('handy');
var logger = require('util');
var _ = require('underscore');

// JSON RPC library entry point
var JSONChat = function(module, debug) {
  this.debug = debug || false;
};

// debug request/response statements
JSONChat.prototype._debug = function(isRequest, value) {
  if(this.debug) {
    if(handy.getType(value)!='string') {
      value = JSON.stringify(value);
    }
    logger.debug((isRequest?'-->':'<--')+' ' + value);
  }
};

module.exports = JSONChat;

// -- EOF
