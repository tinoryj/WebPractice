var mongoose = require('mongoose');
mongoose.Promise = global.Promise;  
var db = mongoose.connect('mongodb://localhost/peaNew');
var Schema = mongoose.Schema;


var student = new Schema({
    _id: String,
    name: String,
    pswd: String
});

var notice = new Schema({
    _id: String,
    startTime: Date,
    data: String
});

var sign = new Schema({
    _id: String,
    name: String,
    task: String,
    introduction: String,
    permit: String
});

var userInfo = new Schema({
    _id: String,
    name: String,
    major: String
})

module.exports = {
    student: mongoose.model('student', student),
    notice: mongoose.model('notice', notice),
    sign: mongoose.model('sign', sign),
    userInfo: mongoose.model('userInfo', userInfo)
};