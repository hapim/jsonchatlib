var jsonchatlib=require('..');
var assert=require('assert');

function _getCodeOrResult(jsonObj, code) {
  if(!jsonObj) return jsonObj;
  try {
    var obj = jsonObj;
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
    getName: function(fn,ln) { return ln+','+fn; },
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
      assert.equal(res.length, 1);
      assert.equal(res[0].error.code, INVALID_REQUEST);

      res=chat.dispatch('{}');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      res=chat.dispatch('{"xyz":"args mising"}');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      res=chat.dispatch('{"ver":2.0, "args":"invalid version"}');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      res=chat.dispatch('{"ver":1, "id":{}, "args":"invalid id"}');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      res=chat.dispatch('{"ver":1.0, "id":[], "args":"invalid id"}');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      res=chat.dispatch('{"cmd":"pub", "xyz":"args mising"}');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      done();
    });
    it('publish commands', function(done) {
      var chat=new jsonchatlib(ChatServer,minimal,debug);
      var res;
      var msg = 'hello, there';
      res=chat.dispatch('{"args": "'+msg+'"}');
      assert.equal(_getCodeOrResult(res), msg);

      res=chat.dispatch('{"cmd":"pub"}');
      assert.equal(_getCodeOrResult(res), INVALID_REQUEST);

      res=chat.dispatch('{"ver":1, "args":"'+msg+'"}');
      assert.equal(_getCodeOrResult(res), msg);

      res=chat.dispatch('{"ver":1, "args":"'+msg+'"}');
      assert.equal(res.cmd, undefined);

      res=chat.dispatch('{"cmd":"pub", "args":"'+msg+'"}');
      assert.equal(res.cmd, undefined);
      assert.equal(res.args, msg);

      done();
    });

    it('server commands', function(done) {
      var chat=new jsonchatlib(ChatServer,minimal,debug);
      var res;
      var msg = 'hello, there';

      res=chat.dispatch('{"cmd":"gree", "args":{}}');
      assert.equal(_getCodeOrResult(res), UNKNOWN_METHOD);

      res=chat.dispatch('{"cmd":"greet", "args":{}}');
      assert.equal(_getCodeOrResult(res), "Hi! there");

      res=chat.dispatch('{"cmd":"greet", "args":{}}');
      assert.equal(res.cmd, "greet");

      res=chat.dispatch('{"cmd":"greet"}');
      assert.equal(_getCodeOrResult(res), "Hi! there");

      res=chat.dispatch('{"cmd":"say", "args":{}}');
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=chat.dispatch('{"cmd":"say", "args":{"mg":"hello"}}');
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=chat.dispatch('{"cmd":"say", "args":[]}');
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=chat.dispatch('{"cmd":"say", "args":["hello","there"]}');
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=chat.dispatch('{"cmd":"say", "args":"hello"}');
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=chat.dispatch('{"cmd":"greet", "args":"hello there"}');
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=chat.dispatch('{"cmd":"say", "args":["hello"]}');
      assert.equal(_getCodeOrResult(res), "hello");

      res=chat.dispatch('{"cmd":"say", "args":{"mg":"hello","msg":"there"}}');
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=chat.dispatch('{"cmd":"say", "args":{"msg":"hello"}}');
      assert.equal(_getCodeOrResult(res), "hello");

      res=chat.dispatch('{"cmd":"getName", "args":{"f":"hello"}}');
      assert.equal(_getCodeOrResult(res), INVALID_PARAMS);

      res=chat.dispatch('{"cmd":"getName", "args":{"ln":"b","fn":"a"}}');
      assert.equal(_getCodeOrResult(res), "b,a");

      done();
    });
  });

});
