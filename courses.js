module.exports.all = function(redis, attributes, callback) {
  redis.smembers("courses", function(error, courseIds) {
    var multi = redis.multi();
    eachKey(courseIds, attributes, function(courseId, attribute) {
      multi.get("courses:"+courseId+":"+attribute);      
    });
    multi.exec(function(error, courseData) {
      callback(hydrate(courseIds, courseData, attributes));
    });
  });
};

var allAttributes = ["name"];

module.exports.find = function(redis, courseId, callback) {
  var multi = redis.multi();
  allAttributes.forEach(function(attribute) {
    multi.get("courses:"+courseId+":"+attribute);      
  });
  multi.exec(function(error, courseData) {
    callback(hydrate([courseId], courseData, allAttributes)[0]);
  });  
}

function eachKey(courseIds, attributes, callback) {
  courseIds.forEach(function(courseId) {
    attributes.forEach(function(attribute) {
      callback(courseId, attribute);
    });
  });
}

function hydrate(courseIds, courseData, attributes) {
  var courses = [];
  for (var c = 0; c < courseData.length; c++) {
    var course = {id: courseIds[c]};
    for (var a = 0; a < attributes.length; a++) {
      course[attributes[a]] = courseData[c+a];
    }
    courses.push(course);
  }
  return courses;
}