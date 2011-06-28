var allAttributes = ["name"];

module.exports.all = function(redis, callback) {
  redis.smembers("courses", function(error, courseIds) {
    var multi = redis.multi();
    eachKey(courseIds, function(courseId, attribute) {
      multi.get("courses:"+courseId+":"+attribute);      
    });
    multi.exec(function(error, courseData) {
      callback(hydrate(courseData, courseIds));
    });
  });
};

module.exports.find = function(redis, courseId, callback) {
  var multi = redis.multi();
  allAttributes.forEach(function(attribute) {
    multi.get("courses:"+courseId+":"+attribute);      
  });
  multi.exec(function(error, courseData) {
    callback(hydrate(courseData, [courseId])[0]);
  });  
};

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