module.exports = RedisModel = function(redis, namespace) {
  this._namespaced = function(key) {
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
