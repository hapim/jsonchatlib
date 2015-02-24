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
 *   - src  (optional) - can it be populated by client-id?
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
  PARSE_ERROR     : { code:510, message: 'Parse error' },
  INVALID_REQUEST : { code:511, message: 'Invalid Request' },
};

var _TAG_ID   = 'id';
var _TAG_VER  = 'ver';
var _TAG_CMD  = 'cmd';
var _TAG_ARGS = 'args';

var _PUB_CMD = 'pub';
var _VAL_VER = '1.0';

// JSON chat library entry point
// 'module' implements all the extensions, by default only 'pub' is supported
var JSONChat = function(module, minimal, debug) {
  this.debug = debug || false;
  this.minimal = minimal || false;
  this.version = _VAL_VER;
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
  // if cmdObj is array, then its a batch request
  if(handy.getType(cmdObj)=='array') {
    if(cmdObj.length==0) {
      return JSON.stringify(self.error(ChatErrors.INVALID_REQUEST, id, 'empty list'));
    }
    batch = true;
    commands = cmdObj;
  } else {
    commands = [cmdObj];
  }
  // exec all commands
  _.each(commands, function(cmdObj) {
    var result = self._validate(cmdObj);
    if(!result) {
      if(!_.has(cmdObj, _TAG_CMD || !_.has(cmdObj, _TAG_ID) || (_.has(cmdObj, _TAG_CMD) && cmdObj[_TAG_CMD]==_PUB_CMD))) {
        // - first handle all pub commands 
        //   those are notifications.
        self._debug(true, 'Notification ' + JSON.stringify(cmdObj));
      } else {
        // invoke the function
        // @todo - what should be the value of 'this'?
        try {
          var res=self.methods[cmdObj.method].apply(null, cmdObj.params);
          console.log(res);
          //result = self.result(reqObj.id, res);
        }
        catch(err) {
          result = self.error(ChatErrors.INTERNAL_ERROR, reqObj.id, err);
        }
      }
    }
    if(result) results.push(result);
  });
  // return back the result
  if(results.length<=0) return;
  if(batch==false) {
    return JSON.stringify(results[0]);
  } 
  return JSON.stringify(results);

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

// ---- private functions

// validate the command object
// - returns the error object, if any error
JSONChat.prototype._validate = function(cmdObj) {
  var self = this;
  var id;

  // basic checks
  if(handy.getType(cmdObj)!='object') {
    return self.error(ChatErrors.INVALID_REQUEST, id, 'invalid object');
  } 
  if(_.size(cmdObj)<=0) {
    return self.error(ChatErrors.INVALID_REQUEST, id, 'empty object');
  } 
  id = _.has(cmdObj, _TAG_ID)?cmdObj.id:id;
  if(!_.has(cmdObj, _TAG_ARGS)) {
    return self.error(ChatErrors.INVALID_REQUEST, id, 'args missing');
  }
  // - check for version
  if(_.has(cmdObj, _TAG_VER) && cmdObj[_TAG_VER]!=_VAL_VER) {
    return self.error(ChatErrors.INVALID_REQUEST, id, 'unknown version');
  }

  return;
  /*
  // - check for id
  var idType = handy.getType(cmdObj.id);
  if(idType != 'string' && idType != 'number') {
    return self.error(ChatErrors.INVALID_REQUEST, cmdObj.id, 'id should be a valid number/string');
  }
  // - check for method
  if(!_.has(cmdObj, 'method')) {
    return self.error(ChatErrors.INVALID_REQUEST, cmdObj.id, 'missing method to call');
  }
  // - check if method is present
  var fns = _.functions(self.methods);
  if(!_.include(fns, cmdObj.method)) {
    return self.error(ChatErrors.METHOD_NOT_FOUND, cmdtObj.id, cmdObj.method + " - unknown method");
  }

  // - parameter checks
  var params=_getParamNames(self.methods[cmdObj.method]) || [];
  // - if params are absent and required for the method, its an error
  if(!_.has(cmdtObj,'params') && params && params.length>0) {
    return self.error(ChatErrors.INVALID_PARAMS, cmdObj.id, 'params expected:'+params);
  }
  // - if params are present
  //   it has to be either array or object
  if(_.has(cmdObj, 'params')) {
    var ptype = handy.getType(cmdObj.params);
    if(ptype!='array' && ptype!='object') {
      return self.error(ChatErrors.INVALID_PARAMS, cmdObj.id, 'params should be either array or object');
    }

    // @todo - not sure if this check needs to be enabled
    // sometimes it might be by design that less valus can be passed

    // check if array matches the arguments
    if(ptype=='array' && cmdObj.params.length != params.length) {
      return self.error(ChatErrors.INVALID_PARAMS, cmdObj.id, 'total params expected:'+params.length);
    }
    // check if the object has matching params
    if(ptype=='object') {
      var requestValues = _.keys(cmdObj.params);
      if(!handy.isArrayEqual(params, requestValues)) {
        return self.error(ChatErrors.INVALID_PARAMS, cmdObj.id, 'params expected:'+params);
      }
      // lets convert the params to array 
      // in the order expected
      cmdObj.params = _.values(_.pick(cmdObj.params, params));
    }
  }
  */
};

// returns the function parameters
function _getParamNames(func) {
  var funStr = func.toString();
  return funStr.slice(funStr.indexOf('(')+1, funStr.indexOf(')')).match(/([^\s,]+)/g);
}

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
