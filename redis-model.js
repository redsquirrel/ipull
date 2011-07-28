module.exports = RedisModel = function(redis, namespace) {
  this.connection = function() {
    return redis;
  };
  
  this.disconnect = function() {
    redis.quit();
  };
}
