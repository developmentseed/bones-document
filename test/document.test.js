var assert = require('assert');
var spawn = require('child_process').spawn;
var fs = require('fs');

require('./fixture');
var fixture = require('bones').plugin;
var main = new fixture.servers['Document'](fixture);


exports['routes'] = function(beforeExit) {
    var data01 = { "bones.token": "1f4a1137268b8e384e50d0fb72c627c4", id: "data01", key: "value" };
    assert.response(main.server, {
        url: '/api/Page',
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'cookie': 'bones.token=1f4a1137268b8e384e50d0fb72c627c4'
        },
        body: JSON.stringify(data01)
    }, {
        body: '{}',
        status: 200
    }, function() {
        delete data01['bones.token'];
        var contents = fs.readFileSync(__dirname + '/fixture/pages/api.Page.data01.json', 'utf8');
        assert.deepEqual(data01, JSON.parse(contents));
    });

    // Attempt to send an invalid value for `template`.
    var data02 = { "bones.token": "1f4a1137268b8e384e50d0fb72c627c4", id: "data02", template: "Invalid" };
    assert.response(main.server, {
        url: '/api/Page',
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'cookie': 'bones.token=1f4a1137268b8e384e50d0fb72c627c4'
        },
        body: JSON.stringify(data02)
    }, {
        body: '{"error":"Template: Instance is not one of the possible values"}',
        status: 409
    }, function() {
        assert['throws'](function() {
            fs.statSync(__dirname + '/fixture/pages/api.Page.data02.json', 'utf8');
        }, "ENOENT, No such file or directory");
    });

    // PUT to non-existant file.
    var data03 = { "bones.token": "1f4a1137268b8e384e50d0fb72c627c4", id: "data03", key: "value" };
    assert.response(main.server, {
        url: '/api/Page/data03',
        method: 'PUT',
        headers: {
            'content-type': 'application/json',
            'cookie': 'bones.token=1f4a1137268b8e384e50d0fb72c627c4'
        },
        body: JSON.stringify(data03)
    }, {
        body: '{}',
        status: 200
    }, function() {
        delete data03['bones.token'];
        var contents = fs.readFileSync(__dirname + '/fixture/pages/api.Page.data03.json', 'utf8');
        assert.deepEqual(data03, JSON.parse(contents));
    });

    // Create and delete.
    var data04 = { "bones.token": "1f4a1137268b8e384e50d0fb72c627c4", id: "data04", key: "value" };
    assert.response(main.server, {
        url: '/api/Page/data04',
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data04)
    }, {
        body: '{}',
        status: 200
    }, function() {
        delete data04['bones.token'];
        var contents = fs.readFileSync(__dirname + '/fixture/pages/api.Page.data04.json', 'utf8');
        assert.deepEqual(data04, JSON.parse(contents));

        assert.response(main.server, {
            url: '/api/Page',
            method: 'DELETE',
            headers: {
                'content-type': 'application/json',
                'cookie': 'bones.token=1f4a1137268b8e384e50d0fb72c627c4'
            },
            body: JSON.stringify({ "bones.token": "1f4a1137268b8e384e50d0fb72c627c4" })
        }, {
            body: '{}',
            status: 200
        }, function() {
            assert['throws'](function() {
                fs.statSync(__dirname + '/fixture/pages/api.Page.data04.json', 'utf8');
            }, "ENOENT, No such file or directory");
        });
    });

    beforeExit(function() {
        spawn('rm', ['-rf', __dirname + '/fixture/pages']);
    });
};