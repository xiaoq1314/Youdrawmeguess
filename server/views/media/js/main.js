/**
 * Created by Gzk on 2017/02/21.
 */

var info = {},
    btnIn = {},
    btnAutoin = {};
var user_name = ""; //玩家名称
var canvas = $('canvas')[0],
    mycanvas = $("#mycanvas")[0];
    ctx = canvas.getContext('2d'),
    $msg = $('#msg'),    //消息面板
	info.time = $('#time'),  //倒计时
    info.word = $('#word'),  //提示或者答案
    $users = $('#users'),
    $iptMsg = $("#iptMsg"),    //消息输入框
    $room_member = $(".room_member"),    //房间成员列表层
    $ready_btn = $(".ready_btn"),    //准备按钮
	$answer = $(".answer_btn"),  //抢答按钮
    $confirm_answer = $("#confirm"),  //确认回答按钮
    ranger = $('#ranger')[0],
    colors = $('#colors')[0],
    $clear_btn = $('#clear'),    //清除画布按钮
    $sendMsg = $("#sendMsg"),    //消息发送按钮
    $dialog = $('.dialog'),      //消息提示层
    $ss_game = $(".ss_game"),    //游戏主面板
    $exit_game = $(".exit_btn"),    //退出游戏按钮
    $popup = $(".popup"),  //提示框最外层
    $pop = $(".pop"), //消息框
    $close = $(".pop .close"), 
    $iptAnswer = $("#answer"),
    $result_img = $("#result_img"),  //结果展示图片
    $answer_word = $(".answer_word"), //结果展示答案
    $result_box = $(".result_box"),  //答案展示框
    $answer_box = $(".answer_box"),  //回答框
    $paint_box = $(".paint_box"),   //工具框
    $pencil = $("#pencil"),  //画笔
    $paint_box_show = $(".paint_box .show_btn"), //弹出
    $eraser = $("#eraser"), //橡皮擦
    $clear = $("#clear"), //清屏
    $thin = $("#thin"), //细画笔
    $middle = $("#middle"), //中画笔
    $thick = $("#thick"), //粗画笔
    $color = $(".color"); //选色

btnIn.inAct = function () {
    this.in = true;
};
btnIn.outAct = function () {
    this.in = false;
};
var socket = io.connect();  //触发服务器端connection事件

socket.on('server msg',function (data) {       
    // 系统消息
    data = JSON.parse(data);
	var userArr=[];//这里保存传递过来的玩家名字
	userArr = data.user;
    //userArr=[{},{},{}]
    if(data.flag =="suss" && userArr.length <=4) {  //这里先暂时这样处理，只显示4个人的
        $room_member.empty();
        for (var i = 0; i < userArr.length; i++) {
            if (!userArr[i].active) {
                $room_member.append('<li id=' + userArr[i].sid + '>\
                        <img src="./media/imgs/douwa.jpg" class="member_head">\
                        <div class="member_nick">\
                            ' + userArr[i].name + '\
                        </div>\
                    </li>');
            } else {
                $room_member.append('<li id=' + userArr[i].sid + '>\
                        <img src="./media/imgs/douwa.jpg" class="member_head">\
                        <div class="member_nick">\
                            ' + userArr[i].name + '\
                        </div>\
                    </li>');
                $("#"+userArr[i].sid).append('<i class="icon-ready">✔</i>');
                $('.icon-ready').css({"top": 0, "right": 0});
            }

        }
    }

    if(!data.active){
        $msg.append('<li>\
            <span class="name">'+ data.name +'</span>\
            <span>'+ data.msg +'</span>\
        </li>');
    }
    $msg.scrollTop("10000");	//给个很大的数让它直接滚动到底算了
});

socket.on('user over',function (data) {
    data = JSON.parse(data);
    if(data){
        alert("该房间人数已满，请换个房间");
        location.reload(true);
    }
});

socket.on('login',function () {
    //触发服务器端login事件
    user_name = window.prompt("输入你的姓名", "");
    if(!user_name){
       location.reload(true);
    }else{ 
        socket.emit('login',user_name);   //触发服务器端login事件
    } 
});

