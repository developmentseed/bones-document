var path = require('path');

servers.Route.augment({
    initializeAssets: function(parent, app) {
        parent.call(this, app);
        var jsv = path.dirname(require.resolve('JSV'));
        this.assets.core = this.assets.core || [];
        this.assets.core.push(path.join(jsv, 'uri/uri.js'));
        this.assets.core.push(require.resolve('JSV'));
        this.assets.core.push(path.join(jsv, 'json-schema-draft-03.js'));
        this.assets.core.push(require.resolve('showdown'));
    }
});
