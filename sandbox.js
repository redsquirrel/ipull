redis = require("redis")
sys = require("sys")
courses = require("./courses")

client = redis.createClient();

process.on('uncaughtException', function(e) {
  console.log("Something unawesome happened: " + e.message);
  client.quit();
});

courses.deleteAll(client, function() {
  courses.create(client, {name: "Thoreau in the 21st Century"}, function() {
    courses.all(client, function(courses) {
      console.log(courses)
      client.quit();
    });
  });  
});


