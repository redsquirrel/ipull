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
var allAttributes = ["permalink", "updates"].concat(safeAttributes);
var requiredAttributes = ["name", "creator-id", "decision-date", "start-date"];

module.exports = Courses = function(redis, namespace) {
  RedisModel.call(this, redis, namespace);
  var n = require("../redis-util").namespaced(namespace);
  
  var fn = this; // create alias so we don't have to bind context to functions
  
  fn.allByLearnerId = function(learnerId, callback) {
    fn.all("learners:"+learnerId+":course-ids-by-name", callback);
  };
  
  fn.addLearnerToCourse = function(learnerId, permalink, callback) {
    fn.findByPermalink(permalink, function(error, course) {
      if (error) return callback(error);
      var multi = redis.multi();
      multi.sadd(n("courses:"+course.id+":learners"), learnerId);
      multi.sadd(n("learners:"+learnerId+":courses"), course.id);
      multi.exec(function(error) {
        resetSortedLearnerIds(course.id);
        resetSortedCourseIds("learners:"+learnerId+":courses", "learners:"+learnerId+":course-ids-by-name");
        callback(error, course);
      });
    });
  };
  
  fn.memberOfCourse = function(learnerId, permalink, callback) {
    fn.findByPermalink(permalink, function(error, course) {
      if (error) return callback(error);
      redis.sismember(n("courses:"+course.id+":learners"), learnerId, callback);
    });
  };
  
  fn.all = function(/* sortedListKey?, callback */) {
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
        callback(error, fn.hydrate(courseData, courseIds, allAttributes, Course));
      });
    });
  };
  
  fn.findByPermalink = function(permalink, callback) {
    redis.hget(n("courses:permalinks:ids"), permalink, function(error, courseId) {
      if (error) return callback(error);
      fn.find(courseId, callback);
    });
  };
  
  fn.updateByPermalink = function(permalink, data, callback) {
    if (!data["updater-id"]) return callback({missing: "updater-id"});
    
    this.findByPermalink(permalink, function(error, course) {
      redis.lpush(n("courses:"+course.id+":updates"), JSON.stringify(data), function(error, result) {
        if (error) throw error;
        setAttributes(course.id, data);
        resetSortedCourseIds();
        fn.find(course.id, callback);
      });
    });
  };
  
  this.create = function(data, callback) {
    var missing = [];
    requiredAttributes.forEach(function(attribute) {
      if (!data[attribute]) missing.push(attribute);
    });
    if (missing.length > 0) return callback({missing: missing});

    redis.incr(n("courses:ids"), function(error, courseId) {      
      if (error) return callback(error);

      setPermalink(data.name, courseId, 0, function() {
        redis.sadd(n("courses"), courseId);
        setAttributes(courseId, data);
        resetSortedCourseIds();
        fn.find(courseId, callback);
      });
    });
  };
  
  fn.delete = function(courseId, callback) {
    redis.srem(n("courses"), courseId, function(error) {
      resetSortedCourseIds(function(error) {
        allAttributes.forEach(function(attribute) {
          redis.del(n("courses:"+courseId+":"+attribute));
        });
        if (callback) callback();
      });
    });
  };

  fn.deleteAll = function(callback) {
    redis.smembers(n("courses"), function(err, courseIds) {
      courseIds.forEach(function(courseId) {
        fn.delete(courseId);
      });
    });
    var multi = redis.multi();
    multi.del(n("courses"));
    multi.del(n("course-ids-by-name"));
    multi.del(n("courses:ids"));
    multi.del(n("courses:permalinks:ids"));
    multi.exec(callback);
  };
  
  fn.find = function(courseId, callback) {
    redis.sismember(n("courses"), courseId, function(error, courseExists) {
      if (error) return callback(error);
      
      if (courseExists) {
        var keys = [];
        allAttributes.forEach(function(attribute) {
          keys.push(n("courses:"+courseId+":"+attribute));
        });        
        redis.mget(keys, function(error, courseData) {
          var course = fn.hydrate(courseData, [courseId], allAttributes, Course)[0];
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
    fn.findByPermalink(permalink, function(error, courseWithSameName) {
      if (error) return callback(error);

      if (courseWithSameName) {
        setPermalink(name, courseId, index+1, callback);
      } else {
        redis.hset(n("courses:permalinks:ids"), permalink, courseId);
        redis.set(n("courses:"+courseId+":permalink"), permalink);
        callback();
      }
    });
  };

  function setAttributes(courseId, data) {
    var toUpdate = [];
    for (var attribute in data) {
      var value = typecastAttribute(attribute, data[attribute]);
      if (safeAttributes.indexOf(attribute) >= 0) {
        toUpdate.push(n("courses:"+courseId+":"+attribute));
        toUpdate.push(value);
      }
    }
    
    if (data.name) {
      toUpdate.push(n("courses:"+courseId+":name:lower"));
      toUpdate.push(data.name.toLowerCase());
    }
    redis.mset(toUpdate);
  };

  function resetSortedCourseIds(/* readSetKey?, storeListKey?, callback? */) {
    var readSetKey = arguments[1] ? arguments[0] : "courses";
    var storeListKey = arguments[1] ? arguments[1] : "course-ids-by-name";
    var callback = arguments[1] ? arguments[2] : arguments[0];

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
      n("courses:"+courseId+":learner-ids-by-name"), // used in learners.js
      callback || function(){/*no-op*/}
    );
  }
  
  function typecastAttribute(attributeName, value) {
    var newValue = value;
    if (attributeIsDate(attributeName)) {
      newValue = Date.parse(value) / 1000;
    }
    return newValue;
  }
  
  function attributeIsDate(attributeName) {
    return /\-date$/.test(attributeName);
  }

}

function eachKey(courseIds, callback) {
  courseIds.forEach(function(courseId) {
    allAttributes.forEach(function(attribute) {
      callback(courseId, attribute);
    });
  });
}

util.inherits(Courses, RedisModel);