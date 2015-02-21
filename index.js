/**
 * jsonchatlib - main file
 * copyright (c) 2015 openmason.
 * MIT Licensed.
 */

var handy = require('handy');
var logger = require('util');
var _ = require('underscore');

// * - UTF-8 compliant
/*
 * Syntax:
 * 
 * --> data sent to Server
 * <-- data sent to Client
 *
 * keywords available in v1.0 are: id, ver, cmd, args, src, dst, tags 
 *   - id   (optional) - response would carry back id (copied from original msg)
 *   - ver  (optional) - defaults to "1.0"
 *   - cmd  (optional) - default command is 'pub(lish)' / broadcast in current channel
 *   - args (required) - arguments (positional or named) 
 *   - src  (optional) - 
 *   - dst  (optional) - defaults to current channel, could be a channel or list of channels
 *   - tags (required) - result values (positional or named) 
 *
 * publish/notification:
 * 
 * --> {"args": "Hi, there"} // cmd='pub'
 * --> {"cmd": "pub", "args": "Hi, there"}
 * --> {"ver": "1.0", "cmd": "pub", "args": "Hi, there"}
 * 
*/

// Keep the same code as JsonRpc error codes
var ChatErrors = {
  PARSE_ERROR     : { code:-32700, message: 'Parse error' },
  INVALID_REQUEST : { code:-32600, message: 'Invalid Request' },
  METHOD_NOT_FOUND: { code:-32601, message: 'Method not found' },
  INVALID_PARAMS  : { code:-32602, message: 'Invalid params' },
  INTERNAL_ERROR  : { code:-32603, message: 'Internal error' },
  SERVER_ERROR    : { code:-32000, message: 'Server error' }
};


// JSON chat library entry point
// 'module' implements all the extensions, by default only 'pub' is supported
var JSONChat = function(module, debug) {
  this.debug = debug || false;
  this.version = "1.0";
  // check & load the methods in module
  this.commands = module;
  if(handy.getType(module)=='string') {
    this.commands = require(module);
  }
  if(this.debug) {
    logger.debug('Loaded with commands:'+_.functions(this.commands));
  }
};

// main dispatcher for processing json-chat
// requests
JSONChat.prototype.dispatch = function(jsonBody) {
  var self=this;
  self._debug(true, jsonBody);

  var id = null;
  var batch = false;
  var cmdObj;
  // first step is to parse the json
  try {
    cmdObj = JSON.parse(jsonBody);
  } catch(err) {
    return JSON.stringify(self.error(ChatErrors.PARSE_ERROR, id, err.message));
  }
  var commands = [];
  var results = [];
};

// return back the correct error object
JSONChat.prototype.error = function(err, id, data) {
  var errorObj = { 
      ver: this.version,
      error: { code: err.code, message: err.message }
  };
  if(id) {
      errorObj['id']=id;
  };
  if(data) {
    errorObj['data'] = data;
  }
  this._debug(false, errorObj);
  return errorObj;
};

// debug request/response statements
JSONChat.prototype._debug = function(toServer, value) {
  if(this.debug) {
    if(handy.getType(value)!='string') {
      value = JSON.stringify(value);
    }
    logger.debug((toServer?'-->':'<--')+' ' + value);
  }
};

module.exports = JSONChat;

// -- EOF
