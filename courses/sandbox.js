redis = require("redis");
sys = require("sys");
Courses = require("./courses").Courses;

client = redis.createClient();
courses = new Courses(client);

process.on('uncaughtException', function(e) {
  console.log("Something unawesome happened: " + e.message);
  client.quit();
});

courses.deleteAll(function() {
  courses.create({name: "Thoreau in the 21st Century"}, function() {
    courses.create({name: "13th Century Mongolian Art"}, function() {
      courses.all(function(error, courses) {
        console.log(courses)
        client.quit();
      });
    });
  });  
});


