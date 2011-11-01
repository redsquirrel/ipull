module.exports = Course = function(id) {
  this.id = id;
  
  this.learnersNeeded = function(learners) {
    return this["min-learners"] - learners.length;
  };
  
  this.learnersSeatsAvailable = function(learners) {
    return this["max-learners"] - learners.length;
  };

  this.learnersMaxed = function(learners) {
    return this["max-learners"] <= learners.length;
  };

  this.timeToJoin = function(now) {
    return (new Date(this["decision-date"] )) - currentEpochTime(now);
  };
  
  this.purchasableBy = function(learner, learners, now) {
    if (this.timeToJoin(now) < 0) return false;
    return !this.purchasedBy(learner, learners);
  }
  
  this.purchasedBy = function(learner, learners) {
    if (!learner) return false;
    return ~learners.map(function(learner) {return learner.username}).indexOf(learner.username);
  }
  
  this.inFlight = function(learners, now) {
    return (new Date(this["start-date"]) - currentEpochTime(now) <= 0) && (this.learnersNeeded(learners) <= 0);
  };
  
  function currentEpochTime(now) {
    return now || new Date().getTime();
  }
}
