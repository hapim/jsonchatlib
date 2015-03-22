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
 *   - args (required) - input arguments (positional or named) and result
 *   - src  (optional) - can it be populated by client-id?
 *   - dst  (optional) - defaults to current channel, could be a channel or list of channels
 *   - tags (optional) - additional tags from server that needs to be passed
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
 * <-- {"ver": "1.0", "error": {"code":510,"message":"Parse error"}}
 * <-- {"error": {"code":510},"args":"Unexpected end of input"}
 *
*/

// Keep the similar code to HTTP
// anything starting with 5xx - basic fundamental issue 
// anything with 4xx - application specific, soft issues 
var ChatErrors = {
  INTERNAL_ERROR   : { code:500, message: 'Internal error' },
  PARSE_ERROR      : { code:510, message: 'Parse error' },
  INVALID_REQUEST  : { code:511, message: 'Invalid request' },
  CMD_NOT_FOUND    : { code:520, message: 'Command not found' },
  INVALID_PARAMS   : { code:521, message: 'Invalid params' },
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
JSONChat.prototype.dispatch = function(packet) {
  var jsonBody = packet.payload;
  var self=this;
  self._debug(true, jsonBody);

  var id;
  var batch = false;
  var cmdObj;
  // first step is to parse the json
  try {
    cmdObj = JSON.parse(jsonBody);
  } catch(err) {
    return self.error(ChatErrors.PARSE_ERROR, id, err.message);
  }
  var commands = [];
  var results = [];
  // if cmdObj is array, then its a batch request
  if(handy.getType(cmdObj)=='array') {
    if(cmdObj.length==0) {
      return self.error(ChatErrors.INVALID_REQUEST, id, 'empty list');
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
      if(!_.has(cmdObj, _TAG_CMD) || cmdObj[_TAG_CMD]==_PUB_CMD) {
        // - first handle all pub commands 
        //   those are notifications.
        //self._debug(true, 'Notification ' + JSON.stringify(cmdObj));
      	// - just leave them as they are
      	result = self.result(id, cmdObj[_TAG_ARGS]);
      } else {
        // invoke the function
        try {
          var cmdArgs = [];
          cmdArgs.push(packet);
          cmdArgs.push.apply(cmdArgs, cmdObj[_TAG_ARGS]);
          var res = self.commands[cmdObj[_TAG_CMD]].apply(null, cmdArgs);
          result = self.result(cmdObj.id, res, cmdObj[_TAG_CMD]);
        }
        catch(err) {
          result = self.error(ChatErrors.INTERNAL_ERROR, cmdObj.id, err);
        }
      }
    }
    if(result) results.push(result);
  });
  // return back the result
  if(results.length<=0) return;
  if(batch==false) {
    return results[0];
  } 
  return results;

};

// return back the result object
JSONChat.prototype.result = function(id, result, cmd) {
  var res = { 
      args : result,
      id: id,
      cmd: cmd
  };
  if(!this.minimal) {
      res[_TAG_VER] = this.version;
  }
  this._debug(false, res);
  return res;
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
      errorObj[_TAG_VER] = this.version;
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

  // - check for version
  if(_.has(cmdObj, _TAG_VER) && cmdObj[_TAG_VER]!=_VAL_VER) {
    return self.error(ChatErrors.INVALID_REQUEST, id, 'unknown version');
  }

  // - check for id
  if(id) {
    var idType = handy.getType(cmdObj.id);
    if(idType != 'string' && idType != 'number') {
      return self.error(ChatErrors.INVALID_REQUEST, cmdObj.id, 'id should be a valid number/string');
    }
  }
  // - check for cmd absence
  if(!_.has(cmdObj, _TAG_CMD) || cmdObj[_TAG_CMD]==_PUB_CMD) {
    if(!_.has(cmdObj, _TAG_ARGS)) {
      return self.error(ChatErrors.INVALID_REQUEST, id, 'args missing');
    }
    return; // default to cmd='pub'
  }
  // - check if cmd is present
  var fns = _.functions(self.commands);
  if(!_.include(fns, cmdObj[_TAG_CMD])) {
    return self.error(ChatErrors.CMD_NOT_FOUND, id, cmdObj[_TAG_CMD] + " - unknown method");
  }
  // - args checks
  var params=_getParamNames(self.commands[cmdObj[_TAG_CMD]]) || [];
  // - check params length
  if(!_.has(cmdObj, _TAG_ARGS) && params && params.length>0) {
    return self.error(ChatErrors.INVALID_PARAMS, id, 'params expected:'+params);
  }

  // - if params are present
  //   it has to be either array or object
  if(_.has(cmdObj, _TAG_ARGS)) {
    var ptype = handy.getType(cmdObj[_TAG_ARGS]);
    if(ptype!='array' && ptype!='object') {
      return self.error(ChatErrors.INVALID_PARAMS, cmdObj.id, 'params should be either array or object');
    }

    // @todo - not sure if this check needs to be enabled
    // sometimes it might be by design that less valus can be passed

    // check if array matches the arguments
    if(ptype=='array' && cmdObj[_TAG_ARGS].length+1 != params.length) {
      return self.error(ChatErrors.INVALID_PARAMS, cmdObj.id, 'total params expected:'+params.length);
    }
    // check if the object has matching params
    if(ptype=='object') {
      var requestValues = [];
      
      requestValues.push("packet");
      requestValues.push.apply(requestValues,_.keys(cmdObj[_TAG_ARGS]));
      if(!handy.isArrayEqual(params, requestValues)) {
        return self.error(ChatErrors.INVALID_PARAMS, cmdObj.id, 'params mismatch:'+params);
      }
      // lets convert the params to array 
      // in the order expected
      cmdObj[_TAG_ARGS] = _.values(_.pick(cmdObj[_TAG_ARGS], params));
    }
  }
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
