var express = require('express');
var everyauth = require('everyauth');
var redis = require('redis');
var redisUtil = require('../redis-util');
var Learners = require('./learners').Learners;

function authDenied(_, res) {
  res.redirect('/');
}

function authExternalLearner(externalSite) {
  return function(session, accessToken, accessTokExtra, externalData) {
    // use session and accessToken and accessSecret to persist the auth?
    var learners = setupLearners();
    var promise = this.Promise();
    learners.findOrCreateLearnerByExternalId(externalSite, externalData, function(error, learner) {
      if (error) {
        promise.fail(error);
      } else {
        promise.fulfill(learner);
      }
    });  
    return promise;
  }
}

everyauth
  .everymodule
  .findUserById(function(userId, callback) {
    var learners = setupLearners();
    learners.find(userId, callback);
  });
  

everyauth
  .facebook
    .appId(process.env.FacebookAppId)
    .appSecret(process.env.FacebookAppSecret)
    .handleAuthCallbackError(authDenied)
    .findOrCreateUser(authExternalLearner("facebook"))
    .redirectPath('/');

everyauth
  .twitter
    .consumerKey(process.env.TwitterConsumerKey)
    .consumerSecret(process.env.TwitterConsumerSecret)
    // .handleAuthCallbackError(authDenied)
    .findOrCreateUser(authExternalLearner("twitter"))
    .redirectPath('/');

everyauth
  .google
    .appId(process.env.GoogleAppId)
    .appSecret(process.env.GoogleAppSecret)
    .scope('https://www.google.com/m8/feeds')
    .handleAuthCallbackError(authDenied)
    .findOrCreateUser(authExternalLearner("google"))
    .redirectPath('/');

var app = module.exports = express.createServer(
    express.cookieParser()
  , express.session({ secret: process.env.SessionSecret })
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

function setupLearners() {
  var client = redisConnect();
  // handle client errors
  var learners = new Learners(client);
  return learners;
}

// Routes

app.get('/', function(req, res) {
  res.render('index', {title: ""});
});

everyauth.helpExpress(app);

if (!module.parent) {
  app.listen(port, function() {
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);  
  });
}