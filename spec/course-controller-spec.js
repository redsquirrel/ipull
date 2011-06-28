var assert = require('assert');
var redis = require('redis');
var vows = require('vows');

var courseController = require('../course-controller');
var courses = require('../courses');

var testRedis = function() {
  return redis.createClient(53535);
};

function setupBatch(tests) {
  var fixtureData = {
    '': {
      topic: function() {
        var client = testRedis();
        var callback = this.callback;
        courses.deleteAll(client, function() {callback(null, client)});
      },
      '': {
        topic: function(client) {
          var callback = this.callback;
          courses.create(client, {name: "Thoreau in the 21st Century"}, function() {
            client.quit();
            callback();
          });
        }
      }
    }
  };
  
  for (var label in tests) {
    fixtureData[''][''][label] = tests[label];
  }
  
  return fixtureData;
};

vows.describe('course-controller').addBatch(setupBatch({
  index: {
    topic: function() {
      courseController.index(testRedis, null, this.callback);
    },
    'should show 1 course': function (courses) {
      assert.equal(courses.length, 1);
    }
  },
  show: {
    topic: function() {
      courseController.show(testRedis, 1, null, this.callback);
    },
    'should show a course': function (course) {
      assert.ok(course);
    }
  }
})).run();
