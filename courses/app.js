var express = require('express');
var Courses = require('./courses');
var redis = require('redis');
var redisUtil = require('../redis-util');

var app = module.exports = express.createServer();

var everyauth; // how to make this optional? so that the app can run standalone.
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

var redisClient = redisUtil.setup(redisConnect);
app.use(redisClient.errorResponse);

var courses = new Courses(redisClient);

// Need to make this suck less, by using middleware or exceptions
function authenticate(req, res, callback) {
  if (req.loggedIn) {
    callback();
  } else {
    res.redirect("/"); // need an alert to login; also store the target for redirect
  }
}

// Routes

app.get('/courses/new', function(req, res) {
  authenticate(req, res, function() {
    res.render("new", {title: "Create Your Course", course: {}});
  });
});

app.get('/courses', function(_, res) {
  courses.all(function(err, courseData) {
    if (err) throw err;
    res.render('index', {courses: courseData, title: "Courses"});
  });
});

app.post('/courses', function(req, res) {
  authenticate(req, res, function() {
  courses.create(req.body, function(err, course) {
      if (err) throw err;
      res.redirect("/courses/" + course.permalink);
    });
  });
});

app.get('/courses/:permalink/edit', function(req, res) {
  courses.findByPermalink(req.params.permalink, function(err, course) {
    if (err) throw err;
    res.render("edit", {title: "Update " + course.name, course: course})
  });
});

app.post('/courses/:permalink', function(req, res) {
  courses.updateByPermalink(req.params.permalink, req.body, function(err, course) {
    if (err) throw err;
    res.redirect("/courses/" + course.permalink);
  });
});

app.get('/courses/:permalink', function(req, res) {
  courses.findByPermalink(req.params.permalink, function(err, course) {
    if (err) throw err;
    res.render('show', {course: course, title: course.name});
  });
});

if (!module.parent) {
  app.listen(port, function() {
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);  
  });
}
