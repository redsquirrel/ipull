var express = require('express');
var courses = require('./courses');
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

function setupConnection(res) {
  return function() {
    var client = redisConnect(); 
    
    client.once('error', function(e) {
      if (res && res.send) {
        res.send("Something unawesome happened: " + e.message, 500);
      }
    });

    client.on('error', function(e) {
      console.log("Something unawesome happened: " + e.message);
    }); 

    return client;
  }
}

// Routes

app.get('/', function(_, res) {
  res.render('index');
});

app.get('/courses', function(_, res) {
  courses.all(setupConnection(res), function(err, courses) {
    if (err) throw err;
    res.render('courses/index', {courses: courses});
  });
});

app.get('/courses/:id', function(req, res) {
  courses.find(setupConnection(res), req.params.id, function(err, course) {
    if (err) throw err;
    res.render('courses/show', {course: course});    
  });
})

app.listen(port, function() {
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);  
});
