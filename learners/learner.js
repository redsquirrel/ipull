module.exports = Learner = function(id) {
  this.id = id;
  
  this.hasProfile = function() {
    return this.username !== undefined;
  };
};

