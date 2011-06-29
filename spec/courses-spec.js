var assert = require('assert');
var redis = require('redis');
var vows = require('vows');

var courses = require('../courses');

var testRedis = function() {
  return redis.createClient(53535);
};

var testCourseName = "Thoreau in the 21st Century";
var setupBatch = function(tests) {
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
          courses.create(client, {name: testCourseName}, function() {
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

vows.describe('courses').addBatch(setupBatch({
  all: {
    topic: function() {
      courses.all(testRedis, this.callback);
    },
    'should provide all 2 courses': function (courses) {
      assert.equal(courses.length, 1);
    }
  },
  find: {
    topic: function() {
      courses.find(testRedis, 1, this.callback);
    },
    'should provide a course': function (course) {
      assert.equal(course.name, testCourseName);
    }
  }
})).run();
