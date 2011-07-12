var util = require('util');
var RedisModel = require('../redis-model').RedisModel;

function Learners(redis, namespace) {
  RedisModel.call(this, redis, namespace);
  var n = this.namespaced;

  this.getLearnerIdByTwitterId = function(twitterId, callback) {
    redis.hget(n("learners:twitter_ids:ids"), twitterId, function(error, learnerId) {
      if (learnerId) {
        callback(error, learnerId);
      } else {
        redis.incr(n("learners:ids"), function(error, learnerId) {
          if (error) return callback(error);
          redis.hset(n("learners:twitter_ids:ids"), twitterId, learnerId, function(error) {
            callback(error, learnerId);
          });
        });
      }
    });
  };

  this.deleteAll = function(callback) {
    redis.del(n("learners:ids"), function() {
      redis.del(n("learners:twitter_ids:ids"), callback);
    });
  };
}

util.inherits(Learners, RedisModel);
module.exports.Learners = Learners;
