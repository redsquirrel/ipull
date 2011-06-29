var courses = require('./courses');

module.exports.index = function(connect, res, callback) {
  var client = setupConnection(connect, res);
  courses.all(client, function(err, courses) {
    callback(err, courses);
    client.quit();
  });  
};

module.exports.show = function(connect, courseId, res, callback) {
  var client = setupConnection(connect, res);

  courses.find(client, courseId, function(err, course) {
    callback(err, course);
    client.quit();
  });
};

// The responsibility for this 'controller' seems unclear...
// It really only cares about non-databases stuff because of the need for the
// response on uncaughtException...

function setupConnection(connect, res) {
  var client = connect(); 

  process.on('uncaughtException', function(e) {
    if (res && res.send) {
      res.send("Something unawesome happened: " + e.message, 500);
    }
    console.log("Something unawesome happened: " + e.message);
    client.quit();
  });
  
  return client;
}