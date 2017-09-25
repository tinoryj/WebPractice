

var flag = false;
$('#file').change(function(){
    var fileName = $('#file').val();
    if(fileName.length > 1 && fileName ) {       
        var ldot = fileName.lastIndexOf(".");
        var type = fileName.substring(ldot + 1);
        if(type != "pdf"){
            $('#warningmsg').text('文件必须为PDF格式');
            flag = true;
        }
        else{
            flag = false;
            $('#warningmsg').text('');
        }
    }
    
});



$('#submit').click(function(){
    var fileName = $('#file').val();
    if($('#name').val()==''){
        $('#warningmsg').text('项目名称不能为空');
        flag = true;
    }
    else if($('#teacher').val()==''){
        $('#warningmsg').text('指导老师不能为空');
        flag = true;
    }
    else if($('#money').val()==''){
        $('#warningmsg').text('申请金额不能为空');
        flag = true;
    }
    else if(fileName.length <1){
        $('#warningmsg').text('文件不能为空');
        flag = true;
    }
    
    if(flag == true)
        return;
    else
        $('#body').submit();
});









