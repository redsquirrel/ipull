module.exports = RedisModel = function(redis, namespace) {
  this.connection = function() {
    return redis;
  };
  
  this.disconnect = function() {
    redis.quit();
  };
  
  this.hydrate = function(data, ids, allAttributes, class) {
    var objects = [];
    var idCounter = 0;
    for (var c = 0; c < data.length; c += allAttributes.length) {
      var object = new class(ids[idCounter++]);
      for (var a = 0; a < allAttributes.length; a++) {
        object[allAttributes[a]] = data[c+a];
      }
      objects.push(object);
    }
    return objects;
  };
}
