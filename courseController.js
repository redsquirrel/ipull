var courses = require('./courses');

module.exports.index = function(connect, _, res) {
  var client = setupConnection(connect, res);
  
  courses.all(client, function(courses) {
    res.render('courses/index', {courses: courses});
    client.quit();
  });  
};

module.exports.show = function(connect, req, res) {
  var client = setupConnection(connect, res);

  courses.find(client, req.params.id, function(course) {
    res.render('courses/show', {course: course});
    client.quit();
  });
};

function setupConnection(connect, res) {
  var client = connect(); 

  process.on('uncaughtException', function(e) {
    res.send("Something unawesome happened: " + e.message, 500);
    client.quit();
  });
  
  return client;
}