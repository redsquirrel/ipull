redis = require("redis")
net = require("net")

client = redis.createClient();

var attributes = ["name"];

client.incr("courses:ids", function(err, courseId) {
  client.sadd("courses", courseId);
  client.set("courses:"+courseId+":name", "Thoreau in the 21st century");

  client.smembers("courses", function(err, courseIds) {
    console.log("ids:"+courseIds)

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
      console.log(courses);
      client.quit()
    });


  });

});
