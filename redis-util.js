module.exports.authClientCreator = function(redisUrl) {
  return function() {
    var url   = require("url").parse(redisUrl);
    var client = require("redis").createClient(url.port, url.hostname);
    client.auth(url.auth.split(":")[1]);
    return client;
  }
};