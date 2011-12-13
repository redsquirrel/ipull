var express = require('express');
var everyauth = require('everyauth');
var redis = require('redis');
var redisUtil = require('../redis-util');
var Learners = require('./learners');
var auth = require('../auth');

function authDenied(_, res) {
  res.redirect('/');
}

function authExternalLearner(externalSite) {
  return function(session, accessToken, accessTokExtra, externalData) {
    // use session and accessToken and accessSecret to persist the auth?
    var promise = this.Promise();
    learners.findOrCreateLearnerByExternalId(externalSite, externalData, authCallback(promise));
    return promise;
  }
}

function authDevLearner(username) {
  var promise = this.Promise();
  learners.findOrCreateLearnerByExternalId("dev", {id: username}, authCallback(promise));
  return promise;
}

function authCallback(promise) {
  return function(error, learner) {
    if (error) {
      promise.fail(error);
    } else {
      promise.fulfill(learner);
    }
  };
}

function findUserById(userId, callback) {
  return learners.find(userId, callback);
}

function everyauthErrback(err, data) {
  if (!data) {
    console.log(err);
    throw err;
  }
  if (!data.req.errored) {
    data.res.send("Something bad happened during authentication! " + err, 500);
    data.req.errored = true;      
  }
}

everyauth
  .everymodule
    .findUserById(findUserById)
    .moduleTimeout(10000)
    .moduleErrback(everyauthErrback);
    // .redirectPath('/learners/tbd'); WTF?

if (process.env.NODE_ENV != "production") {
  everyauth.password
    .getLoginPath('...')
    .loginFormFieldName('username')
    .postLoginPath('/dev-login')
    .authenticate(authDevLearner)
    .loginSuccessRedirect('/learners/tbd')
    .getRegisterPath('...')
    .postRegisterPath('...')
    .registerUser(function() {})
}

everyauth
  .facebook
    .appId(process.env.FacebookAppId)
    .appSecret(process.env.FacebookAppSecret)
    .handleAuthCallbackError(authDenied)
    .findOrCreateUser(authExternalLearner("facebook"))
    .redirectPath('/learners/tbd');

everyauth
  .twitter
    .consumerKey(process.env.TwitterConsumerKey)
    .consumerSecret(process.env.TwitterConsumerSecret)
    .findOrCreateUser(authExternalLearner("twitter"))
    .redirectPath('/learners/tbd');

everyauth
  .google
    .appId(process.env.GoogleAppId)
    .appSecret(process.env.GoogleAppSecret)
    .scope('https://www.google.com/m8/feeds')
    .handleAuthCallbackError(authDenied)
    .findOrCreateUser(authExternalLearner("google"))
    .redirectPath('/learners/tbd');

var app = module.exports = express.createServer(
    express.cookieParser()
  , express.session({ secret: process.env.SessionSecret })
  , everyauth.middleware()
);

// For sharing authentication with other apps
app.everyauth = everyauth;

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

var redisClient = redisUtil.setup(redisConnect);
app.use(redisClient.errorResponse);

var learners = new Learners(redisClient);

// For shearing learners with other apps
app.learners = learners;

app.get('/', function(req, res) {
  if (req.loggedIn) {
    res.redirect("/courses");
  } else {
    res.render('index', {title: ""});
  }
});

// TODO: this shouldn't be necessary, should do this up in everyauth
app.get('/learners/tbd', auth.protect, function(req, res) {
  if (req.user.hasProfile()) {
    res.redirect("/courses");
  } else {
    res.redirect("/profile/new");
  }
});

app.get('/profile/new', auth.protect, function(req, res){
  res.render("new-profile", {title: "Please tell us about yourself"});
});

app.post('/profile', auth.protect, function(req, res) {
  learners.setUsername(req.user.id, req.body.username, function() {
    res.render("profile", {title: "Your Profile"});
  });
});

everyauth.helpExpress(app);

if (!module.parent) {
  app.listen(port, function() {
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);  
  });
}
