if (typeof process !== 'undefined') {
    _ = require('underscore')._,
    Backbone = require('backbone'),
    JSV = require('jsv').JSV,
    Bones = require('bones'),
    Showdown = require('showdown').Showdown;
}

var Bones = Bones || {};
Bones.models = Bones.models || {};
Bones.views = Bones.views || {};

Bones.models.Document = Backbone.Model.extend({
    schema: {},
    // Use JSV validation by default.
    validate: function(attr) {
        var error = this.validateSchema(attr);
        return error;
    },
    // Provide a default `validateSchema()` method to validate attributes
    // against a JSON schema.
    validateSchema: function(attr) {
        var env = JSV.createEnvironment();
        for (var key in attr) {
            if (this.schema[key]) {
                var property = this.schema[key],
                    value = attr[key];
                // Do a custom check for required properties, (e.g. do not allow
                // an empty string to validate against a required property.)
                if (!value && property.required) {
                    return (property.title || key) + ' is required.';
                }

                var errors = env.validate(value, property).errors;
                if (errors.length) {
                    var error = errors.pop();
                    if (property.description) {
                        return property.description;
                    } else {
                        return (property.title || key) + ': ' + error.message;
                    }
                }
            }
        }
    },
    // Retrieve a model attribute renderer.
    // - `options.editable` Boolean. If `true` returns all schema attributes.
    //   Otherwise only includes populated values.
    // - `options.keys` Boolean. If `true` returns hash of keys.
    renderer: function(options) {
        options = options || {};
        var that = this;
        var Renderer = function(model, attributes) {
            var that = this;
            var render = function(attribute) {
                var renderer = model.renderers.default,
                    value = model.get(attribute),
                    type = model.schema[attribute] && model.schema[attribute].format;
                (type && model.renderers[type]) && (renderer = model.renderers[type]);
                return renderer(value);
            };
            return _.extend({ render: render }, attributes);
        };
        var data = {};
        if (options.editable) {
            _(this.schema).chain()
                .keys()
                .each(function(key) { data[key] = key; });
        } else {
            _(this.toJSON()).chain()
                .keys()
                .filter(function(key) { return that.get(key); })
                .each(function(key) { data[key] = key; });
        }
        return options.keys ? data : new Renderer(this, data);
    },
    renderers: {
        default: function(value) {
            return value;
        },
        markdown: function(value) {
            value = value || '';
            return (new Showdown.converter()).makeHtml(value);
        }
    },
    edit: function(op, el, attribute) {
        var format = this.schema[attribute] && this.schema[attribute].format,
            editor = this.editors[format] || this.editors.default;
        return editor.call(this, op, el, attribute);
    },
    editors: {
        default: function(op, el, attribute) {
            if (op === 'form') {
                el.attr('contentEditable', true);
            } else {
                return el.text();
            }
        },
        select: function(op, el, attribute) {
            if (op === 'form') {
                var select = $('<select></select>')
                    .attr('class', el.attr('class'));
                _.each(this.schema[attribute]['enum'], function(item) {
                    var option = $('<option></option').val(item).text(item);
                    select.append(option);
                });
                select.val(this.get(attribute));
                el.replaceWith(select);
            } else {
                return el.val();
            }
        },
        markdown: function(op, el, attribute) {
            if (op === 'form') {
                var textarea = $('<textarea></textarea>')
                    .val(this.get(attribute))
                    .attr('class', el.attr('class'));
                el.replaceWith(textarea);

                // Textarea auto-height adjustment. Inspired by:
                // http://james.padolsey.com/javascript/jquery-plugin-autoresize
                // Clone textarea, hide off screen.
                var clone = (function(){
                        return textarea.clone().removeAttr('id').removeAttr('name').css({
                            position: 'absolute',
                            top: 0,
                            left: -9999,
                            height: 0,
                            minHeight: 0,
                            width: textarea.css('width'),
                            padding: textarea.css('padding'),
                            lineHeight: textarea.css('lineHeight'),
                            textDecoration: textarea.css('textDecoration'),
                            letterSpacing: textarea.css('letterSpacing')
                        }).attr('tabIndex','-1').insertBefore(textarea);
                    })(),
                    updateSize = function() {
                        // Update clone.
                        clone.val($(this).val()).scrollTop(10000);
                        // Find scrolling height of text in clone and update
                        $(this).height(clone.scrollTop());
                    };
                textarea
                    .bind('keyup', updateSize)
                    .bind('keydown', updateSize)
                    .bind('change', updateSize);
                updateSize.call(textarea);
            } else {
                return el.val();
            }
        }
    }
});

Bones.views.AdminDocument = Backbone.View.extend({
    events: {
        'click .edit': 'edit',
        'click .del': 'del',
        'click .save': 'save',
        'click .cancel': 'cancel'
    },
    initialize: function(options) {
        _.bindAll(this, 'render', 'edit', 'del', 'save', 'cancel');
        this.scope = options.scope;
        this.render().trigger('attach');
    },
    render: function() {
        $(this.el).html(this.template('AdminDocument', this.model.renderer()));
        return this;
    },
    edit: function() {
        var that = this;
        this.scope.edit();
        _(this.model.renderer({ editable: true, keys: true })).each(function(key) {
            var el = that.scope.$('.' + that.model.id + '-' + key);
            el.size() && that.model.edit('form', el, key);
        });
        $('body').addClass('bonesAdminEditing');
    },
    del: function() {
        confirm('Are you sure you want to delete this page?') && this.model.destroy({
            success: function() { window.location.hash = '#/' },
            error: window.admin.error
        });
        return false;
    },
    save: function() {
        var that = this;
        var data = {};
        _(this.model.renderer({ editable: true, keys: true })).each(function(key) {
            var el = that.scope.$('.' + that.model.id + '-' + key);
            el.size() && (data[key] = that.model.edit('value', el, key));
        });
        if (!_.isEmpty(data)) {
            that.model.save(data, { error: window.admin.error });
        }
        $('body').removeClass('bonesAdminEditing');
        this.scope.render();
        this.render();
    },
    cancel: function() {
        $('body').removeClass('bonesAdminEditing');
        this.scope.render();
    }
});

(typeof module !== 'undefined') && (module.exports = {
    models: {
        Document: Bones.models.Document
    },
    views: {
        AdminDocument: Bones.views.AdminDocument
    }
});

