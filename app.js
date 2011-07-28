var express = require('express');
var redis = require('redis');

var app = module.exports = express.createServer();

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

var learnersApp = require("./learners/app");
var coursesApp = require("./courses/app");
coursesApp.setupEveryauth(learnersApp.everyauth);
coursesApp.setupLearners(learnersApp.learners);

app.use(learnersApp);
app.use(coursesApp);

app.listen(port, function() {
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);  
});
