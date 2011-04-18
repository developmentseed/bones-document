var plugin = module.exports = require('bones').plugin(__dirname);

plugin.load(require('../..'));
plugin.load();

if (!module.parent) {
    plugin.start();
}
