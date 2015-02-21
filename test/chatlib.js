var jsonchatlib=require('..');
var assert=require('assert');

function _getCodeOrResult(jsonStr, code) {
  if(!jsonStr) return jsonStr;
  try {
    var obj = JSON.parse(jsonStr);
    return obj.error ? obj.error.code : obj.result;
  }
  catch(err) {
    // json has to be valid in all cases
    throw Error('Invalid JSON');
  }
}

var PARSE_ERROR = -32700;
var INVALID_REQUEST = -32600;
var METHOD_NOT_FOUND = -32601;
var INVALID_PARAMS = -32602;

var ChatServer = {
    greet: function() { return "Hi! there"; },
    name: 'My Chat Machine'
};


describe('json-chat library', function() {
  before(function(done) {
    done();
  });
  var debug=false;
  describe('basic variants', function() {
    it('syntax', function(done) {
      var chat=new jsonchatlib(ChatServer,debug);
      var res;
      res=chat.dispatch('{"args": "hello, there"');
      console.log(res);
      assert.equal(_getCodeOrResult(res), PARSE_ERROR);
      done();
    });
  });

});
