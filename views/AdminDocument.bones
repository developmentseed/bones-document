// View. Provides a `bones-admin` panel for offering inline editing of document
// models. Should be instantiated from within the main display view
// of a model and passed `model`, `view` where `model` is the model to be
// edited and `view` is the display view. Upon editing `display.render()` will
// be called with options that can be passed to `Document.renderer()` or
// overridden as needed.
view = Backbone.View.extend({
    display: null,
    events: {
        'click .edit': 'edit',
        'click .del': 'del',
        'click .save': 'save',
        'click .cancel': 'cancel'
    },
    initialize: function(options) {
        _.bindAll(this, 'render', 'edit', 'del', 'save', 'cancel');
        this.display = options.display;
        this.render().trigger('attach');
    },
    render: function() {
        $(this.el).html(templates.AdminDocument(this.model.renderer()));
        return this;
    },
    edit: function() {
        var that = this;
        this.display.render({editable: true});
        _(this.model.renderer({ editable: true, keys: true })).each(function(key) {
            var el = that.display.$('.' + that.model.id + '-' + key);
            el.size() && that.model.edit('form', el, key);
        });
        $('html').addClass('bonesAdminEditing');
    },
    del: function() {
        confirm('Are you sure you want to delete this page?') && this.model.destroy({
            success: function() {
                window.location.hash = '';
            },
            error: Bones.admin.error
        });
        return false;
    },
    save: function() {
        var that = this;
        var data = {};
        _(this.model.renderer({ editable: true, keys: true })).each(function(key) {
            var el = that.display.$('.' + that.model.id + '-' + key);
            el.size() && (data[key] = that.model.edit('value', el, key));
        });
        if (!_.isEmpty(data)) {
            that.model.save(data, { error: Bones.admin.error });
        }
        $('html').removeClass('bonesAdminEditing');
        this.display.render().trigger('attach');
        this.render();
    },
    cancel: function() {
        $('html').removeClass('bonesAdminEditing');
        this.display.render().trigger('attach');
    }
});
