
module.exports.Learners = function(redis) {
  this.getLearnerIdByTwitterId = function(twitterId, callback) {
    redis.hget("learners:twitter_ids:ids", twitterId, function(error, learnerId) {
      if (learnerId) {
        callback(error, learnerId);
      } else {
        redis.incr("learners:ids", function(error, learnerId) {
          if (error) return callback(error);
          redis.hset("learners:twitter_ids:ids", twitterId, learnerId, function(error) {
            callback(error, learnerId);
          });
        });
      }
    });
  };
};

