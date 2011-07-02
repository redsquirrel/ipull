var assert = require('assert');
var redis = require('redis');
var vows = require('vows');

var Courses = require('../courses').Courses;

var testRedis = function() {
  return redis.createClient(53535);
};

var testCourseNames = [
  "Thoreau in the 21st Century",
  "13th Century Mongolian Art"
];

var fixtureData = function(label, vow) {
  var namespaceCourses = function() {
    var courses = new Courses(testRedis(), label);
    this.callback(null, courses);
  }

  var clearData = function(courses) {
    var callback = this.callback;
    courses.deleteAll(function() {
      callback(null, courses);
    });
  };

  var courseCounter = 0;
  var newCourse = function(courses) {
    var callback = this.callback;
    courses.create({name: testCourseNames[courseCounter++]}, function() {
      callback(null, courses);
    });
  }

  var closeRedis = function(courses) {
    courses.disconnect();
  }

  return {
    '': {
      topic: namespaceCourses,
      '': {
        topic: clearData,
        '': {
          topic: newCourse,
          '': {
            topic: newCourse,
            '': vow,
            teardown: closeRedis
          }
        }
      }
    }
  };
}

var setupBatch = function(vows) {
  var batch = {};
  for (var label in vows) {
    batch[label] = fixtureData(label, vows[label]);
  }
  return batch;
};

vows.describe('courses').addBatch(setupBatch({
  all: {
     topic: function(courses) {
       courses.all(this.callback);
     },
     'provides both courses': function(courseData) {
       assert.length(courseData, 2);
     }
   }
   ,
   find: {
     topic: function(courses) {
       courses.find(1, this.callback);
     },
     'provides a specific course': function(courseData) {
       assert.equal(courseData.name, testCourseNames[0]);
     }
   }
   ,
  create: {
    topic: function(courses) {
      var callback = this.callback;
      courses.create({name: "Social Psychology"}, function(err, course) {
        callback(null, {courses: courses, course: course});
      });
    },
    'adds another awesome course': {
      topic: function(topic) {
        var callback = this.callback;
        topic.courses.all(function(err, courses) {
          callback(null, {course: topic.course, courses: courses});
        });
      },
      'with the correct name': function(topic) {
        assert.equal(topic.course.name, "Social Psychology");
      },
      'so there are now three courses': function(topic) {
        assert.length(topic.courses, 3);
      }
    }
  }
  ,
  delete: {
    topic: function(courses) {
      var callback = this.callback;
      courses.delete(1, function() { callback(null, courses) });
    },
    'removes a course': {
      topic: function(courses) {
        courses.all(this.callback);
      },
      'so there is now only one course': function(courseData) {
        assert.equal(courseData.length, 1);
      }      
    }
  }
})).run();
