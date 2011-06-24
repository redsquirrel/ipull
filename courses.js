module.exports.all = function(redis, attributes, callback) {
  redis.smembers("courses", function(error, courseIds) {
    var multi = redis.multi();
    courseIds.forEach(function(courseId) {
      attributes.forEach(function(attribute) {
        multi.get("courses:"+courseId+":"+attribute);
      });
    });
    multi.exec(function(error, courseData) {
      var courses = new Array();
      for (var i = 0; i < courseData.length; i++) {
        var course = new Object();
        for (var j = 0; j < attributes.length; j++) {
          course[attributes[j]] = courseData[i+j];
        }
        courses.push(course);
      }
      callback(courses);
    });
  });
};