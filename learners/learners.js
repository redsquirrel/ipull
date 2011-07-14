var util = require('util');
var RedisModel = require('../redis-model');

module.exports = Learners = function(redis, namespace) {
  RedisModel.call(this, redis, namespace);
  var n = require("../redis-util").namespaced(namespace);

  this.find = function(id, callback) {
    redis.sismember(n("learners"), id, function(error, learnerExists) {
      if (error) callback(error);
      
      if (learnerExists) {
        redis.get(n("learners:"+id+":name"), function(error, name) {
          callback(error, {name: name, id: id});
        });
      } else {
        callback("Missing learner: " + id);
      }
    });
  };

  this.findOrCreateLearnerByExternalId = function(externalSite, externalData, callback) {
    redis.hget(n("learners:"+externalSite+"_ids:ids"), externalData.id, function(error, learnerId) {
      if (learnerId) {
        this.find(learnerId, callback);
      } else {
        redis.incr(n("learners:ids"), function(error, learnerId) {
          if (error) return callback(error);
          setAttributes(externalSite, externalData, learnerId);
          redis.sadd(n("learners"), learnerId, function(error) {
            if (error) return callback(error);
            redis.hset(n("learners:"+externalSite+"_ids:ids"), externalData.id, learnerId, function(error) {
              if (error) return callback(error);
              this.find(learnerId, callback);
            }.bind(this));
          }.bind(this));
        }.bind(this));
      }
    }.bind(this));
  };

  this.deleteAll = function(callback) {
    redis.del(n("learners"), function() {
      redis.del(n("learners:ids"), function() {
        redis.del(n("learners:facebook_ids:ids"), function() {
          redis.del(n("learners:twitter_ids:ids"), function() {
            redis.del(n("learners:google_ids:ids"), callback);
          });
        });
      });
    });
  };
  
  function setAttributes(externalSite, externalData, learnerId) {
    var dataToStore = {};
    switch(externalSite) {
      case "google":
        dataToStore.name = externalData.id;
        break;
      case "twitter":
      case "facebook":
        dataToStore.name = externalData.name;
        break;
      default:
        throw "Unknown external site: " + externalSite;
    }
    for (var attribute in dataToStore) {
      redis.set(n("learners:"+learnerId+":"+attribute), dataToStore[attribute]);
    }
  }
};

util.inherits(Learners, RedisModel);
