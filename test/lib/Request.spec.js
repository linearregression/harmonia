/* jshint expr:true */
/* global describe, it */
'use strict';

var expect = require('chai').expect;
var Request = require('../../lib/Request');

describe('Request', function() {
  describe('#constructor', function() {
    it('throws an error with a bad request', function() {
      var req = {
        method : 123,
        params : []
      };

      function makeReq() {
        return new Request(req);
      }

      expect(makeReq).to.throw(Object);
    });

    it('pulls out request data correctly', function() {
      var headers = { Authorization : 'Bearer 12345' };

      var req = {
        content : {
          method  : 'math.add',
          params  : { x : 1, y : 2 },
          jsonrpc : '2.0'
        },
        properties : {
          headers : headers
        }
      };

      var request = new Request(req);

      expect(request.headers).to.equal(headers);
      expect(request.properties).to.be.an.object;
      expect(request.params.x).to.equal(1);
      expect(request.content).to.be.an.object;
      expect(request.method).to.equal('math.add');
    });
  });
});
