var jsonchatlib=require('..');
var assert=require('assert');

function _getCodeOrResult(jsonStr, code) {
  if(!jsonStr) return jsonStr;
  try {
    var obj = JSON.parse(jsonStr);
    return obj.error ? obj.error.code : obj.args;
  }
  catch(err) {
    // json has to be valid in all cases
    throw Error('Invalid JSON');
  }
}

var PARSE_ERROR = 510;
var INVALID_REQUEST = 511;
var UNKNOWN_METHOD = 520;
var INVALID_PARAMS = 521;

var ChatServer = {
    greet: function() { return "Hi! there"; },
    say: function(msg) { return msg; },
    name: 'My Chat Machine'
};


describe('json-chat library', function() {
  before(function(done) {
    done();
  });
  var debug=true;
  var minimal=true;
  describe('basic variants', function() {
    it('syntax', function(done) {
      var chat=new jsonchatlib(ChatServer,minimal, debug);
      var res;
      res=chat.dispatch('{"args": "hello, there"');
      assert.equal(_getCodeOrResult(res), PARSE_ERROR);

      res=chat.dispatch('[]');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      res=chat.dispatch('[[]]');
      var obj = JSON.parse(res);
      assert.equal(obj.length, 1);
      assert.equal(obj[0].error.code, INVALID_REQUEST);

      res=chat.dispatch('{}');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      res=chat.dispatch('{"xyz":"useless param"}');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      res=chat.dispatch('{"ver":2.0, "args":"sample"}');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      done();
    });
    it('publish commands', function(done) {
      var chat=new jsonchatlib(ChatServer,minimal, debug);
      var res;
      res=chat.dispatch('{"args": "hello, there"}');
      assert.equal(_getCodeOrResult(res), undefined);

      res=chat.dispatch('{"cmd":"pub"}');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      res=chat.dispatch('{"ver":1, "args":"sample"}');
      assert.equal(_getCodeOrResult(res), undefined);

      res=chat.dispatch('{"cmd":"greet", "args":{}}');
      assert.equal(_getCodeOrResult(res), "Hi! there");

      res=chat.dispatch('{"cmd":"gree", "args":{}}');
      assert.equal(_getCodeOrResult(res), UNKNOWN_METHOD);

      res=chat.dispatch('{"cmd":"say", "args":{}}');
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=chat.dispatch('{"cmd":"greet", "args":"hello there"}');
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      done();
    });
  });

});
