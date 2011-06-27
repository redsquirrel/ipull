var courses = require('./courses');

module.exports.index = function(connect, _, res) {
  var client = connect(); 

  process.on('uncaughtException', function(e) {
    res.send("Something unawesome happened: " + e.message, 500);
    client.quit();
  });

  courses.all(client, ["name"], function(courses) {
    res.render('courses/index', {courses: courses});
    client.quit();
  });  
};

module.exports.show = function(connect, req, res) {
  var client = connect(); 

  process.on('uncaughtException', function(e) {
    res.send("Something unawesome happened: " + e.message, 500);
    client.quit();
  });

  courses.find(client, req.params.id, function(course) {
    res.render('courses/show', {course: course});
    client.quit();
  });
};