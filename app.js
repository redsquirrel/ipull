var express = require('express');
var courseController = require('./course-controller');
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

// Routes

app.get('/', function(_, res) {
  res.render('index');
});

app.get('/courses', function(_, res) {
  courseController.index(redisConnect, res, function(err, courses) {
    if (err) throw err;
    res.render('courses/index', {courses: courses});
  });
});

app.get('/courses/:id', function(req, res) {
  courseController.show(redisConnect, req.params.id, res, function(err, course) {
    if (err) throw err;
    res.render('courses/show', {course: course});    
  });
})

app.listen(port, function() {
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);  
});
