$('#student').click(function () {
    $('#student').attr("class","btn-danger btn");
    $('#teacher').attr("class","btn btn-default");
    $('.student').show();
    $('.teacher').hide();
});
$('#teacher').click(function () {
    $('#teacher').attr("class","btn-danger btn");
    $('#student').attr("class","btn btn-default");
    $('.teacher').show();
    $('.student').hide();
})

$('.student').show();
$('.teacher').hide();