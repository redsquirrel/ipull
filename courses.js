var sys = require("sys");
var seo = require("./seo");

var allAttributes = ["name", "permalink"];

module.exports.Courses = function(redis, namespace) {
  function namespaced(key) {
    if (namespace) {
      return namespace + ":" + key;
    } else {
      return key;
    }
  }
  
  var setPermalink = function(name, courseId, index, callback) {
    var suffix;
    if (index) {
      suffix = "-" + index;
    } else {
      suffix = "";
    }

    var permalink = seo.sluggify(name) + suffix;
    this.findByPermalink(permalink, function(error, foundCourse) {
      if (foundCourse) {
        setPermalink(name, courseId, index+1, callback);
      } else {
        redis.hset(namespaced("courses:permalinks:ids"), permalink, courseId);
        redis.set(namespaced("courses:"+courseId+":permalink"), permalink);
        callback();
      }
    }.bind(this));
  }.bind(this);
  
  this.all = function(callback) {
    redis.smembers(namespaced("courses"), function(error, courseIds) {
      var multi = redis.multi();
      eachKey(courseIds, function(courseId, attribute) {
        multi.get(namespaced("courses:"+courseId+":"+attribute));
      });
      multi.exec(function(error, courseData) {
        callback(error, hydrate(courseData, courseIds));
      });
    });
  };

  this.find = function(courseId, callback) {
    redis.sismember(namespaced("courses"), courseId, function(error, result) {
      if (result) {
        var multi = redis.multi();
        allAttributes.forEach(function(attribute) {
          multi.get(namespaced("courses:"+courseId+":"+attribute));      
        });
        multi.exec(function(error, courseData) {
          callback(error, hydrate(courseData, [courseId])[0]);
        });
      } else {
        callback();
      }
    })
  };
  
  this.findByPermalink = function(permalink, callback) {
    redis.hget(namespaced("courses:permalinks:ids"), permalink, function(err, courseId) {
      this.find(courseId, callback);
    }.bind(this));
  };

  this.create = function(data, callback) {
    if (!data.name) throw "Missing name in " + sys.inspect(data);
    
    redis.incr(namespaced("courses:ids"), function(err, courseId) {      
      setPermalink(data.name, courseId, 0, function() {
        redis.sadd(namespaced("courses"), courseId);
        for (var attribute in data) {
          redis.set(namespaced("courses:"+courseId+":"+attribute), data[attribute]);
        }
        if (callback) {
          this.find(courseId, callback);
        }
      }.bind(this));
    }.bind(this));
  };

  this.delete = function(courseId, callback) {
    redis.srem(namespaced("courses"), courseId);
    allAttributes.forEach(function(attribute) {
      redis.del(namespaced("courses:"+courseId+":"+attribute));
    });
    if (callback) callback();
  };

  this.deleteAll = function(callback) {
    redis.smembers(namespaced("courses"), function(err, courseIds) {
      courseIds.forEach(function(courseId) {
        this.delete(courseId);
      }.bind(this));
      redis.del(namespaced("courses"), function() {
        redis.del(namespaced("courses:ids"), function() {
          redis.del(namespaced("courses:permalinks:ids"), callback);
        });
      })
    }.bind(this));
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
  for (var c = 0; c < courseData.length; c += allAttributes.length) {
    var course = {id: courseIds[c]};
    for (var a = 0; a < allAttributes.length; a++) {
      course[allAttributes[a]] = courseData[c+a];
    }
    courses.push(course);
  }
  return courses;
}
