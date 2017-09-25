var express = require('express');
var router = express.Router();
var multiparty = require('multiparty');
var child_process = require('child_process');
var path = require('path');
var stroage = require('../stroage');
var admin = require('../admin.json');
var phase = require('../phase.json');
var fs = require('fs');

var fields_table = [
  "Computational-Electromagnetics",
  "Microwave-radio-frequency-circuit",
  "Bioelectromagnetics",
  "physics",
  "Optics",
  "Circuit",
  "Electric-vacuum-field",
  "other"
];

router.use((req, res, next) => {
  res.ret = (fname, data) => {
    data = data || {};
    data.req = req;
    data.phase = phase;
    data.msg = data.msg || "";
    data.teacher = data.teacher || {};
    data.student = data.student || {};
    data.project = data.project || {};
    data.teachers = data.teachers || [];
    data.students = data.students || [];
    data.projects = data.projects || [];
    data.accept = (proj) => {
      if (proj.accept.indexOf(req.session.user) != -1) return 'true';
      else if (proj.refuse.indexOf(req.session.user) != -1) return 'false';
      else return 'null';
    };
    res.render(fname, data);
  }; next();
});

router.get('/', (req, res) => {
  res.redirect('/login');
});

router.get('/login', (req, res) => {
  res.ret('login');
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('login');
});

router.post('/login', (req, res) => {
  var type;
  if (req.body.teacher) type = 'teacher';
  else type = 'student';
  stroage[type].findById(req.body.user, (err, user) => {
    if (err) res.send(err);
    else if (user == null || user.pswd != req.body.pswd) res.ret('login', { msg: '用户名或密码错误' });
    else {
      req.session.type = type;
      req.session.user = user._id;
      req.session.name = user.name;
      res.redirect('/' + type);
    }
  });
});

router.get('/admin', (req, res) => {
  if (req.session.type != 'admin') res.ret('admin/login');
  else res.ret('admin/index');
});

router.post('/admin', (req, res) => {
  if (req.body.user in admin && admin[req.body.user] == req.body.pswd) {
    req.session.type = 'admin';
    req.session.user = req.body.user;
    res.redirect('/admin');
  } else res.ret('admin/login', { msg: '用户名或密码错误' });
});


router.get('/student', (req, res) => {
  if (req.session.type == 'admin') {
    stroage.student.find({}, (err, students) => {
      res.ret('admin/student', { students: students });
    });
  } else if (req.session.type == 'student') {
    stroage.project.find({ header: req.session.user }, (err, projects) => {
      res.ret('student/index', { projects: projects });
    });
  }
  else res.redirect('/login');
});

router.post('/student', (req, res) => {
  if (req.session.type == 'admin') {
    var recv = req.body;
    if (!recv.name) res.send("name is empty");
    else if (!recv.pswd) res.send("pswd is empty");
    else if (!recv.user) res.send("user is empty");
    else stroage.student.findByIdAndUpdate(recv.user, { name: recv.name, pswd: recv.pswd }, (err, info) => {
      if (err) res.send(err);
      else if (err == null, info == null) stroage.student.create({ _id: recv.user, name: recv.name, pswd: recv.pswd }, (err, info) => {
        if (err) rees.send(err);
        else res.redirect('/student');
      });
      else res.redirect('/student');
    });
  } else res.redirect('/login');
});

router.get('/teacher', (req, res) => {
  if (req.session.type == 'admin') {
    stroage.teacher.find({}, (err, teachers) => {
      res.ret('admin/teacher', { teachers: teachers });
    });
  } else if (req.session.type == 'teacher') {
    res.ret('teacher/index');
  }
  else res.redirect('/login');
});

router.post('/teacher', (req, res) => {
  if (req.session.type == 'admin') {
    var recv = req.body;
    console.log(recv);
    if (!recv.name) res.ret('admin/teacher', { msg: "name is empty" });
    else if (!recv.pswd) res.ret('admin/teacher', { msg: "pswd is empty" });
    else if (!recv.user) res.ret('admin/teacher', { msg: "user is empty" });
    else {
      stroage.teacher.findByIdAndUpdate(recv.user, { name: recv.name, pswd: recv.pswd }, (err, info) => {
        function update_field() {
          for (var i in fields_table) {
            if (req.body[fields_table[i]] == 'true')
              stroage.teacher.findByIdAndUpdate(recv.user, { $addToSet: { field: fields_table[i] } }, (err, info) => err && console.log(err));
            else stroage.teacher.findByIdAndUpdate(recv.user, { $pull: { field: fields_table[i] } }, (err, info) => err && console.log(err));
          }
        }
        if (err) { res.send(err); return; }
        else if (err == null && info == null) {
          stroage.teacher.create({ _id: recv.user, name: recv.name, pswd: recv.pswd }, (err, info) => {
            if (err) res.send(err);
            else update_field();
          });
        } else update_field();
        res.redirect('/teacher');
      });
    }
  } else res.redirect('/login');
});

