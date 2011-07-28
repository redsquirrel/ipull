var util = require('util');
var RedisModel = require('../redis-model');
var Course = require('./course');
var seo = require('../seo');

var safeAttributes = [
  "name",
  "price",
  "min-learners",
  "max-learners",
  "decision-date",
  "start-date",
  "end-date",
  "location",
  "summary",
  "description",
  "creator-id",
  "updater-id"
];
var allAttributes = ["permalink"].concat(safeAttributes);
var requiredAttributes = ["name", "creator-id"];

module.exports = Courses = function(redis, namespace) {
  RedisModel.call(this, redis, namespace);
  var n = require("../redis-util").namespaced(namespace);
  
  this.allByLearnerId = function(learnerId, callback) {
    this.all("course-ids-by-name:learners:"+learnerId, callback);
  };
  
  this.addLearnerToCourse = function(learnerId, permalink, callback) {
    this.findByPermalink(permalink, function(error, course) {
      if (error) return callback(error);
      redis.sadd(n("courses:"+course.id+":learners"), learnerId, function(error) {
        if (error) return callback(error);
        redis.sadd(n("learners:"+learnerId+":courses"), course.id, function(error) {
          if (error) return callback(error);
          resetSortedLearnerIds(course.id, function(error) {
            if (error) return callback(error);
            resetSortedCourseIds(
              "learners:"+learnerId+":courses",
              "course-ids-by-name:learners:"+learnerId,
              function(error) {
                callback(error, course);
              }
            );            
          });
        });
      });
    });
  };
  
  this.all = function(/* sortedListKey?, callback */) {
    var sortedListKey = arguments[1] ? arguments[0] : "course-ids-by-name";
    var callback = arguments[1] || arguments[0];

    redis.lrange(n(sortedListKey), 0, -1, function(error, courseIds) {
      if (error) return callback(error);
      if (courseIds.length == 0) return callback(null, []);
      
      var keys = [];
      eachKey(courseIds, function(courseId, attribute) {
        keys.push(n("courses:"+courseId+":"+attribute));
      });
      redis.mget(keys, function(error, courseData) {
        callback(error, hydrate(courseData, courseIds));
      });
    });
  };
  
  this.findByPermalink = function(permalink, callback) {
    redis.hget(n("courses:permalinks:ids"), permalink, function(error, courseId) {
      if (error) return callback(error);
      find(courseId, callback);
    });
  };
  
  this.updateByPermalink = function(permalink, data, callback) {
    if (!data["updater-id"]) return callback({missing: "updater-id"});
    
    this.findByPermalink(permalink, function(error, course) {
      redis.lpush(n("courses:"+course.id+":updates"), JSON.stringify(data), function(error, result) {
        if (error) throw error;
        setAttributes(course.id, data);
        resetSortedCourseIds();
        find(course.id, callback);
      });
    });
  };
  
  this.create = function(data, callback) {
    var missing = [];
    requiredAttributes.forEach(function(attribute) {
      if (!data[attribute]) {
        missing.push(attribute);
      }
    });
    if (missing.length > 0) {
      return callback({missing: missing});
    }

    redis.incr(n("courses:ids"), function(error, courseId) {      
      if (error && callback) return callback(error);

      setPermalink(data.name, courseId, 0, function() {
        redis.sadd(n("courses"), courseId);
        setAttributes(courseId, data);
        resetSortedCourseIds();
        if (callback) find(courseId, callback);
      });
    });
  };
  
  this.delete = function(courseId, callback) {
    redis.srem(n("courses"), courseId, function(error, _) {
      resetSortedCourseIds(function(error, _) {
        redis.keys(n("courses:"+courseId+":*"), function(error, keys) {
          keys.forEach(function(key) {
            redis.del(key);
          });
        });
        if (callback) callback();
      });
    });
  };

  this.deleteAll = function(callback) {
    redis.smembers(n("courses"), function(err, courseIds) {
      courseIds.forEach(function(courseId) {
        this.delete(courseId);
      }.bind(this));
      redis.del(n("courses"), function() {
        redis.del(n("course-ids-by-name"), function() {
          redis.del(n("courses:ids"), function() {
            redis.del(n("courses:permalinks:ids"), callback);
          });
        });
      })
    }.bind(this));
  };
  
  function find(courseId, callback) {
    redis.sismember(n("courses"), courseId, function(error, courseExists) {
      if (error) return callback(error);
      
      if (courseExists) {
        var keys = [];
        allAttributes.forEach(function(attribute) {
          keys.push(n("courses:"+courseId+":"+attribute));
        });
        
        redis.mget(keys, function(error, courseData) {
          var course = hydrate(courseData, [courseId])[0];
          callback(error, course);
        });
      } else {
        callback();
      }
    });
  };
  
  var setPermalink = function(name, courseId, index, callback) {
    var suffix = index ? "-" + index : "";
    var permalink = seo.sluggify(name) + suffix;
    this.findByPermalink(permalink, function(error, foundCourse) {
      if (error) return callback(error);

      if (foundCourse) {
        setPermalink(name, courseId, index+1, callback);
      } else {
        redis.hset(n("courses:permalinks:ids"), permalink, courseId);
        redis.set(n("courses:"+courseId+":permalink"), permalink);
        callback();
      }
    });
  }.bind(this);

  function setAttributes(courseId, data) {
    // How to convert this to redis.mset(...) ???
    for (var attribute in data) {
      if (safeAttributes.indexOf(attribute) >= 0) {
        redis.set(n("courses:"+courseId+":"+attribute), data[attribute]);
      }
    }
    if (data.name) {
      redis.set(n("courses:"+courseId+":name:lower"), data.name.toLowerCase());
    }
  };

  function resetSortedCourseIds(/* readSetKey?, storeListKey?, callback? */) {
    var readSetKey = arguments[2] ? arguments[0] : "courses";
    var storeListKey = arguments[2] ? arguments[1] : "course-ids-by-name";
    var callback = arguments[2] || arguments[0];
    
    redis.sort(
      n(readSetKey),
      "BY",
      n("courses:*:name:lower"),
      "ALPHA",
      "STORE",
      n(storeListKey),
      callback || function(){/*no-op*/}
    );
  }

  function resetSortedLearnerIds(courseId, callback) {
    redis.sort(
      n("courses:"+courseId+":learners"),
      "BY",
      n("learners:*:name:lower"),
      "ALPHA",
      "STORE",
      n("courses:"+courseId+":learner-ids-by-name"),
      callback || function(){/*no-op*/}
    );
  }

}

function eachKey(courseIds, callback) {
  courseIds.forEach(function(courseId) {
    allAttributes.forEach(function(attribute) {
      callback(courseId, attribute);
    });
  });
}

function hydrate(courseData, courseIds) {
  var courses = [];
  var courseIdCounter = 0;
  for (var c = 0; c < courseData.length; c += allAttributes.length) {
    var course = new Course(courseIds[courseIdCounter++]);
    for (var a = 0; a < allAttributes.length; a++) {
      course[allAttributes[a]] = courseData[c+a];
    }
    courses.push(course);
  }
  return courses;
}

util.inherits(Courses, RedisModel);