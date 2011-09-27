var assert = require('assert');
var vows = require('vows');
var Learner = require('../learner');

vows.describe('learner').addBatch({
  'without a username': {
    topic: new Learner(5),
    "has no profile": function(learner){
      assert.equal(learner.hasProfile(), false);
    }
  }
  ,
  'with a username': {
    topic: new Learner(5),
    "has a profile": function(learner){
      learner.username = "staci";
      assert.ok(learner.hasProfile());
    }
  }
}).export(module);