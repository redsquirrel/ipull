module.exports = Course = function(id) {
  this.id = id;
  
  this.learnersNeeded = function() {
    return this["min-learners"] - this["learner-count"];
  }
  
  this.timeToJoin = function(now) {
    if (!this["decision-date"]) return "n/a";
    var currentEpochTime = now || new Date().getTime();
    return this["decision-date"] - currentEpochTime;
  }
}
