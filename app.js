var express = require('express');
var courses = require('./courses');
var app = module.exports = express.createServer();

// Configuration

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

var port;

app.configure('development', function() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
  port = 3000;
});

app.configure('production', function() {
  app.use(express.errorHandler());
  port = process.env.PORT;
  if (!port) throw("Need the port!");
});

// Routes

app.get('/', function(_, res) {
  res.render('index');
});

app.get('/courses', function(_, res) {
  process.on('uncaughtException', function(e) {
    res.send("Something unawesome happened: " + e.message);
  });
  
  courses.all(["name"], function(courses) {    
    res.render('courses/index', {courses: courses});  
  });
});

app.listen(port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
