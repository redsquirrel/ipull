var assert = require('assert');
var vows = require('vows');
var Course = require('../course');

var augustFirst2011 = 1312174800000,
    julySixteenth2011 = 1310850939659;

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
  daysToJoin: {
    topic: function() {
      var course = new Course();
      course["decision-date"] = augustFirst2011;
      return course;
    },
    "subtracts now from the decision date": function(course) {
      var now = julySixteenth2011;
      assert.equal(course.daysToJoin(now), 15);
    }
  }
  ,
  inFlight: {
    topic: function() {
      var course = new Course();
      course["min-learners"] = 1;
      course["start-date"] = augustFirst2011;
      return course;
    },
    "if we have enough people and the course has started": function(course) {
      var now = 1312320183992; // aka August 2, 2011
      var learners = [{id: 80, name: "Dave"}];
      assert.isTrue(course.inFlight(learners, now));
    }
  } ,
  purchasableBy: {
    topic: function() {
      var course = new Course();
      course["decision-date"] = augustFirst2011;
      return course;
    },
    "is true if before decision date": function(course) {
      var now = julySixteenth2011; 
      assert.ok(course.purchasableBy(null, [], now));
    },
    "is false if after decision date": function(course) {
      var now = 1315313726000; // aka September 6, 2011
      assert.equal(course.purchasableBy(null, [], now), false);
    },
    "is false if learner has already joined": function(course) {
      var now = julySixteenth2011; 
      var learner = {username: "dave"};
      var learners = [{username: "staci"}, {username: "dave"}];
      assert.equal(course.purchasableBy(learner, learners, now), false);
    },
    "is true if learner hasn't joined yet": function(course) {
      var now = julySixteenth2011; 
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
  ,
  date: {
    topic: function() {
			return new Course()
		},
    "converts integers into MM/DD/YYYY": function(course) {
      course["decision-date"] = 1349067600;
      assert.equal(course.date("decision-date"), "10/01/2012");
    },
		"plays nice when there is no date data": function(course) {
      course["decision-date"] = undefined;
      assert.equal(course.date("decision-date"), "");
		} 
  }
}).export(module);
