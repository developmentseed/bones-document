var path = require('path');

router = routers.Core.augment({
    initialize: function(parent, options) {
        parent.call(this, options);
        var jsv = path.dirname(require.resolve('JSV'));
        options.assets.core.push(path.join(jsv, 'uri/uri.js'));
        options.assets.core.push(require.resolve('JSV'));
        options.assets.core.push(path.join(jsv, 'json-schema-draft-03.js'));
        options.assets.core.push(require.resolve('showdown'));
    }
});
