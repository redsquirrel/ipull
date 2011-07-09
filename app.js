var express = require('express');
var Courses = require('./courses').Courses;
var redis = require('redis');

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

var port, redisConnect;

app.configure('development', function() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
  
  port = 3000;
  
  redisConnect = redis.createClient;
});

app.configure('production', function() {
  app.use(express.errorHandler());
  
  port = process.env.PORT;
  if (!port) throw("Need the port!");
  
  redisConnect = function() {
    var url   = require("url").parse(process.env.REDISTOGO_URL);
    var client = redis.createClient(url.port, url.hostname);
    client.auth(url.auth.split(":")[1]);
    return client;
  };
});

function setupCourses(callback) {
  return function(req, res) {
    var client = redisConnect(); 

    client.once('error', function(e) {
      res.send("Something unawesome happened: " + e.message, 500);
    });

    client.on('error', function(e) {
      console.log("Something unawesome happened: " + e.message);
    }); 

    var courses = new Courses(client);
    callback(req, res, courses, courses.disconnect)
  };
}

// Routes

app.get('/', function(_, res) {
  res.render('index', {title: ""});
});

app.get('/courses/new', function(_, res) {
  res.render("courses/new", {title: "Create Your Course", course: {}});
});

app.get('/courses', setupCourses(function(_, res, courses, disconnect) {
  courses.all(function(err, courseData) {
    if (err) throw err;
    res.render('courses/index', {courses: courseData, title: "Courses"});
    disconnect();
  });
}));

app.post('/courses', setupCourses(function(req, res, courses, disconnect) {
  courses.create(req.body, function(err, course) {
    if (err) throw err;
    res.redirect('/courses/' + course.permalink);
    disconnect();
  });
}));

app.get('/courses/:permalink/edit', setupCourses(function(req, res, courses, disconnect) {
  courses.findByPermalink(req.params.permalink, function(err, course) {
    if (err) throw err;
    res.render("courses/edit", {title: "Update " + course.name, course: course})
    disconnect();
  });
}));

app.post('/courses/:permalink', setupCourses(function(req, res, courses, disconnect) {
  courses.updateByPermalink(req.params.permalink, req.body, function(err, course) {
    if (err) throw err;
    res.redirect('/courses/' + course.permalink);
    disconnect();
  });
}));

app.get('/courses/:permalink', setupCourses(function(req, res, courses, disconnect) {
  courses.findByPermalink(req.params.permalink, function(err, course) {
    if (err) throw err;
    res.render('courses/show', {course: course, title: course.name});
    disconnect();
  });
}));

app.listen(port, function() {
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);  
});
