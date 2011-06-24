var redis = require("redis");
var sys = require("sys");

module.exports.all = function(attributes, callback) {
  
  var client = redis.createClient();
  client.smembers("courses", function(error, courseIds) {
    var multi = client.multi();    
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
      client.quit(); // how to ensure this gets closed... stays open if something explodes up above...
      callback(courses);
    });
  });
};