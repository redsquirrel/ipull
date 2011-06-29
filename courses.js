var courses;
module.exports = courses = {};

var allAttributes = ["name"];

// TODO: Need to handle quit() in create/delete/deleteAll

courses.all = function(redis, callback) {
  redis = connect(redis);
  redis.smembers("courses", function(error, courseIds) {
    var multi = redis.multi();
    eachKey(courseIds, function(courseId, attribute) {
      multi.get("courses:"+courseId+":"+attribute);      
    });
    multi.exec(function(error, courseData) {
      callback(null, hydrate(courseData, courseIds));
      redis.quit();
    });
  });
};

courses.find = function(redis, courseId, callback) {
  redis = connect(redis);
  var multi = redis.multi();
  allAttributes.forEach(function(attribute) {
    multi.get("courses:"+courseId+":"+attribute);      
  });
  multi.exec(function(error, courseData) {
    callback(null, hydrate(courseData, [courseId])[0]);
    redis.quit();
  });
};

courses.create = function(redis, data, callback) {
  redis = connect(redis);
  redis.incr("courses:ids", function(err, courseId) {
    redis.sadd("courses", courseId);
    for (var attribute in data) {
      redis.set("courses:"+courseId+":"+attribute, data[attribute]);
    }
    if (callback) {
      courses.find(redis, courseId, callback);
    }
  });
};

courses.delete = function(redis, courseId, callback) {
  redis = connect(redis);
  redis.srem("courses", courseId);
  allAttributes.forEach(function(attribute) {
    redis.del("courses:"+courseId+":"+attribute);
    if (callback) callback();
  });
};

courses.deleteAll = function(redis, callback) {
  redis = connect(redis);
  redis.smembers("courses", function(err, courseIds) {
    courseIds.forEach(function(courseId) {
      courses.delete(redis, courseId);
    });
    redis.del("courses", function() {
      redis.del("courses:ids", callback);
    })
  });
};

function connect(redis) {
  if (typeof redis == 'function') redis = redis();
  return redis;
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