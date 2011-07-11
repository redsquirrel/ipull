var express = require('express');
var everyauth = require('everyauth');
var conf = require('./conf');
var redis = require('redis');

var redisConnect;

function authTwitterLearner(sess, accessToken, accessSecret, twitUser) {
  var client = redisConnect();
  // handle client errors
  
  var promise = this.Promise();
  client.hget("learners:twitter_ids:ids", twitUser.id, function(error, learnerId) {
    // handle error
    if (learnerId) {
      promise.fulfill({id: learnerId, twitterId: twitUser.id});
    } else {
      client.incr("learners:ids", function(error, learnerId) {
        // handle error
        client.hset("learners:twitter_ids:ids", twitUser.id, learnerId, function(error, result) {
          // handle error
          promise.fulfill({id: learnerId, twitterId: twitUser.id});
        });
      });
    }
  });
  
  return promise;
}

everyauth
  .twitter
    .consumerKey(conf.twit.consumerKey)
    .consumerSecret(conf.twit.consumerSecret)
    .findOrCreateUser(authTwitterLearner)
    .redirectPath('/');

// facebook and google and linkedin and yahoo...

var app = module.exports = express.createServer(
    express.cookieParser()
  , express.session({ secret: conf.session.secret })
  , everyauth.middleware()
);

// Configuration

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.static(__dirname + "/public"));  
  app.use(express.bodyParser());
  app.use(express.methodOverride());
});

var port;

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
  res.render('index', {title: ""});
});

everyauth.helpExpress(app);

if (!module.parent) {
  app.listen(port, function() {
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);  
  });
}