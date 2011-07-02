
var allAttributes = ["name"];

module.exports.Courses = function(redis, namespace) {
  function namespaced(key) {
    if (namespace) {
      return namespace + ":" + key;
    } else {
      return key;
    }
  };
  
  this.all = function(callback) {
    redis.smembers(namespaced("courses"), function(error, courseIds) {
      var multi = redis.multi();
      eachKey(courseIds, function(courseId, attribute) {
        multi.get("courses:"+courseId+":"+attribute);      
      });
      multi.exec(function(error, courseData) {
        callback(null, hydrate(courseData, courseIds));
      });
    });
  };

  this.find = function(courseId, callback) {
    var multi = redis.multi();
    allAttributes.forEach(function(attribute) {
      multi.get(namespaced("courses:"+courseId+":"+attribute));      
    });
    multi.exec(function(error, courseData) {
      callback(null, hydrate(courseData, [courseId])[0]);
    });
  };

  this.create = function(data, callback) {
    var my = this;
    redis.incr(namespaced("courses:ids"), function(err, courseId) {      
      redis.sadd(namespaced("courses"), courseId);
      for (var attribute in data) {
        redis.set(namespaced("courses:"+courseId+":"+attribute), data[attribute]);
      }
      if (callback) {
        my.find(courseId, callback);
      }
    });
  };

  this.delete = function(courseId, callback) {
    redis.srem(namespaced("courses"), courseId);
    allAttributes.forEach(function(attribute) {
      redis.del(namespaced("courses:"+courseId+":"+attribute));
      if (callback) callback();
    });
  };

  this.deleteAll = function(callback) {
    var my = this;
    redis.smembers(namespaced("courses"), function(err, courseIds) {
      courseIds.forEach(function(courseId) {
        my.delete(courseId);
      });
      redis.del(namespaced("courses"), function() {
        redis.del(namespaced("courses:ids"), callback);
      })
    });
  };
  
  this.disconnect = function() {
    redis.quit();
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
  for (var c = 0; c < courseData.length; c++) {
    var course = {id: courseIds[c]};
    for (var a = 0; a < allAttributes.length; a++) {
      course[allAttributes[a]] = courseData[c+a];
    }
    courses.push(course);
  }
  return courses;
}