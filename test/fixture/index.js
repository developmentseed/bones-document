var plugin = module.exports = require('plexus').plugin(__dirname);

plugin.load(require('../..'));
plugin.load();

if (!module.parent) {
    plugin.start();
}
