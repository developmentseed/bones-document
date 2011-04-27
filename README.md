Bones Document
--------------

This project provides model validation, editing and rendering helpers. To utilize these helpers defines models that extend the `Document` model and describe their schema using JSON-Schema.

## Getting Started

When defining new models that extend the `Document` model and add a schema attribute. For example;

    model = models['Document'].extend({
        schema: {
            'title': {
                'type': 'string',
                'title': 'Title'
            },
            'content': {
                'type': 'string',
                'title': 'Content',
                'format': 'markdown'
            }
        }
    });

The schema element must be a valid [JSON schema](http://tools.ietf.org/html/draft-zyp-json-schema-03). The quick start version of "Using JSON schema in Bones Document" is this;

* Each attributes key should correspond to a attribute of the model.
* The `type` attribute should be populated, and describes the type (e.g. 'string', 'object').
* The `format` attribute describes how display should work. this element is not required and by default everything is passed through the model's `escape` method. 'markdown' and 'raw' formats are also provided by Bones Document.

## Validation

Models which extend `Document` will have a `validate` method which can be used (before saving a document to a database, for example) to validate a model's attributes.

## Editing

TODO

## Rendering

Models which extend `Document` will have a `renderer` method which returns an object intended to be used from within a template. This `Renderer` has a `render` method which takes the name of an attribute as an argument and returns the formatted version of that attribute.

A view for displaying a Bones Document may look like:

    view = Backbone.View.extend({
        render: function() {
            $(this.el).html(this.template('post', this.model.renderer()));
            return this;
        }
    });

...and the `post` template could contain;

    <div class="post">
      <h2><%= render('title') %></h2>
      <%= render('content') %>
    </div>
