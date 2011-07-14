module.exports.authClientCreator = function(redisUrl) {
  return function() {
    var url   = require("url").parse(redisUrl);
    var client = require("redis").createClient(url.port, url.hostname);
    client.auth(url.auth.split(":")[1]);
    return client;
  }
};

module.exports.setup = function(redisConnect) {
  var redisOnline = false;
  var client = redisConnect(); 
  client.on('connect', function() {
    console.log("Something AWESOME happened: WE HAZ REDIS!");
    redisOnline = true;
  });
  client.on('error', function(e) {
    console.log("Something unawesome happened: " + e.message);
    redisOnline = false;
  });
  process.on("exit", client.quit);
  
  client.isOnline = function() { return redisOnline; };
  client.errorResponse = function(req, res, next) {
    if (client.isOnline()) {
      next();
    } else {
      res.send("Something unawesome happened. (Redis is temporarily unavailable.)");
    }
  }
  
  return client;
}

module.exports.namespaced = function(namespace) {
  return function(key) {
    if (namespace) {
      return namespace + ":" + key;
    } else {
      return key;
    }
  }
};
