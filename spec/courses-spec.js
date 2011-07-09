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
    courses.deleteAll(function() {
      this.callback(null, courses);
    }.bind(this));
  };

  var courseCounter = 0;
  var newCourse = function(courses) {
    courses.create({name: testCourseNames[courseCounter++]}, function() {
      this.callback(null, courses);
    }.bind(this));
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
     },
     'sorts by name': function(courseData) {
       assert.equal(courseData[0].name, testCourseNames[1]);  
     }
   }
   ,
   findByPermalink: {
     topic: function(courses) {
       courses.findByPermalink("thoreau-21st-century", this.callback);
     },
     'provides the course by name': function(courseData) {
       assert.equal(courseData.name, testCourseNames[0]);
     }
   }
  ,
  create: {
    topic: function(courses) {
      courses.create({name: "Social Psychology"}, function(err, course) {
        this.callback(null, {courses: courses, course: course});
      }.bind(this));
    },
    'adds another awesome course': {
      topic: function(topic) {
        topic.courses.all(function(err, courses) {
          this.callback(null, {course: topic.course, courses: courses});
        }.bind(this));
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
  "create with malicious data input": {
    topic: function(courses) {
      courses.create({name: "Social Psychology", "plain-password": "abcdefg"}, function(err, course) {
        this.callback(null, {courses: courses, course: course});
      }.bind(this));
    },
    'does not show up in the resulting object': function(topic) {
      assert.equal(topic.course.name, "Social Psychology");
      assert.isUndefined(topic.course["plain-password"]);
    },
    'and checking directly against redis': {
      topic: function(topic) {
        var client = topic.courses.connection();
        client.get("create with malicious data input:courses:"+topic.course.id+":plain-password", this.callback);
      },
      'does not show up': function(maliciousData) {
        assert.isNull(maliciousData);
      }
    }
  }  
  ,
  "create with same name": {
    topic: function(courses) {
      courses.create({name: testCourseNames[0]}, function(err, course) {
        this.callback(null, {courses: courses, course: course});
      }.bind(this));
    },
    'has the correct permalink': function(topic) {
      assert.equal(topic.course.permalink, "thoreau-21st-century-1");
    },
    'twice': {
      topic: function(topic) {
        topic.courses.create({name: testCourseNames[0]}, function(err, course) {
          this.callback(null, {courses: topic.courses, course: course});
        }.bind(this));
      },
      'has the correct permalink': function(topic) {
        assert.equal(topic.course.permalink, "thoreau-21st-century-2");
      }    
    }
  }
  ,
  "create without a name": {
    topic: function(courses) {
      this.callback(null, courses);
    },
    'provides an error': function(courses) {
      courses.create({foo: "bar"}, function(err, course) {
        assert.ok(err);
        assert.isUndefined(course);
      });      
    }
  }
  ,
  "updateByPermalink": {
    topic: function(courses) {
      courses.updateByPermalink("13th-century-mongolian-art", {summary: "The history of the steppe tribes is a very complex one."}, this.callback);
    },
    'provides an error': function(course) {
      assert.equal(course.summary, "The history of the steppe tribes is a very complex one.");
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
        assert.length(courseData, 1);
      }      
    }
  }
})).run();