socket.on('paint paths',function (paths) {
    paths = JSON.parse(paths)
    canvas.height = $("#mycanvas").height()
    console.log("canvas.width:"+canvas.width+" mycanvas.height:"+mycanvas.height)
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(var k in paths){
        Ctl.drawPts(ctx, paths[k]);
    }
});

socket.on('paint pts',function (pts) {
    //canvas.paths = paths;
    pts = JSON.parse(pts)
    if(!pts) return;
    Ctl.drawPts(ctx, pts);
});

socket.on('cmd',function (data) {
    console.log(JSON.parse(data));
});

// 重置玩家
socket.on('reset in users',function (data) {
    data = JSON.parse(data);
    console.log(data);
    /*
        [
            {name: '', in:true}
        ]
    */
    $users.html(""); 
    data.forEach(function (x) {
        $users.app(utils.makeUserP(x));
    });
});

// 新玩家上场
socket.on('new in user',function (data) {
    $users.append(utils.makeUserP(JSON.parse(data)));
});

// 其他玩家下场
socket.on('out user',function (id) {
    var x = $('#p'+id);
});

// 玩家上场
socket.on('in',function (data) {
    $users.append(utils.makeUserP(JSON.parse(data)));
    btnIn.inAct();
});

// 本玩家下场
socket.on('out',function (id) {
    var x = $('#p'+id);
    if(x){
        btnIn.outAct();
    }
});

// 我画的时间
socket.on('mytime',function (data) {
    data = JSON.parse(data);// name,word:,time
    $('.score').css({"visibility":"hidden"});
    $('.player li .img').css({"border":"1px solid #bfbfbf"});
    $('#p'+data.id+" .img").css({"border":"2px solid #f5777a"});

    if($paint_box.hasClass("disable")){
        $paint_box.removeClass("disable").addClass("hide");
    }
    btnIn.disabled = true;
    info.time.text(data.time);
    info.word.text(data.word);
    $clear_btn.parent().addClass("on");
    $answer.removeClass("on");
    $popup.removeClass("on");
    canvas.isMe = true;
    $(".disable_chat").addClass("on");
});

// 其他玩家画画期间
socket.on('othertime',function (data) {
    data = JSON.parse(data);// name,word:,time
    $('.score').css({"visibility":"hidden"});
    $('.player li .img').css({"border":"1px solid #bfbfbf"});
    $('#p'+data.id+" .img").css({"border":"2px solid #f5777a"});
    info.time.text(data.time);
    $clear_btn.parent().removeClass("on");
    $popup.removeClass("on");
    $answer.addClass("on");
    $pop.removeClass("on");
    canvas.isMe = false;
    $(".disable_chat").removeClass("on");
});

// 其他玩家的倒计时
socket.on('update time',function (data) {
    data = JSON.parse(data);
    info.time.text(data.time);
    info.word.text(data.word);
});
// 我的倒计时
socket.on('update my time',function (data) {
    data = JSON.parse(data);
    info.time.text(data.time);
});

// 本人画时间到
socket.on('mytimeout',function (data) {
    data = JSON.parse(data);
    console.log(data)
    // 最后个人总得分
    var score = 0;
    var player_num = $('.player li').length;
    if(parseInt(data.rightNum) == 0 || parseInt(data.rightNum) == player_num-1){
        score = 0;
    }else{
        score = player_num;
    }
    var   $playerli =  $('#p'+data.id);
    $('#p'+data.id+" .score").text("+"+score).css({"visibility":"visible"});
    var score_count = parseInt($('#p'+data.id+" .score_count").text()) + score;
    $('#p'+data.id+" .score_count").text(score_count);
    info.time.text('--');
    canvas.isMe = false;
    btnIn.outAct();

    $msg.append('<li>\
                    <span class="name">法官：</span>\
                    <span>答案是:【'+ data.word +'】。</span>\
                </li>');
    $msg.scrollTop("10000");	//给个很大的数让它直接滚动到底算了
    $answer_word.text(data.word);
    var img_png_src = canvas.toDataURL("image/png"); 
    $result_img.attr("src",img_png_src);
    $popup.addClass("on");
    $pop.removeClass("on");
    $result_box.addClass("on");

    $paint_box.removeClass("show").removeClass("hide").addClass("disable");

});

