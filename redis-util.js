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
  
  client.errorResponse = function(_, res, next) {
    if (redisOnline) {
      next();
    } else {
      res.send("Something unawesome happened. (Redis is temporarily unavailable.)", 500);
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
