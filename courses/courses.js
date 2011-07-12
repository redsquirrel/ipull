var util = require('util');
var RedisModel = require('../redis-model').RedisModel;
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
  "description"
];
var allAttributes = ["permalink"].concat(safeAttributes);

function Courses(redis, namespace) {
  RedisModel.call(this, redis, namespace);
  var n = this._namespaced;
  
  this.all = function(callback) {
    redis.lrange(n("course_ids_by_name"), 0, -1, function(error, courseIds) {
      if (error) return callback(error);

      var multi = redis.multi();
      eachKey(courseIds, function(courseId, attribute) {
        multi.get(n("courses:"+courseId+":"+attribute));
      });
      multi.exec(function(error, courseData) {
        callback(error, hydrate(courseData, courseIds));
      });
    });
  };
  
  this.findByPermalink = function(permalink, callback) {
    redis.hget(n("courses:permalinks:ids"), permalink, function(err, courseId) {
      find(courseId, callback);
    });
  };
  
  this.updateByPermalink = function(permalink, data, callback) {
    this.findByPermalink(permalink, function(error, course) {
      setAttributes(course.id, data)
      find(course.id, callback);
    });
  };
  
  this.create = function(data, callback) {
    if (!data.name) return callback("Missing name!");

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
        redis.del(n("course_ids_by_name"), function() {
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
        var multi = redis.multi();
        allAttributes.forEach(function(attribute) {
          multi.get(n("courses:"+courseId+":"+attribute));      
        });
        multi.exec(function(error, courseData) {
          callback(error, hydrate(courseData, [courseId])[0]);
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
    for (var attribute in data) {
      if (safeAttributes.indexOf(attribute) >= 0) {
        redis.set(n("courses:"+courseId+":"+attribute), data[attribute]);
      }
    }
  };

  function resetSortedCourseIds(callback) {
    redis.sort(
      n("courses"),
      "BY",
      n("courses:*:name"),
      "ALPHA",
      "STORE",
      n("course_ids_by_name"),
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
    var course = {id: courseIds[courseIdCounter++]};
    for (var a = 0; a < allAttributes.length; a++) {
      course[allAttributes[a]] = courseData[c+a];
    }
    courses.push(course);
  }
  return courses;
}

util.inherits(Courses, RedisModel);
module.exports.Courses = Courses;