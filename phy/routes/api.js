var express = require('express');
var stroage = require('../stroage');

var bulid_stroage_funcs = type => {
    return {
        find: (query, callback) => {
            if (typeof query == 'string') stroage[type].findById(query, callback);
            else stroage[type].find(query, callback);
        },

        remove: (query, callback) => {
            if (typeof query == 'string') stroage[type].findByIdAndRemove(query, callback);
            else stroage[type].remove(query, callback);
        },

        update: (query, action, callback) => {
            if (typeof query == 'string') stroage[type].findByIdAndUpdate(query, action, callback);
            else stroage[type].update(query, action, callback);
        },

        create: (dataset, callback) => stroage[type].create(dataset, callback),

        count: (query, callback) => stroage[type].count(query, count)
    };
};

var student = bulid_stroage_funcs('student');
var teacher = bulid_stroage_funcs('teacher');
var project = bulid_stroage_funcs('project');
var admin = { "admin": "admin" };

var req, res, next;
var query, params, body;
var send, download, render;
var redirect, format;

var hook = (_req, _res, _next) => {
    req = _req; res = _res; next = _next; query = req.query;
    params = req.params; body = req.body;
    send = (msg) => res.send(msg);
    download = (p) => res.download(p);
    redirect = (p) => res.redirect(p);
    render = (name, data) => {
        if (typeof data == 'string') {
            var ret = {};
            return (err, info) => {
                ret[data] = info;
                render(name, ret);
            };
        } else {
            data = data || {};
            data.req = req;
            data.res = res;
            res.render(name, data);
        }
    };
};

var jump = (url) => (err => err ? send(err) : redirect(url));
var check = (from, dict) => {
    for (var key in dict) if (!dict[key](from[key])) return false;
    return true;
}

var integate = num => Number.isInteger(Number(num));
var noEmpty = str => str;

var tree = {
    "/": {
        get: () => render('login'),
    },
    "/admin": {
        get: {
            admin: () => render('admin/index'),
            default: () => render('admin/login')
        },
        post: () => {
            if (check(body, { 'user': noEmpty, 'pswd': noEmpty })) {
                if (admin[body.user] == body.pswd) redirect('/admin');
                else render('admin/login');
            } else render('admin/login');
        }
    },
    "/project": {
        "/:project": {
            get: () => send('hello project'),
            post: () => check(body, { "name": noEmpty }) ? project.create({}, jump('/project')) : render('/project')
        },
        get: () => redirect('/')
    },
};


function create(tree) {

    var router = express.Router();

    function check(node) {
        for (var t in node) if (t.startsWith('/')) return true;
        return false;
    }

    function create_callback(type, path) {
        if (typeof tree[path][type] == 'function')
            router[type](path, (req, res, next) => { hook(req, res, next); tree[path][type]() });
        else if (typeof tree[path][type] == 'object')
            router[type](path, (req, res, next) => {
                if (req.session.type in tree[path][type]) { hook(req, res, next); tree[path][type][req.session.type](); }
                else if ('default' in tree[path][type]) { hook(req, res, next); tree[path][type]['default'](); }
                else redirect('/login');
            });
    }

    for (var path in tree) {
        if (path.startsWith('/')) {
            if (check(tree[path])) router.use(path, create_test(tree[path]));
            create_callback('get', path);
            create_callback('post', path);
            create_callback('delete', path);
        }
    }
    return router;
}

module.exports = create(tree);