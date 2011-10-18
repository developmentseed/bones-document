if (Bones.server) {
    JSV = require('JSV').JSV;
    Showdown = require('showdown').Showdown;
}

// Global JSON schema environment.
var env;

// Document model. Provides several extensions to the default `Model` class.
// - `validateAttributes`: JSV-based validation of model attributes against its
//   JSON schema. A default implementation of `validate` is provided which
//   does a JSV validation. Override `validate` to add additional custom
//   validation or exclude JSV validation alltogether.
// - `renderer`: Generate a renderer object for this model. Provides an object
//   with key/value pairs of attributes described by the model schema and a
//   `render` method that can be used to render
model = Backbone.Model.extend({
    env: function() {
        if (!env) {
            env = JSV.createEnvironment('json-schema-draft-03');
            env.setOption('defaultSchemaURI', 'http://json-schema.org/hyper-schema#');
            env.setOption('latestJSONSchemaSchemaURI', 'http://json-schema.org/schema#');
            env.setOption('latestJSONSchemaHyperSchemaURI', 'http://json-schema.org/hyper-schema#');
            env.setOption('latestJSONSchemaLinksURI', 'http://json-schema.org/links#');
        }
        return env;
    },
    // JSON schema. Should describe all attributes of model instances.
    schema: {
        type: 'object',
        properties: {}
    },
    // Use JSV validation by default. Override this to provide your own custom
    // validation logic.
    validate: function(attr) {
        var error = this.validateAttributes(attr);
        return error;
    },
    // Get the JSV schema object for this model, registering it if not found.
    getSchema: function() {
        var schema;
        if (this.schema.id) {
            schema = (this.env().findSchema(this.schema.id)
            || this.env().createSchema(this.schema, undefined, this.schema.id)
        );
        }
        else {
            schema = this.env().createSchema(this.schema);
        }

        return schema;
    },
    // Method to validate attributes against the model's JSON schema.
    // Validate properties separately to allow subsets of attributes.
    validateAttributes: function(attr) {
        var errors = [];
        var properties = this.getSchema().getAttribute('properties');
        _(attr).each(function(v, k) {
            // Let unknown attributes pass through.
            if (!properties[k]) return;
            errors = errors.concat(properties[k].validate(v).errors);
        });
        if (errors.length) {
            return this.formatErrors(errors);
        }
    },
    // Format error output.
    formatErrors: function(errors) {
        var error = errors.pop();
        var property = this.env().findSchema(error.schemaUri).getValue();

        if (property.description) {
            return property.description;
        } else {
            return (property.title || error.schemaUri.replace(/.*\//, '')) + ': ' + error.message;
        }
    },
    // Retrieve a model attribute renderer. Returns an object with key/value
    // pairs for model attributes and optionally a `render` method that can
    // be used to render each attribute using its corresponding method in the
    // `renderers` hash.
    //
    // See the `admin_document._` view for how the `renderer` method
    // can be used in the context of an underscore template.
    //
    // - `options.editable` Boolean. If `true` returns all schema attributes.
    //   Otherwise only includes populated values.
    // - `options.keys` Boolean. If `true` returns hash of keys.
    // - `options.formatters` Object, hash or id => renderer name. The renderer
    //   should be available on the model.
    renderer: function(options) {
        options = options || {};
        var that = this;
        var Renderer = function(model, attributes) {
            var render = function(attribute) {
                var type = model.schema.properties && model.schema.properties[attribute] && model.schema.properties[attribute].format;
                if (options.formatters && options.formatters[attribute]) {
                    type = options.formatters[attribute];
                }
                if (type && model.renderers[type]) {
                    return renderer = model.renderers[type].apply(model, [model.get(attribute)]);
                }
                return model.escape(attribute);
            };
            var title = function(attribute) {
                var title = model.schema &&
                    model.schema.properties &&
                    model.schema.properties[attribute] &&
                    model.schema.properties[attribute].title;
                title = title || '';
                return title.replace(/&(?!\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            };
            return _.extend({ render: render, title: title }, attributes);
        };
        var data = {};
        if (options.editable) {
            _(this.schema.properties || {}).chain()
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
    // Hash of render methods. Each key corresponds to the `format` specified
    // for an attribute in `schema`. If no matching `format` is found the
    // model.escape() is used.
    renderers: {
        raw: function(value) {
            return value;
        },
        markdown: function(value) {
            value = this.stripTags(value || '');
            return (new Showdown.converter()).makeHtml(value);
        }
    },
    // Editor widget method.
    // - `op` String [form|value]. When `form`, replaces `el` with an editable
    //   input element. When `value`, expects `el` to be the editable input
    //   element and returns the attribute value to be used.
    // - `el` Object. DOM element reference for this attribute.
    // - `attribute` String. Attribute key corresponding to a `schema` key.
    edit: function(op, el, attribute) {
        var format = this.schema.properties && this.schema.properties[attribute] && this.schema.properties[attribute].format,
            editor = this.editors[format] || this.editors['default'];
        return editor[op].call(this, el, attribute);
    },
    // Hash of editor methods. Each key corresponds to the `format` specified
    // for an attribute in `schema`. If no matching `format` is found the
    // `default` editor is used.
    editors: {
        'default': {
            form: function(el, attribute) {
                el.attr('contentEditable', true);
            },
            value: function(el, attribute) {
                return el.text();
            }
        },
        select: {
            form: function(el, attribute) {
                var select = $('<select></select>')
                    .attr('class', el.attr('class'));
                _.each(this.schema.properties[attribute]['enum'], function(item) {
                    var option = $('<option></option>').val(item).text(item);
                    select.append(option);
                });
                select.val(this.get(attribute));
                el.replaceWith(select);
            },
            value: function(el, attribute) {
                return el.val();
            }
        },
        markdown: {
            form: function(el, attribute) {
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
                            paddingTop: $.browser.msie ? 0 : textarea.css('paddingTop'),
                            paddingRight: $.browser.msie ? 0 : textarea.css('paddingRight'),
                            paddingBottom: $.browser.msie ? 0 : textarea.css('paddingBottom'),
                            paddingLeft: $.browser.msie ? 0 : textarea.css('paddingLeft'),
                            lineHeight: textarea.css('lineHeight'),
                            textDecoration: textarea.css('textDecoration'),
                            letterSpacing: textarea.css('letterSpacing')
                        }).attr('tabIndex','-1').insertBefore(textarea);
                    })(),
                    updateSize = function() {
                        // Update clone.
                        clone.val($(this).val()).scrollTop(10000);
                        // Find scrolling height of text in clone and update
                        var height = clone.scrollTop();
                        if (!$.browser.msie) {
                            _.each(['top', 'bottom'], function(padding) {
                                padding = textarea.css('padding-' + padding);
                                height += padding ? parseInt(padding.replace(/px$/, '')) : 0;
                            });
                        }
                        // Add extra padding to the bottom of the textarea
                        // to simulate an extra line.
                        height += parseInt(clone.css('line-height').replace(/px$/, ''));

                        $(this).height(height);
                    };
                textarea
                    .bind('keyup', updateSize)
                    .bind('keydown', updateSize)
                    .bind('change', updateSize);
                updateSize.call(textarea);
            },
            value: function(el, attribute) {
                return el.val();
            }
        }
    },
    // Strip tags. From node-markdown.
    // -------------------------------
    stripTags: function(html /*, allowedTags, allowedAttributes */) {
        var allowedTags = arguments[1] ||
                'a|b|blockquote|code|del|dd|dl|dt|em|h1|h2|h3|' +
                'i|img|li|ol|p|pre|sup|sub|strong|strike|ul|br|hr|' +
                'table|thead|th|tbody|tr|td|div|span',
            allowedAttributes = arguments[2] || {
                'img': 'src|width|height|alt',
                'a': 'href',
                'td': 'rowspan|colspan',
                'table': 'cellspacing',
                '*': 'title|id|class'
            };
            testAllowed = new RegExp('^(' + allowedTags.toLowerCase() + ')$'),
            findTags = /<(\/?)\s*([\w:\-]+)([^>]*)>/g,
            findAttribs = /(\s*)([\w:-]+)\s*=\s*(["'])([^\3]+?)(?:\3)/g;

        // convert all strings patterns into regexp objects
        for (var i in allowedAttributes) {
            if (allowedAttributes.hasOwnProperty(i)) {
                allowedAttributes[i] = new RegExp('^(' +
                    allowedAttributes[i].toLowerCase() + ')$');
            }
        }

        // find and match html tags
        return html.replace(findTags, function(original, lslash, tag, params) {
            var tagAttr, wildcardAttr,
                rslash = params.substr(-1) == '/' && '/' || '';

            tag = tag.toLowerCase();

            // tag is not allowed, return empty string
            if (!tag.match(testAllowed))
                return '';

            // tag is allowed
            else {
                // regexp objects for a particular tag
                tagAttr = tag in allowedAttributes && allowedAttributes[tag];
                wildcardAttr = '*' in allowedAttributes && allowedAttributes['*'];

                // if no attribs are allowed
                if (!tagAttr && !wildcardAttr)
                    return '<' + lslash + tag + rslash + '>';

                // remove trailing slash if any
                params = $.trim(params);
                if (rslash) {
                    params = params.substr(0, params.length - 1);
                }

                // find and remove unwanted attributes
                params = params.replace(findAttribs, function(original, space,
                                                                name, quot, value) {
                    name = name.toLowerCase();

                    // force javascript: links to #
                    if (name == 'href' && $.trim(value).substr(0,
                            'javascript:'.length) == 'javascript:') {
                        value = '#';
                    }

                    if ((wildcardAttr && name.match(wildcardAttr)) ||
                            (tagAttr && name.match(tagAttr))) {
                        return space + name + '=' + quot + value + quot;
                    }else
                        return '';
                });

                return '<' + lslash + tag + (params ? ' ' + params : '') + rslash + '>';
            }
        });
    }
});