router.get('/project', (req, res) => {
  if (req.session.type == 'teacher') {
    stroage.teacher.findById(req.session.user, (err, teacher) => {
      for (var p in phase)
        if (phase[p]["start-judge-time"] < Date.now() && Date.now() < phase[p]["end-judge-time"]) {
          var fields = teacher.field.toObject();
          for (var i in fields) fields[i] = { field: fields[i] };
          fields = { $or: fields, phase: p };
          stroage.project.find(fields, (err, projects) => {
            res.ret('teacher/project', { projects: projects });
          });
          return;
        }
      res.ret('teacher/project', { msg: '未到开始时间' });
    });
  } else if (req.session.type == 'admin' || req.session.type == 'teacher') {
    stroage.project.find({}, (err, projects) => {
      res.ret(req.session.type + '/project', { projects: projects });
    });
  } else res.redirect('/login');
});

router.post('/project', (req, res) => {
  if (req.session.type == 'admin') {

    var time_table = {
      'start-request-year': '开始申请年',
      'start-request-month': '开始申请月',
      'start-request-date': '开始申请日',
      'start-request-hour': '开始申请小时',
      'end-request-year': '结束申请年',
      'end-request-month': '结束申请月',
      'end-request-date': '结束申请日',
      'end-request-hour': '结束申请小时',
      'start-judge-year': '开始审核年',
      'start-judge-month': '开始审核月',
      'start-judge-date': '开始审核日',
      'start-judge-hour': '开始审核小时',
      'end-judge-year': '结束审核年',
      'end-judge-month': '结束审核月',
      'end-judge-date': '结束审核日',
      'end-judge-hour': '结束审核小时',
      'start-announce-year': '开始公示年',
      'start-announce-month': '开始公示月',
      'start-announce-date': '开始公示日',
      'start-announce-hour': '开始公示小时',
    }
    for (var i in time_table) req.body[i] = Number(req.body[i]);

    for (var i in time_table) if (!Number.isInteger(req.body[i])) {
      res.ret('admin/index', { msg: "请正确填写" + time_table[i] });
      return;
    }

    if (!req.body.content) { res.ret('admin/index', { msg: "请填写公告内容" }); return; }
    if (!req.body.title) { res.ret('admin/index', { msg: "请填写公告标题" }); return; }

    function get_date_time(year, month, date, hour) {
      var d = new Date();
      d.setFullYear(year);
      d.setMonth(month - 1);
      d.setDate(date);
      d.setHours(hour);
      return d.getTime();
    }

    var phase_time = {
      "title": req.body.title,
      "content": req.body.content,
      "start-request-time": get_date_time(req.body["start-request-year"], req.body["start-request-month"], req.body["start-request-date"], req.body["start-request-hour"]),
      "end-request-time": get_date_time(req.body["end-request-year"], req.body["end-request-month"], req.body["end-request-date"], req.body["end-request-hour"]),
      "start-judge-time": get_date_time(req.body["start-judge-year"], req.body["start-judge-month"], req.body["start-judge-date"], req.body["start-judge-hour"]),
      "end-judge-time": get_date_time(req.body["end-judge-year"], req.body["end-judge-month"], req.body["end-judge-date"], req.body["end-judge-hour"]),
      "start-announce-time": get_date_time(req.body["start-announce-year"], req.body["start-announce-month"], req.body["start-announce-date"], req.body["start-announce-hour"])
    };

    if ('phase' in req.body)
      phase[req.body.phase] = phase_time;
    else
      phase.push(phase_time);



    fs.writeFile('phase.json', JSON.stringify(phase, undefined, 4), (e) => {
      if (e) res.send('save phase.json error!');
      else res.redirect('/admin');
    });

  } else if (req.session.type == 'student') {
    for (var p in phase)
      if (phase[p]["start-request-time"] < Date.now() && Date.now() < phase[p]["end-request-time"]) {
        var form = new multiparty.Form({ uploadDir: 'public/tmp' });
        form.parse(req, function (err, fields, files) {
          if (err) {
            res.send(err.message);
          } else if (!fields['name'][0]) {
            child_process.exec('rm ' + files.file[0].path);
            res.ret('student/index', { msg: "请填写项目名称" });
          } else if (!fields['teacher'][0]) {
            child_process.exec('rm ' + files.file[0].path);
            res.ret('student/index', { msg: "请填写指导老师" });
          } else if (!(0 <= Number(fields['money'][0]) && Number(fields['money'][0]) < 100000000)) {
            child_process.exec('rm ' + files.file[0].path);
            res.ret('student/index', { msg: "请正确填写申请金额" });
          } else {
            stroage.project.create({
              header: req.session.user,
              name: fields['name'][0],
              teacher: fields['teacher'][0],
              money: Number(fields['money'][0]),
              _header: req.session.name,
              phase: p,
            }, (err, info) => {
              if (err) res.send(err);
              else {
                for (var i in fields_table) {
                  if (fields[fields_table[i]] && fields[fields_table[i]][0] == 'true')
                    stroage.project.findByIdAndUpdate(info._id, { $addToSet: { field: fields_table[i] } }, (err, info) => 0);
                  else stroage.project.findByIdAndUpdate(info._id, { $pull: { field: fields_table[i] } }, (err, info) => 0);
                }
                child_process.exec('cp ' + files.file[0].path + ' public/pdf/' + info._id + '.pdf && rm ' + files.file[0].path);
              }
              res.redirect('/student');
            });
          }
        });
        return;
      }
    res.send('未到开放时间');
  } else res.redirect('/login');
});

