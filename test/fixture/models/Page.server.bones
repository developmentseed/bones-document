var path = require('path');
var stash = require('backbone-stash');

models['Page'].prototype.sync = stash(path.join(__dirname, '../pages')).sync;
