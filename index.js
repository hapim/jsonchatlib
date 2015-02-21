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
 *   - tags (optional) - on response - result values (positional or named) 
 *   - error - on response {'code': ERROR_CODE, message: 'error message(optional)'}, 
 *             args would carry the result error string
 *
 * publish/notification:
 * 
 * --> {"args": "Hi, there"} // cmd='pub'
 * --> {"cmd": "pub", "args": "Hi, there"}
 * --> {"ver": "1.0", "cmd": "pub", "args": "Hi, there"}
 * 
 * error response:
 * <-- {"ver": "1.0", "error": {"code":-32600,"message":"Parse error"}}
 * <-- {"error": {"code":-32600},"args":"Unexpected end of input"}
 *
*/

// Keep the similar code to HTTP
// anything starting with 5xx - basic fundamental issue 
// anything with 4xx - application specific, soft issues 
var ChatErrors = {
  INTERNAL_ERROR  : { code:500, message: 'Internal error' },
  PARSE_ERROR     : { code:510, message: 'Parse error' }
};

// JSON chat library entry point
// 'module' implements all the extensions, by default only 'pub' is supported
var JSONChat = function(module, minimal, debug) {
  this.debug = debug || false;
  this.minimal = minimal || false;
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

  var id;
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
      id: id,
      error: { code: err.code },
      args: data
  };
  // include error message only if minimal not set
  if(!this.minimal) {
      errorObj['ver'] = this.version;
      errorObj['error']['message'] = err.message;
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