router.get('/project/:project', (req, res) => {
  if (req.session.type == 'admin' || req.session.type == 'teacher' ||
    req.session.type == 'student') {
    stroage.project.findById(req.params.project, (err, info) => {
      res.ret(req.session.type + '/project-modal', { project: info });
    });
  } else res.redirect('/login');
});

router.get('/student/:student', (req, res) => {
  if (req.session.type == 'admin') {
    stroage.student.findById(req.params.student, (err, info) => {
      res.ret('admin/student-modal', { student: info });
    });
  } else res.redirect('/login');
});

router.get('/teacher/:teacher', (req, res) => {
  if (req.session.type == 'admin') {
    stroage.teacher.findById(req.params.teacher, (err, info) => {
      if (err) res.send(err);
      else res.ret('admin/teacher-modal', { teacher: info });
    });
  } else res.redirect('/login');
});

router.post('/project/:project', (req, res) => {
  if (req.session.type == 'teacher') {
    var options;
    if (req.body.accept == undefined) options = { $pull: { accept: req.session.user, refuse: req.session.user } };
    else if (req.body.accept == 'true') options = { $addToSet: { accept: req.session.user }, $pull: { refuse: req.session.user } };
    else options = { $pull: { accept: req.session.user }, $addToSet: { refuse: req.session.user } };
    stroage.project.findByIdAndUpdate(req.params.project, options, (err, info) => 0);
    res.redirect('/project');
  } else if (req.session.type == 'admin') {
    var time_table = {
      'start-request-year': '开始申请年',
      'start-request-month': '开始申请月',
      'start-request-date': '开始申请日',
      'start-request-hour': '开始申请小时',
      'end-request-year': '结束申请年',
      'end-request-month': '结束申请月',
      'end-request-date': '结束申请日',
      'end-request-hour': '结束申请小时',
      'start-judge-year': '开始审核年',
      'start-judge-month': '开始审核月',
      'start-judge-date': '开始审核日',
      'start-judge-hour': '开始审核小时',
      'end-judge-year': '结束审核年',
      'end-judge-month': '结束审核月',
      'end-judge-date': '结束审核日',
      'end-judge-hour': '结束审核小时',
      'start-announce-year': '开始公示年',
      'start-announce-month': '开始公示月',
      'start-announce-date': '开始公示日',
      'start-announce-hour': '开始公示小时',
    }
    for (var i in time_table) req.body[i] = Number(req.body[i]);

    for (var i in time_table) if (!Number.isInteger(req.body[i])) {
      res.ret('admin/index', { msg: "请正确填写" + time_table[i] });
      return;
    }

    if (!req.body.content) { res.ret('admin/index', { msg: "请填写公告内容" }); return; }
    if (!req.body.title) { res.ret('admin/index', { msg: "请填写公告标题" }); return; }

    function get_date_time(year, month, date, hour) {
      var d = new Date();
      d.setFullYear(year);
      d.setMonth(month - 1);
      d.setDate(date);
      d.setHours(hour);
      return d.getTime();
    }

    var phase_time = {
      "title": req.body.title,
      "content": req.body.content,
      "start-request-time": get_date_time(req.body["start-request-year"], req.body["start-request-month"], req.body["start-request-date"], req.body["start-request-hour"]),
      "end-request-time": get_date_time(req.body["end-request-year"], req.body["end-request-month"], req.body["end-request-date"], req.body["end-request-hour"]),
      "start-judge-time": get_date_time(req.body["start-judge-year"], req.body["start-judge-month"], req.body["start-judge-date"], req.body["start-judge-hour"]),
      "end-judge-time": get_date_time(req.body["end-judge-year"], req.body["end-judge-month"], req.body["end-judge-date"], req.body["end-judge-hour"]),
      "start-announce-time": get_date_time(req.body["start-announce-year"], req.body["start-announce-month"], req.body["start-announce-date"], req.body["start-announce-hour"])
    };

    phase[req.params.project] = phase_time;

    fs.writeFile('phase.json', JSON.stringify(phase, undefined, 4), (e) => {
      if (e) res.send('save phase.json error!');
      else res.redirect('/admin');
    })

  }
  else res.redirect('/login');
});

