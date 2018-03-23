var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/pom-test');
var Schema = mongoose.Schema;

var student = new Schema({
    _id: String,
    name: String,
    pswd: String
});

var teacher = new Schema({
    _id: String,
    name: String,
    pswd: String,
    field: Array,
});

var project = new Schema({
    phase: Number,
    name: String,
    header: String,
    _header: String,
    teacher: String,
    money: Number,
    file: String,
    field: Array,
    accept: Array,
    refuse: Array,
    score: Number
});

module.exports = {
    student: mongoose.model('student', student),
    teacher: mongoose.model('teacher', teacher),
    project: mongoose.model('project', project)
};