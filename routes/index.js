var express = require('express');
var router = express.Router();


var storage = require('../storage');
var admin = require('../admin.json');
var permit = require('../permit.json')

router.use((req, res, next) => {
  res.ret = (fname, data) => {
    data = data || {};
    data.req = req;
    data.msg = data.msg || "";
    data.student = data.student || [];
    data.admin = data.admin || [];
    res.render(fname, data);
  }; next();
});
//页面请求响应==================================
router.get('/', (req, res) => {
  res.ret('index');
});

router.get('/login', (req, res) => {
  res.ret('login');
  //res.redirect('error');
});

router.get('/error', (req, res) => {
  var err = new Error('功能（页面）暂未开放');
  err.status = 404;
  err.stack = '所请求的页面（功能）由于SSL证书原因，为保证官网安全性暂不开放（其实是学长学姐没时间写了ಥ_ಥ）'
  res.locals.message = err.message;
  res.locals.error = err;
  // render the error page
  res.status(err.status || 500);
  res.ret('error');
});

router.get('/adminLogin', (req, res) => {
  res.ret('adminLogin');
});

router.get('/joinUs', (req, res) => {
  res.ret('joinForm');
});
//notice 
router.get('/notice', (req, res) => {
  res.ret('notice');
});
router.get('/notice/A', (req, res) => {
  res.ret('notice/A');
});
router.get('/notice/B', (req, res) => {
  res.ret('notice/B');
});
router.get('/notice/C', (req, res) => {
  res.ret('notice/C');
});
router.get('/notice/D', (req, res) => {
  res.ret('notice/D');
});
//--------------------
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('login');
});
//========================================================



//功能响应=================================================
//登陆响应
router.post('/login', (req, res) => {
  console.log(req.body.user);
    storage.student.findById(req.body.user, (err, user) => {
      console.log(user);
      if (err || !user || user.pswd != req.body.pswd)
        res.ret('login', { msg: '用户名或密码错误' });
      else {
        req.session.type = 'student';
        req.session.user = req.body.user;
        res.ret('success', { msg: '用户登录成功！' });
      }
    });
  });
//报名页响应
router.post('/joinUs', (req,res) => {

  storage.sign.findById(req.body.stdid, (err, join) => {
    if (join == null) {
      var tmpJoin = new storage.sign;
      tmpJoin._id = req.body.stdid;
      tmpJoin.name = req.body.name;
      tmpJoin.task = req.body.task;
      tmpJoin.introduction = req.body.introduction;
      tmpJoin.permit = "no";
      if (tmpJoin._id.length != 13 || tmpJoin.name.length <= 1 || tmpJoin.introduction.length < 20 || !(tmpJoin.task)) {
        if (tmpJoin.name.length <= 1) {
          res.ret('joinForm', { msg: '姓名未填写，请按要求填写信息！' });
        }
        else if (tmpJoin._id.length != 13) {
          res.ret('joinForm', { msg: '学号位数不正确，请按要求填写信息！' });
        }
        else if (!tmpJoin.task) {
          res.ret('joinForm', { msg: '请在四道题目中至少选择一道！' });
        }
        else if (tmpJoin.introduction.length < 20) {
          res.ret('joinForm', { msg: '个人简介需至少20字，请按要求填写信息！' });
        }
      }
      else {
        var tmpJoin = new storage.sign;
        tmpJoin._id = req.body.stdid;
        tmpJoin.name = req.body.name;
        tmpJoin.task = req.body.task;
        tmpJoin.introduction = req.body.introduction;
        tmpJoin.permit = "no";
        tmpJoin.save(function (err) {
        console.log('save status:',err ? 'failed' : 'success');
        if (!err) {
          res.ret('success', { msg: '注册选题成功！' });
        }
        else {
          storage.sign.findById(req.body.stdid, (err, join) => {
          if (join == null)
            res.ret('success', { msg: '出现了未知错误，请联系管理员：张腾'});
          else
            res.ret('success', { msg: '注册选题成功！' });
        });
      }
    });
  }
}
else {
      res.ret('success', { msg: '您已经进行过报名选题了^_^，不要重复哦↖(^ω^)↗' });
    }
  });
});
//注册响应
router.post('/register', (req,res) => {
  if (req.body.user in permit) {
    var member = new storage.student;
    member._id = req.body.user;
    member.name = req.body.name;
    member.pswd = req.body.pswd;
    member.save(function (err) {
      console.log('save status:',err ? 'failed' : 'success');
    });

    req.session.type = 'student';
    req.session.user = req.body.user;
    res.ret('success', { msg: '注册成功！' });
  }
  else {
    res.ret('login', { msg: '招新结束后开放注册通道，当前仅需要在join us页面内报名招新赛'});
    }
});
//管理员登陆响应
router.post('/adminLogin', (req,res) => {
  console.log(req.body);
  if (req.body.user in admin && admin[req.body.user] == req.body.pswd) {
    req.session.type = 'admin';
    req.session.user = req.body.user;
    res.ret('success', { msg: '管理员账户登录成功！' });
  } else res.ret('login', { msg: '用户名或密码错误' });
});

//-----------------------------------------------------------

module.exports = router;
