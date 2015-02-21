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

var ChatServer = {
    greet: function() { return "Hi! there"; },
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
      done();
    });
  });

});
