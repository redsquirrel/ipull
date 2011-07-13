var express = require('express');
var Courses = require('./courses').Courses;
var redis = require('redis');
var redisUtil = require('../redis-util');

var app = module.exports = express.createServer();

var everyauth;
app.setupEveryauth = function(auth) {
  auth.helpExpress(this);
  everyauth = auth;
}

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
  
  redisConnect = redisUtil.authClientCreator(process.env.REDISTOGO_URL);
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

app.get('/new', function(_, res) {
  if (everyauth.loggedIn) {
    res.render("new", {title: "Create Your Course", course: {}});
  } else {
    // Uh-oh. How do I redirect to the REAL ipull root? Is it auth middleware time?
    res.redirect("/")
  }
});

app.get('/', setupCourses(function(_, res, courses, disconnect) {
  courses.all(function(err, courseData) {
    if (err) throw err;
    res.render('index', {courses: courseData, title: "Courses"});
    disconnect();
  });
}));

app.post('/', setupCourses(function(req, res, courses, disconnect) {
  courses.create(req.body, function(err, course) {
    if (err) throw err;
    res.redirect(course.permalink);
    disconnect();
  });
}));

app.get('/:permalink/edit', setupCourses(function(req, res, courses, disconnect) {
  courses.findByPermalink(req.params.permalink, function(err, course) {
    if (err) throw err;
    res.render("edit", {title: "Update " + course.name, course: course})
    disconnect();
  });
}));

app.post('/:permalink', setupCourses(function(req, res, courses, disconnect) {
  courses.updateByPermalink(req.params.permalink, req.body, function(err, course) {
    if (err) throw err;
    res.redirect(course.permalink);
    disconnect();
  });
}));

app.get('/:permalink', setupCourses(function(req, res, courses, disconnect) {
  courses.findByPermalink(req.params.permalink, function(err, course) {
    if (err) throw err;
    res.render('show', {course: course, title: course.name});
    disconnect();
  });
}));

if (!module.parent) {
  app.listen(port, function() {
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);  
  });
}
