module.exports.all = function(redis, attributes, callback) {
  redis.smembers("courses", function(error, courseIds) {
    var multi = redis.multi();
    eachKey(courseIds, attributes, function(courseId, attribute) {
      multi.get("courses:"+courseId+":"+attribute);      
    });
    multi.exec(function(error, courseData) {
      callback(hydrate(courseData, attributes));
    });
  });
};

function eachKey(courseIds, attributes, callback) {
  courseIds.forEach(function(courseId) {
    attributes.forEach(function(attribute) {
      callback(courseId, attribute);
    });
  });
}

function hydrate(courseData, attributes) {
  var courses = new Array();
  for (var c = 0; c < courseData.length; c++) {
    var course = new Object();
    for (var a = 0; a < attributes.length; a++) {
      course[attributes[a]] = courseData[c+a];
    }
    courses.push(course);
  }
  return courses;
}