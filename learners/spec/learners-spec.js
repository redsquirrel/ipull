var assert = require('assert');
var redis = require('redis');
var vows = require('vows');

var Learners = require('../learners');

var testRedis = function() {
  return redis.createClient(53535);
};

var testTwitterId = 12345;
var testTwitterName = "Charlie";

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

  var newLearner = function(learners) {
    learners.findOrCreateLearnerByExternalId("twitter", {id: testTwitterId, name: testTwitterName}, function() {
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
  'findOrCreateLearnerByExternalId for existing user': {
     topic: function(learners) {
       learners.findOrCreateLearnerByExternalId("twitter", {id: testTwitterId, name: "Staci"}, this.callback);
     },
     'provides the existing learner id': function(learner) {
       assert.equal(learner.id, 1);
     },
     'preserves existing name': function(learner) {
       assert.equal(learner.name, testTwitterName);
     }
   }
  ,
  'findOrCreateLearnerByExternalId for new user': {
     topic: function(learners) {
       learners.findOrCreateLearnerByExternalId("facebook", {id: 54321, name: "Dave"}, this.callback);
     },
     'provides new learner id': function(learner) {
       assert.equal(learner.id, 2);
     },
     'saves provided name': function(learner) {
       assert.equal(learner.name, "Dave");
     }
   },
   'findOrCreateLearnerByExternalId from google': {
      topic: function(learners) {
        learners.findOrCreateLearnerByExternalId("google", {id: "dave.hoover@gmail.com"}, this.callback);
      },
      'uses the id as the name :(': function(learner) {
        assert.equal(learner.name, "dave.hoover@gmail.com");
      }
    }
})).run();
