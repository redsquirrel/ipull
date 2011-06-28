var redis = require('redis');
var courseController = require('../course-controller');

var vows = require('vows'),
    assert = require('assert');

vows.describe('course-controller').addBatch({
  'index': {
    topic: courseController,
      'should work': function (controller) {
        var response = {render: function(){}};
        controller.index(redis.createClient, null, response);
      }    
  }
}).run();