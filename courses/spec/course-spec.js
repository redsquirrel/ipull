var assert = require('assert');
var vows = require('vows');
var Course = require('../course');

vows.describe('course').addBatch({
  learnersNeeded: {
    topic: function() {
      var course = new Course();
      course["min-learners"] = 42;
      return course;
    },
    "subtracts the learner count from the minimum": function(course) {
      var learners = [{id: 80, name: "Dave"}];
      assert.equal(course.learnersNeeded(learners), 41);
    }
  }
  ,
  learnersSeatsAvailable: {
    topic: function() {
      var course = new Course();
      course["max-learners"] = 42;
      return course;
    },
    "subtracts the learner count from the computed available seats": function(course) {
      var learners = [{id: 80, name: "Dave"}];
      assert.equal(course.learnersSeatsAvailable(learners), 41);
    }
  }
  ,
  learnersMaxed: {
    topic: function() {
      var course = new Course();
      course["max-learners"] = 1;
      return course;
    },
    "Maximun amount of learners for automatic enrollment exceeded": function(course) {
      var learners = [{id: 80, name: "Dave"}, {id: 90, name: "Jos"}];
      assert.equal(course.learnersMaxed(learners), true);
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
    "subtracts now from the decision date": function(course) {
      var now = 1310850939659; // aka July 16, 2011
      assert.equal(course.timeToJoin(now), 1323860341);
    }
  }
  ,
  inFlight: {
    topic: function() {
      var course = new Course();
      course["min-learners"] = 1;
      var augustFirst2011 = 1312174800000;
      course["start-date"] = augustFirst2011;
      return course;
    },
    "if we have enough people and the course has started": function(course) {
      var now = 1312320183992; // aka August 2, 2011
      var learners = [{id: 80, name: "Dave"}];
      assert.ok(course.inFlight(learners, now));
    }
  } ,
  purchasableBy: {
    topic: function() {
      var course = new Course();
      var augustFirst2011 = 1312174800000;      
      course["decision-date"] = augustFirst2011;
      return course;
    },
    "is true if before decision date": function(course) {
      var now = 1310850939659; // aka July 16, 2011
      assert.ok(course.purchasableBy(null, [], now));
    },
    "is false if after decision date": function(course) {
      var now = 1315313726000; // aka September 6, 2011
      assert.equal(course.purchasableBy(null, [], now), false);
    },
    "is false if learner has already joined": function(course) {
      var now = 1310850939659; // aka July 16, 2011
      var learner = {username: "dave"};
      var learners = [{username: "staci"}, {username: "dave"}];
      assert.equal(course.purchasableBy(learner, learners, now), false);
    },
    "is true if learner hasn't joined yet": function(course) {
      var now = 1310850939659; // aka July 16, 2011
      var learner = {username: "dave"};
      var learners = [{username: "staci"}, {username: "charlie"}];
      assert.ok(course.purchasableBy(learner, learners, now));
    }
  }
  ,
  purchasedBy: {
    topic: new Course(),
    "is true if learner is in the learners list": function(course) {
      var learner = {username: "dave"};
      var learners = [{username: "staci"}, {username: "dave"}];
      assert.ok(course.purchasedBy(learner, learners));
    },
    "is false if learner is null": function(course) {
      assert.equal(course.purchasedBy(null, []), false);
    },
    "is false if learner is not in the learners list": function(course) {
      var learner = {username: "dave"};
      var learners = [{username: "staci"}, {username: "charlie"}];
      assert.equal(course.purchasedBy(learner, learners), false);
    }
  }
}).export(module);