// 其他玩家画时间到
socket.on('timeout',function (data) {
    data = JSON.parse(data);
    console.log(data)
    // 最后个人总得分
    var score = 0;
    var player_num = $('.player li').length;
    if(parseInt(data.rightNum) == 0 || parseInt(data.rightNum) == player_num-1){
        score = 0;
    }else{
        score = player_num;
    }
    var   $playerli =  $('#p'+data.id);
    $('#p'+data.id+" .score").text("+"+score).css({"visibility":"visible"});
    var score_count = parseInt($('#p'+data.id+" .score_count").text()) + score;
    $('#p'+data.id+" .score_count").text(score_count);

    info.time.text('00');

    $msg.append('<li>\
                <span class="name">法官：</span>\
                <span>答案是:【'+ data.word +'】。</span>\
            </li>');
    $msg.scrollTop("10000");	//给个很大的数让它直接滚动到底算了
    $answer_word.text(data.word);
    var img_png_src = canvas.toDataURL("image/png"); 
    $result_img.attr("src",img_png_src);
    $popup.addClass("on");
    $pop.removeClass("on");
    $result_box.addClass("on");
});
// 答对加分
socket.on('right answer',function (data) {
    data = JSON.parse(data);
    var score = 0;
    var player_num = $('.player li').length;
    if(parseInt(data.rightNum) == 1){
        score = player_num + 1;
    }else{
        score = player_num - (data.rightNum - 1);
    }
    var   $playerli =  $('#p'+data.id);
    $('#p'+data.id+" .score").text("+"+score).css({"visibility":"visible"});
    var score_count = parseInt($('#p'+data.id+" .score_count").text()) + score;
    $('#p'+data.id+" .score_count").text(score_count);
});
// 橡皮擦
socket.on('erase',function (x,y,w,h) {
    new Rect(x,y,w,h).clearOn(ctx);
})

socket.on('clear paint',function () {
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
});

window.onload = function () {
    function resize() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.paths = canvas.pts = [];
        socket.emit('repaint');
    }
    //不需要调整画布了
    this.addEventListener('resize',resize);
    resize();

    //消息输入框输完按enter键提交
    $iptMsg.bind("keydown",function(event){
        if(event.keyCode === 13 && $(this).val()){
			if(canvas.isMe){
                alert('绘图者不能够发送消息！');
                return;
            }
            socket.emit('client msg',$(this).val());
            $(this).val("");
        }
    });
  
    //点击发送按钮发送消息
    $sendMsg.click(function(){
        if($iptMsg.val()){
            socket.emit('client msg',$iptMsg.val());
            $iptMsg.val("");
        }
    });

    //准备按钮
    $ready_btn.one("click",function(){
        $ready_btn.addClass("on");
        $ready_btn.text("已准备");
        for(var i = 0; i < 3; i++){
        	$(".ripple")[i].style.animation="none";
        }
        //模拟开始
      	socket.emit('ready go',user_name);
      	socket.on('active msg',function (count) {
      	    console.log("这是click处的count:"+count);
            socket.emit('game begin',JSON.stringify(count));
      		if(count === "4" ){
      			setTimeout(function(){
					// 上场
		            var t = btnIn.in;
		            if(btnIn.t) clearTimeout(btnIn.t);
		            btnIn.t = setTimeout(function () {
		                socket.emit(!t?'in':'out');
		            },400);
		            //socket.emit('server msg',"游戏开始");
		            $ss_game.addClass("active");
			    	Ctl.init();   //初始化游戏界面逻辑
		        },1500);
         	}
      	});
    });
	
	// 抢答
    $answer.click(function(){
        $popup.addClass("on");
        $answer_box.addClass("on");
        $iptAnswer.val("").focus();
    });

    // 关闭提示框
    $close.click(function(){
        $popup.removeClass("on");
        $pop.removeClass("on");
        $iptAnswer.val("");
    });

    //确认答案
    $confirm_answer.click(function(){
        var answer = $iptAnswer.val();
        console.log(answer);
        if(answer == ''){
            alert("请先输入答案");
            return;
        }
        socket.emit('answer',answer);
        $iptAnswer.val("");
        $popup.removeClass("on");
        $pop.removeClass("on");
    });
	
    $exit_game.one("click",function(){
        //退出游戏
        socket.emit('dis user'); //断开连接
        socket.on('user level',function () {
            location.reload(true);
        });
    });
    
    // 弹窗工具
    $paint_box_show.on('click',function(e){
        e.stopPropagation();
        if($paint_box.hasClass("hide")){
            $paint_box.removeClass("hide").addClass("show");
        }else if($paint_box.hasClass("show")){
            $paint_box.removeClass("show").addClass("hide");
        }
    })
    $("body").on('click',function(){
        if($paint_box.hasClass("show")){
            $paint_box.removeClass("show").addClass("hide");
        }
    })
    // 清空画布
    $clear.on('click',function(e){
        e.stopPropagation();
        Ctl.clearPos();
        socket.emit('remove paint');
    });

    //画笔
    $pencil.on('click',function(e){
        e.stopPropagation();
        delete canvas.erase;
	$(".tool li").removeClass("on");
	$(this).addClass("on");
    });
    
    // 橡皮擦
    $eraser.on('click',function(e){
        e.stopPropagation();
        canvas.erase=true;
	$(".tool li").removeClass("on");
	$(this).addClass("on");
    });


