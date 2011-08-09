module.exports = Learner = {
  from: function(learnerData) {
    learnerData.hasProfile = function() {
      return this.username !== undefined;
    };
    return learnerData;
  }
};

