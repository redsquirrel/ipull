var assert = require('assert');
var redis = require('redis');
var vows = require('vows');

var Courses = require('../courses');

var testRedis = function() {
  return redis.createClient(53535);
};

var testCourseNames = [
  "Thoreau in the 21st Century",
  "ancient Mongolian art"
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
    courses.create({name: testCourseNames[count], "creator-id": testCourseCreators[count], "start-date": 1, "decision-date": 1}, function() {
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
     'sorts by name case-insensitively': function(courseData) {
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
   }
  ,
  addLearnerToCourse: {
    topic: function(courses) {
      courses.addLearnerToCourse(80, "thoreau-21st-century", function() {
        this.callback(null, courses)
      }.bind(this));
    },
    'creates linkages': {
      topic: function(courses) {
        courses.findByPermalink("thoreau-21st-century", function(error, course) {
          this.callback(error, {courses: courses, course: course});
        }.bind(this));
      },
      'from course to learners': {
        topic: function(courseData) {
          courseData.courses.memberOfCourse(80, courseData.course.permalink, this.callback);
        },
        'the list of course learners': function(isMember) {
          assert.ok(isMember);
        }
      },
      'from learner to courses': {
        topic: function(courseData) {
          courseData.courses.connection().smembers("addLearnerToCourse:learners:80:courses", function(error, courseIds) {
            courseData.courseIds = courseIds;
            this.callback(error, courseData);
          }.bind(this));
        },
        'the list of courses for the learner': function(courseData) {
          assert.length(courseData.courseIds, 1);
          assert.equal(courseData.courseIds[0], courseData.course.id);
        }
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
      courses.create({name: "Social Psychology", "creator-id": 53, "decision-date": "August 1, 2011", "start-date": "September 1, 2011"}, function(err, course) {
        this.callback(err, {courses: courses, course: course});
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
      },
      'stores the dates as integers': function(topic) {
        assert.equal(topic.course["decision-date"], "1312174800");
        assert.equal(topic.course["start-date"],    "1314853200");
      }
    }
  }
  ,
  "create with malicious data input": {
    topic: function(courses) {
      courses.create({name: "Social Psychology", "plain-password": "abcdefg", "creator-id": 53, "decision-date": 1, "start-date": 1}, function(err, course) {
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
      courses.create({name: testCourseNames[0], "creator-id": 53, "decision-date": 1, "start-date": 1}, function(err, course) {
        this.callback(null, {courses: courses, course: course});
      }.bind(this));
    },
    'has the correct permalink': function(topic) {
      assert.equal(topic.course.permalink, "thoreau-21st-century-1");
    },
    'twice': {
      topic: function(topic) {
        topic.courses.create({name: testCourseNames[0], "creator-id": 53, "decision-date": 1, "start-date": 1}, function(err, course) {
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
      courses.create({"creator-id": 53, "decision-date": 1, "start-date": 1}, function(err, course) {
        this.callback(null, {err: err, course: course})
      }.bind(this));
    },
    'provides an error': function(testData) {
      assert.ok(testData.err);
      assert.isUndefined(testData.course);
    }
  }
  ,
  "create with weird name": {
    topic: function(courses) {
      courses.create({name: "Sup?", "creator-id": 53, "decision-date": 1, "start-date": 1}, this.callback);
    },
    'permalinks predictably': function(course) {
      assert.equal(course.permalink, "sup");
    }
  }
  ,
  updateByPermalink: {
    topic: function(courses) {
      courses.updateByPermalink("ancient-mongolian-art", {
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
      courses.updateByPermalink("ancient-mongolian-art", { summary: "What, what?" }, function(error, course) {
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
