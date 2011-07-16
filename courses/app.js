var express = require('express');
var Courses = require('./courses');
var redis = require('redis');
var redisUtil = require('../redis-util');

var app = module.exports = express.createServer();

var everyauth;
app.setupEveryauth = function(auth) {
  auth.helpExpress(this);
  everyauth = auth;
}

function allowForMissingEveryauth(req, res, next) {
  if (!everyauth) {
    req.loggedIn = true;
    app.helpers({
      user: {name: "Joe Example", id: 53},
      everyauth: {loggedIn: true}
    });
  }
  next();
}
app.use(allowForMissingEveryauth);

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

function protect(req, res, next) {
  if (req.loggedIn) {
    next();
  } else {
    res.redirect("/"); // need an alert to login; also store the target for redirect
  }
}

app.get('/courses/new', protect, function(req, res) {
  res.render("new", {title: "Create Your Course", course: {}});
});

app.get('/courses', function(_, res) {
  courses.all(function(err, courseData) {
    if (err) throw err;
    res.render('index', {courses: courseData, title: "Courses"});
  });
});

app.post('/courses', protect, function(req, res) {
  var courseData = req.body;
  courseData["creator-id"] = req.user.id;
  courses.create(courseData, function(err, course) {
    if (err) throw err;
    res.redirect("/courses/" + course.permalink);
  });
});

app.get('/courses/:permalink/edit', protect, function(req, res) {
  courses.findByPermalink(req.params.permalink, function(err, course) {
    if (err) throw err;
    res.render("edit", {title: "Update " + course.name, course: course})
  });
});

app.post('/courses/:permalink', protect, function(req, res) {
  var courseData = req.body;
  courseData["updater-id"] = req.user.id;
  courses.updateByPermalink(req.params.permalink, courseData, function(err, course) {
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
