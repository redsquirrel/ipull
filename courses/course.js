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

  this.daysToJoin = function(now) {
    return Math.round((this["decision-date"] - currentEpochTime(now)) / (24*60*60));
  };
  
  this.purchasableBy = function(learner, learners, now) {
    if (this.daysToJoin(now) < 0) return false;
    return !this.purchasedBy(learner, learners);
  }
  
  this.purchasedBy = function(learner, learners) {
    if (!learner) return false;
    return ~learners.map(function(learner) {return learner.username}).indexOf(learner.username);
  }
  
  this.inFlight = function(learners, now) {
    return (this["start-date"] - currentEpochTime(now) <= 0) && (this.learnersNeeded(learners) <= 0);
  };
  
  this.date = function(attribute) {
    if (!this[attribute]) return "";
    
    var date = new Date(this[attribute] * 1000);
    var mm = date.getMonth()+1;
    if (mm < 10) mm = "0"+mm;
    var dd = date.getDate();
    if (dd < 10) dd = "0"+dd;
    var yyyy = date.getFullYear();
    return mm + "/" + dd + "/" + yyyy;
  };
  
  function currentEpochTime(now) {
    return now || new Date().getTime() / 1000;
  }
}