router.post('/student/:student', (req, res) => {
  if (req.session.type == 'admin') {
    var recv = req.body;
    if (!recv.name) res.send("name is empty");
    else if (!recv.pswd) res.send("pswd is empty");
    else stroage.student.findByIdAndUpdate(req.params.student,
      { name: name, pswd: pswd }, (err, info) => {
        if (err) res.send(err);
        else res.redirect('/student');
      });
  } else res.redirect('/login');
});

router.post('/teacher/:teacher', (req, res) => {
  if (req.session.type == 'admin') {
    var recv = req.body;
    console.log(recv);
    if (!recv.name) res.send("name is empty");
    else if (!recv.pswd) res.send("pswd is empty");
    else {
      stroage.teacher.findByIdAndUpdate(req.params.teacher, { name: recv.name, pswd: recv.pswd }, (err, info) => {
        if (err) res.send(err);
        else {
          for (var i in fields_table) {
            console.log(fields_table[i], req.body[fields_table[i]]);
            if (req.body[fields_table[i]] == 'true')
              stroage.teacher.findByIdAndUpdate(req.params.teacher, { $addToSet: { field: fields_table[i] } }, (err, info) => 0);
            else stroage.teacher.findByIdAndUpdate(req.params.teacher, { $pull: { field: fields_table[i] } }, (err, info) => 0);
          }
          res.redirect('/teacher');
        }
      });
    }
  } else res.redirect('/login');
});

router.delete('/project/:project', (req, res) => {
  if (req.session.type == 'student') {
    stroage.project.findById(req.params.project, (err, project) => {
      if (phase[project.phase]["end-request-time"] > Date.now()) {
        stroage.project.findByIdAndRemove(req.params.project, (err, info) => {
          if (err) res.send(err);
          else {
            child_process.exec('rm ' + 'public/pdf/' + req.params.project + '.pdf');
            res.redirect('/student');
          }
        });
      } else res.redirect('/student');
    });
  } else res.redirect('/login');
});

router.delete('/student/:student', (req, res) => {
  if (req.session.type == 'admin') {
    stroage.student.findByIdAndRemove(req.params.student, (err, info) => {
      if (err) res.send(err);
      else res.redirect('/student');
    });
  } else res.redirect('/login');
});

router.delete('/teacher/:teacher', (req, res) => {
  if (req.session.type == 'admin') {
    stroage.teacher.findByIdAndRemove(req.params.teacher, (err, info) => {
      if (err) res.send(err);
      else res.redirect('/teacher');
    });
  } else res.redirect('/login');
});

module.exports = router;