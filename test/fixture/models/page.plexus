model = models['Document'].extend({
    schema: {
        'id': {
            'type': 'string',
            'title': 'Path',
            'required': true,
            'pattern': '^[A-Za-z0-9\-_]+$'
        },
        'template': {
            'type': 'string',
            'title': 'Template',
            'enum': ['Page', 'Feature', 'Home'],
            'format': 'select'
        },
        'title': {
            'type': 'string',
            'title': 'Title'
        },
        'header': {
            'type': 'string',
            'title': 'Header',
            'format': 'markdown'
        },
        'sidebar': {
            'type': 'string',
            'title': 'Sidebar',
            'format': 'markdown'
        },
        'highlight': {
            'type': 'string',
            'title': 'Highlighted',
            'format': 'markdown'
        },
        'content': {
            'type': 'string',
            'title': 'Content',
            'format': 'markdown'
        }
    },
    url: function() {
        return '/api/page/' + this.id;
    }
});
