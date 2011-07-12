var assert = require('assert');
var redis = require('redis');
var vows = require('vows');

var Learners = require('../learners').Learners;

var testRedis = function() {
  return redis.createClient(53535);
};

var fixtureData = function(label, vow) {
  var namespaceLearners = function() {
    var learners = new Learners(testRedis(), label);
    this.callback(null, learners);
  }

  var clearData = function(learners) {
    learners.deleteAll(function() {
      this.callback(null, learners);
    }.bind(this));
  };

  var testTwitterId = 12345;
  var newLearner = function(learners) {
    learners.getLearnerIdByTwitterId(testTwitterId, function() {
      this.callback(null, learners);
    }.bind(this));
  }

  var closeRedis = function(learners) {
    learners.disconnect();
  }

  return {
    '': {
      topic: namespaceLearners,
      '': {
        topic: clearData,
        '': {
          topic: newLearner,          
          '': vow,
          teardown: closeRedis
        }
      }
    } 
  };
};

var setupBatch = function(vows) {
  var batch = {};
  for (var label in vows) {
    batch[label] = fixtureData(label, vows[label]);
  }
  return batch;
};

vows.describe('learners').addBatch(setupBatch({
  'getLearnerIdByTwitterId for existing user': {
     topic: function(learners) {
       learners.getLearnerIdByTwitterId(12345, this.callback);
     },
     'provides the existing learner id': function(learnerId) {
       assert.equal(learnerId, 1);
     }
   }
  ,
  'getLearnerIdByTwitterId for new user': {
     topic: function(learners) {
       learners.getLearnerIdByTwitterId(54321, this.callback);
     },
     'provides new learner id': function(learnerId) {
       assert.equal(learnerId, 2);
     }
   }
})).run();
