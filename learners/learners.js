var util = require('util');
var RedisModel = require('../redis-model');
var Learner = require('./learner');

var allAttributes = ["name", "username"];

module.exports = Learners = function(redis, namespace) {
  RedisModel.call(this, redis, namespace);
  var n = require("../redis-util").namespaced(namespace);

  this.find = function(learnerId, callback) {
    redis.sismember(n("learners"), learnerId, function(error, learnerExists) {
      if (error) return callback(error);
      
      if (learnerExists) {
        var keys = [];
        allAttributes.forEach(function(attribute) {
          keys.push(n("learners:"+learnerId+":"+attribute));
        });
        redis.mget(keys, function(error, learnerData) {
          var learner = this.hydrate(learnerData, [learnerId], allAttributes, Learner)[0];
          callback(error, learner);
        }.bind(this));
      } else {
        callback("Missing learner: " + id);
      }
    }.bind(this));
  };

  this.setUsername = function(id, username, callback) {
    redis.set(n("learners:"+id+":username"), username, callback);
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
    
  this.allByCourseId = function(courseId, callback) {
    redis.lrange(n("courses:"+courseId+":learner-ids-by-name"), 0, -1, function(error, learnerIds) {
      if (error) return callback(error);
      var learners = [];
      if (learnerIds.length == 0) return callback(null, learners);
      
      var keys = [];
      learnerIds.forEach(function(learnerId) {
        allAttributes.forEach(function(attribute) {
          keys.push(n("learners:"+learnerId+":"+attribute));
        });
      });
      redis.mget(keys, function(error, learnerData) {
        var learners = this.hydrate(learnerData, learnerIds, allAttributes, Learner);
        callback(error, learners);
      }.bind(this));
    }.bind(this));
  };

  this.deleteAll = function(callback) {
    var multi = redis.multi();
    multi.del(n("learners"));
    multi.del(n("learners:ids"));
    multi.del(n("learners:facebook_ids:ids"));
    multi.del(n("learners:twitter_ids:ids"));
    multi.del(n("learners:google_ids:ids"));
    multi.exec(callback);
  };
  
  function setAttributes(externalSite, externalData, learnerId) {
    var dataToStore = {username: externalData.username};
    switch(externalSite) {
      case "google":
      case "dev":
        dataToStore.name = externalData.id;
        break;
      case "twitter":
      case "facebook":
        dataToStore.name = externalData.name;
        break;
      default:
        throw "Unknown external site: " + externalSite;
    }
    dataToStore["name:lower"] = dataToStore.name.toLowerCase();
    for (var attribute in dataToStore) {
      redis.set(n("learners:"+learnerId+":"+attribute), dataToStore[attribute]);
    }
  }
};

util.inherits(Learners, RedisModel);
