var assert = require('assert');
var vows = require('vows');
var Learner = require('../learner');

vows.describe('learner').addBatch({
  'without a username': {
    topic: Learner.from({id:5, name: "Staci"}),
    "has no profile": function(learner){
      assert.equal(learner.hasProfile(), false);
    }
  }
  ,
  'with a username': {
    topic: Learner.from({id:5, name: "Staci", username: "staci"}),
    "has a profile": function(learner){
      assert.ok(learner.hasProfile());
    }
  }
}).export(module);