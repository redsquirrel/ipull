module.exports = Course = function(id) {
  this.id = id;
  
  this.learnersNeeded = function(learners) {
    return this["min-learners"] - learners.length;
  }
  
  this.timeToJoin = function(now) {
    if (!this["decision-date"]) return "n/a";
    var currentEpochTime = now || new Date().getTime();
    return this["decision-date"] - currentEpochTime;
  }
}
