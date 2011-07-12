function RedisModel(redis, namespace) {
  this.namespaced = function(key) {
    if (namespace) {
      return namespace + ":" + key;
    } else {
      return key;
    }
  };

  this.connection = function() {
    return redis;
  };
  
  this.disconnect = function() {
    redis.quit();
  };
}

module.exports.RedisModel = RedisModel;