//  画笔粗细
    $thin.on('click',function(e){
        e.stopPropagation();
        $(".thickness li").removeClass("active");
        $(this).addClass("active");
        Ctl.setLw(2)
    });
    $middle.on('click',function(e){
        e.stopPropagation();
        $(".thickness li").removeClass("active");
        $(this).addClass("active");
        Ctl.setLw(4)
    });
    $thick.on('click',function(e){
        e.stopPropagation();
        $(".thickness li").removeClass("active");
        $(this).addClass("active");
        Ctl.setLw(6)
    });
    
    // 修改画笔颜色
    $color.on('click',function(e){
    	var i = $(this).parent().index();
	var pen_colors = ["#000000","#ffffff","FFA300","#66B502","#EE0926","#148CFD","#FF818C","#FD6130"];
        var color = pen_colors[i];
        console.log(color);
        Ctl.setColor(color);
    })
};

function bind(ele,type,fn) {
    fn = fn.bind(ele);
    ele[type] = fn;
    ele.addEventListener(type,fn);
}

bind(canvas,'mousemove',function (e) {
	if(!canvas.isMe) return;
    if(e.buttons === 1) {
        var x = e.offsetX, y = e.offsetY ;
        if(e.ctrlKey){
            this.classList.add('movable');
            if(this.mouseDown)
                socket.emit('move my paint',x-this.mouseDown.x,y-this.mouseDown.y);
            this.mouseDown={x:e.offsetX,y:e.offsetY};
        }else {
            Ctl.addPos(x, y);
            Ctl.drawPts(ctx, this.pts);
            socket.emit('paint', JSON.stringify({data: new Path(this.pts), status: 'ing'}))
        }
    }
});

// 触屏事件
bind(canvas,'touchstart',function (e) {

    if($paint_box.hasClass("show")){
        $paint_box.removeClass("show").addClass("hide");
    }

	if(!canvas.isMe) return;
    if(this.erase)  return;
    e.preventDefault();
    e.stopPropagation();
    var x = e.changedTouches[0].clientX, y = e.changedTouches[0].clientY - 55;
    Ctl.addPos(x, y);
    Ctl.drawPts(ctx, this.pts);
    var path_data = {data: new Path(this.pts), status: 'ing'};
    path_data.data.pts.forEach(function(item,index){
        if("pts" in item){
            console.log("circle");
            path_data.data.pts.splice(index,1);
        }
    })
    socket.emit('paint', JSON.stringify({data: new Path(this.pts), status: 'ing'}))
})
bind(canvas,'touchmove',function (e) {
	if(!canvas.isMe) return;
    e.preventDefault();
    e.stopPropagation();
    var x = e.changedTouches[0].clientX, y = e.changedTouches[0].clientY - 55;

    if(!this.erase){
        Ctl.addPos(x, y);
        Ctl.drawPts(ctx, this.pts);
        var path_data = {data: new Path(this.pts), status: 'ing'};
        path_data.data.pts.forEach(function(item,index){
            if("pts" in item){
                console.log("circle");
                path_data.data.pts.splice(index,1);
            }
        })
        socket.emit('paint', JSON.stringify({data: new Path(this.pts), status: 'ing'}));
    }else{
        var w=20,h=20;
        var rect = new Rect(x-(w>>>1),y-(h>>>1),w,h);
        rect.clearOn(ctx);
        socket.emit('erase',rect.x,rect.y,rect.w,rect.h);
    }

})
bind(canvas,'touchend',function (e) {
	if(!canvas.isMe) return;
    e.preventDefault();
    e.stopPropagation();
    var x = e.changedTouches[0].clientX, y = e.changedTouches[0].clientY - 55;

    if(!this.erase){
        Ctl.addPos(x, y);
        Ctl.addPath(this.pts);
        var path_data = {data: new Path(this.pts), status: 'end'};
        path_data.data.pts.forEach(function(item,index){
            if("pts" in item){
                console.log("circle");
                console.log(path_data);
                path_data.data.pts.splice(index,1);
            }
        })
        socket.emit('paint',JSON.stringify({data: new Path(this.pts), status: 'ends'}))
        Ctl.clearPos();
    }else{
        var w=20,h=20;
        var rect = new Rect(x-(w>>>1),y-(h>>>1),w,h);
        rect.clearOn(ctx);
        socket.emit('erase',rect.x,rect.y,rect.w,rect.h);
        return;
    }

})


