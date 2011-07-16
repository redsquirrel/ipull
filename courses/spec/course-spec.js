var assert = require('assert');
var vows = require('vows');
var Course = require('../course');

vows.describe('courses').addBatch({
  learnersNeeded: {
    topic: function() {
      var course = new Course();
      course["min-learners"] = 42;
      course["participant-count"] = 25;
      return course;
    },
    "subtracts the participant count from the minimum": function(course) {
      assert.equal(course.learnersNeeded(), 17);
    }
  }
  ,
  timeToJoin: {
    topic: function() {
      var course = new Course();
      var augustFirst2011 = 1312174800000;
      course["decision-date"] = augustFirst2011;
      return course;
    },
    "subtracts the participant count from the minimum": function(course) {
      var now = 1310850939659; // aka July 16, 2011
      assert.equal(course.timeToJoin(now), 1323860341);
    }
  }
}).export(module);