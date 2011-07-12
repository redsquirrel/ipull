var util = require('util');
var RedisModel = require('../redis-model').RedisModel;

function Learners(redis, namespace) {
  RedisModel.call(this, redis, namespace);
  var n = this._namespaced;

  this.getLearnerIdByExternalId = function(externalSite, externalId, callback) {
    redis.hget(n("learners:"+externalSite+"_ids:ids"), externalId, function(error, learnerId) {
      if (learnerId) {
        callback(error, learnerId);
      } else {
        redis.incr(n("learners:ids"), function(error, learnerId) {
          if (error) return callback(error);
          redis.hset(n("learners:"+externalSite+"_ids:ids"), externalId, learnerId, function(error) {
            callback(error, learnerId);
          });
        });
      }
    });
  };

  this.deleteAll = function(callback) {
    redis.del(n("learners:ids"), function() {
      redis.del(n("learners:facebook_ids:ids"), function() {
        redis.del(n("learners:twitter_ids:ids"), function() {
          redis.del(n("learners:google_ids:ids"), callback);
        });
      });
    });
  };  
}

util.inherits(Learners, RedisModel);
module.exports.Learners = Learners;