bind(canvas,'mouseup',function (e) {
	if(!canvas.isMe) return;
    this.classList.remove('movable');
    if(!this.mouseDown) {
        var x = e.offsetX, y = e.offsetY;
        Ctl.addPos(x, y);
    }
    Ctl.addPath(this.pts);
    //socket.emit('paint',JSON.stringify({data:new Path(this.pts),status:'end'}))
    Ctl.clearPos();
    delete this.mouseDown;
})

bind(canvas,'mousedown',function (e) {
	if(!canvas.isMe) return;
    var x = e.offsetX,y = e.offsetY;
    this.mouseDown={x:e.offsetX,y:e.offsetY};
    Ctl.clearPos();
    Ctl.addPos(x,y);
});

// Controller
Ctl = {
    init : function () {
        canvas.paths=[];
        canvas.pts=[];
        canvas.color = 'black';
        canvas.lw = 3;
        for(var i=0;i<20;i++)
            this.addColor();
    },
    drawPts: function (ctx,pts) {
        if(pts instanceof Path || pts.pts){
            var color = pts.color,lw = pts.lw;
            pts = pts.pts;
        }
        var p1 = pts[0];
        ctx.save();
        ctx.beginPath();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.moveTo(p1.x, p1.y);
        pts.slice(1).forEach(function(v){
            ctx.lineTo(v.x,v.y);
        });
        ctx.lineWidth = lw || canvas.lw;
        ctx.strokeStyle = color || canvas.color;
        ctx.stroke();
        ctx.restore();
    },
    setLw : function(lw){
        canvas.lw = lw;
    },
    setColor : function(c){
        canvas.color = c;
    },
    addPath : function (pts) {
        canvas.paths.push(new Path(pts,canvas.lw,canvas.color));
    },
    addPos : function (x,y) {
        canvas.pts.push(new Pos(x,y));
    },
    clearPos : function () {
        canvas.pts = []
    },
    addColor : function (active) {
        var rect = document.createElement('div'),r = this.random;
        rect.className = 'rect';
        if(active)
            rect.className+=' active';
        rect.style.backgroundColor = 'rgb('+[r(256),r(256),r(256)].join(',')+')';
        // colors.appendChild(rect);
    },
    random : function (b) {
        return Math.floor(Math.random()*b);
    }
};

function Pos(x,y) {
    this.x=x;this.y=y;
}

function Path(pts,lw,color) {
    this.pts = pts;
    this.lw = lw || canvas.lw;
    this.color = color || canvas.color;
}
 
function Rect(x,y,w,h) {
    this.x=x;this.y=y;this.w=w;this.h=h;
}

utils = {
    makeUserP : function (x) {
        var li = document.createElement('li'); li.id = 'p'+x.id;
        var liHtml = '<div class="score">+0</div><div class="img"><img src="media/imgs/douwa.jpg" alt=""></div>'+
                '<div class="score_count">0</div><div class="play_name">'+x.name+'</div>'
        li.innerHTML = liHtml;
        return li;
    }
}


Rect.prototype.clearOn = function (ctx) {
    ctx.clearRect(this.x,this.y,this.w,this.h);
}