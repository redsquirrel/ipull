var assert = require('assert');
var redis = require('redis');
var vows = require('vows');

var Courses = require('../courses');

var testRedis = function() {
  return redis.createClient(53535);
};

var testCourseNames = [
  "Thoreau in the 21st Century",
  "13th Century Mongolian Art"
];

var testCourseCreators = [53, 80];

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
    var count = courseCounter++;
    courses.create({name: testCourseNames[count], "creator-id": testCourseCreators[count]}, function() {
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
     },
     'populates the data correctly': function(courseData) {
       assert.equal(courseData[0]["creator-id"], testCourseCreators[1]);  
     }
   }
   ,
   findByPermalink: {
     topic: function(courses) {
       courses.findByPermalink("thoreau-21st-century", this.callback);
     },
     'provides the course by name': function(course) {
       assert.equal(course.name, testCourseNames[0]);
     },
     'provides the number of learners': function(course) {
       assert.length(course.learnerIds, 0);
     }
   }
  ,
  addLearnerToCourse: {
    topic: function(courses) {
      courses.addLearnerToCourse(80, "thoreau-21st-century", function() {
        this.callback(null, courses)
      }.bind(this));
    },
    'after the course has been reloaded': {
      topic: function(courses) {
        courses.findByPermalink("thoreau-21st-century", this.callback);
      },
      'shows a greater number of learners': function(course) {
        assert.length(course.learnerIds, 1);
      },
      'provides a list of the participating learners': function(course) {
        assert.equal(course.learnerIds[0], 80);
      }
    }
  }
  ,
  allByLearnerId: {
    topic: function(courses) {
      courses.addLearnerToCourse(80, "thoreau-21st-century", function() {
        this.callback(null, courses)
      }.bind(this));
    },
    'shows all courses': {
      topic: function(courses) {
        courses.allByLearnerId(80, this.callback);
      },
      'for a specific learner': function(courseData) {
        assert.length(courseData, 1);
      }
    }
  }
  ,
  create: {
    topic: function(courses) {
      courses.create({name: "Social Psychology", "creator-id": 53}, function(err, course) {
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
      },
      "stores the learner's id": function(topic) {
        assert.equal(topic.course["creator-id"], 53);
      }
    }
  }
  ,
  "create with malicious data input": {
    topic: function(courses) {
      courses.create({name: "Social Psychology", "plain-password": "abcdefg", "creator-id": 53}, function(err, course) {
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
      'it does not show up': function(maliciousData) {
        assert.isNull(maliciousData);
      }
    }
  }  
  ,
  "create with same name": {
    topic: function(courses) {
      courses.create({name: testCourseNames[0], "creator-id": 53}, function(err, course) {
        this.callback(null, {courses: courses, course: course});
      }.bind(this));
    },
    'has the correct permalink': function(topic) {
      assert.equal(topic.course.permalink, "thoreau-21st-century-1");
    },
    'twice': {
      topic: function(topic) {
        topic.courses.create({name: testCourseNames[0], "creator-id": 53}, function(err, course) {
          this.callback(null, {courses: topic.courses, course: course});
        }.bind(this));
      },
      'has the correct permalink': function(topic) {
        assert.equal(topic.course.permalink, "thoreau-21st-century-2");
      }    
    }
  }
  ,
  "create without a learner": {
    topic: function(courses) {
      courses.create({name: "Bypassing authentication for fun and profit"}, function(err, course) {
        this.callback(null, {err: err, course: course})
      }.bind(this));
    },
    'provides an error': function(testData) {
      assert.ok(testData.err);
      assert.isUndefined(testData.course);
    }
  }
  ,
  "create without a name": {
    topic: function(courses) {
      courses.create({"creator-id": 53}, function(err, course) {
        this.callback(null, {err: err, course: course})
      }.bind(this));
    },
    'provides an error': function(testData) {
      assert.ok(testData.err);
      assert.isUndefined(testData.course);
    }
  }
  ,
  updateByPermalink: {
    topic: function(courses) {
      courses.updateByPermalink("13th-century-mongolian-art", {
        summary: "The history of the steppe tribes is a very complex one.",
        "updater-id": 53
      }, function(error, course) {
        this.callback(error, {course: course, courses: courses});
      }.bind(this));
    },
    'saves the new summary': function(topic) {
      assert.equal(topic.course.summary, "The history of the steppe tribes is a very complex one.");
    },
    'saves the learner': function(topic) {
      assert.equal(topic.course["updater-id"], 53);
    },
    'audits the update': {
      topic: function(topic) {
        topic.courses.connection().llen("updateByPermalink:courses:"+topic.course.id+":updates", this.callback);;
      },
      'by adding to an "updates" list': function(updateListLength) {
        assert.equal(updateListLength, 1);
      }
    }
  }
  ,
  "updateByPermalink without updater": {
    topic: function(courses) {
      courses.updateByPermalink("13th-century-mongolian-art", { summary: "What, what?" }, function(error, course) {
        this.callback(null, {error: error, course: course});
      }.bind(this));
    },
    'provides an error': function(testData) {
      assert.ok(testData.error);
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
})).export(module);
