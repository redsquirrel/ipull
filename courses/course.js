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
  
  this.inFlight = function(learners, now) {
    return (this["start-date"] - currentEpochTime(now) <= 0) && (this.learnersNeeded(learners) <= 0);
  };
  
  function currentEpochTime(now) {
    return now || new Date().getTime();
  }
}
