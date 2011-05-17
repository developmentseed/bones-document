var path = require('path');

server = servers.Core.augment({
    initializeAssets: function(parent, app) {
        parent.call(this, app);
        var jsv = path.dirname(require.resolve('JSV'));
        app.assets.core.push(path.join(jsv, 'uri/uri.js'));
        app.assets.core.push(require.resolve('JSV'));
        app.assets.core.push(path.join(jsv, 'json-schema-draft-03.js'));
        app.assets.core.push(require.resolve('showdown'));
    }
});
