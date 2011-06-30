var assert = require('assert');
var redis = require('redis');
var vows = require('vows');

var courses = require('../courses');

var testRedis = function() {
  return redis.createClient(53535);
};

var testCourseNames = ["Thoreau in the 21st Century", "13th CenturyMongolian Art"];

var clearData = function() {
  var client = testRedis();
  var callback = this.callback;
  courses.deleteAll(client, function() {
    client.quit();
    callback();
  });
};

var courseCounter = 0;
var newCourse = function() {
  var client = testRedis();
  var callback = this.callback;
  courses.create(client, {name: testCourseNames[courseCounter++]}, function() {
    client.quit();
    callback();
  });
}

var setupBatch = function(tests) {
  var fixtureData = {
    '': {
      topic: clearData,
      '': {
        topic: newCourse,
        '': {
          topic: newCourse
        }
      }
    }
  };
  
  for (var label in tests) {
    fixtureData[''][''][''][label] = tests[label];
  }
  
  return fixtureData;
};

vows.describe('courses').addBatch(setupBatch({
  all: {
    topic: function() {
      courses.all(testRedis, this.callback);
    },
    'should provide all 2 courses': function (courses) {
      assert.equal(courses.length, 2);
    }
  },
  find: {
    topic: function() {
      courses.find(testRedis, 1, this.callback);
    },
    'should provide a course': function (course) {
      assert.equal(course.name, testCourseNames[0]);
    }
  }
})).run();
