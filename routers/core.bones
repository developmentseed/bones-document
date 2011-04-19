// console.log(routers);
router = routers.Core.augment({
    initialize: function(parent, options) {
        parent.call(this, options);
        options.assets.core.push(require.resolve('JSV'));
    }
});
