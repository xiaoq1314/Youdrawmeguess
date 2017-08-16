/**
 * Created by zglong on 2016/12/21.
 */
var httpd = require('http').createServer(handler);
var io = require('socket.io').listen(httpd);
var fs = require('fs');
var db = require('./db');
var port = 3000;
httpd.listen(port);
console.log('http://localhost:' + port);

function handler(req, res) {
	fs.readFile(__dirname + '/views/' + (req.url === '/' ? 'room.html' : req.url),
		function(err, data) {
			if(err) {
				res.writeHead(500);
				return res.end('Error loading index.html');
			}
			res.writeHead(200);
			res.end(data);
		}
	);

	// var stream = fs.createReadStream(__dirname+'/static/'+(req.url==='/'?'index.html':req.url));
	// if(stream)
	//     stream.pipe(res);
}
var paths = (function() {
	var _paths = {};
	return {
		set: function(key, paths) {
			_paths[key] = paths;
		},
		add: function(key, pts) {
			console.log("add第34行");
			_paths[key] = _paths[key] || [];
			_paths[key].push(pts);
		},
		get: function(key) {
			return _paths[key];
		},
		remove: function(key) {
			console.log("remove第41行");
			delete _paths[key];
		},
		clear: function() {
			console.log("clear第45行");
			_paths = [];
		},
		toJSON: function() {
			var keys = Object.keys(_paths),
				all = [];
			for(var i in keys) {
				var key = keys[i];
				all = all.concat(_paths[key]);
			}
			return all;
		}
	}
})();

function doCmd(msg, socket) {
	if(msg[0] === '#') {
		var msg = msg.substring(1),
			sockets = (function(s) {
				var a = []
				for(var k in s)
					a.push(s[k]);
				return a;
			})(socket.server.sockets.sockets);
		switch(msg) {
			case 'show paths':
				socket.emit('cmd', JSON.stringify(paths));
				socket.emit('server msg', '指令操作成功！');
				break;
			case 'show users':
				socket.emit('cmd', JSON.stringify(sockets.map(x => x = x.name)));
				socket.emit('server msg', '指令操作成功！');
				break;
			case 'clear paths':
				console.log("清空画布");
				paths.clear();
				socket.emit('server msg', '指令操作成功！');
				socket.broadcast.emit('paint paths', JSON.stringify(paths));
				socket.emit('paint paths', JSON.stringify(paths));
				break;
			default:
				return false;
		}
		return true;
	} else {
		return false;
	}
}

function escapeHTML(data) {
	var s = '';
	for(var i = 0; i < data.length; i++) {
		var d = data[i];
		switch(d) {
			case '"':
				d = '&quot;';
				break;
			case '&':
				d = '&amp;';
				break;
			case '<':
				d = '&lt;';
				break;
			case '>':
				d = '&gt;';
				break;
			case ' ':
				d = '&nbsp;';
				break;
			default:
				s += d;
		}
	}
	return s;
}
function getSockets(s, sort) {
	s = s.server.sockets.sockets;
	var a = []
	for(var k in s)
		a.push(getSocket(s[k]));
	if(sort)
		a = a.sort((x, y) => {
			if(!x.in || !y.in) return 0;
			return x.in - y.in;
		});
	return a;
}

function getSocket(s) {
	return {
		id: 　s.id.substring(2),
		in: s.attrin,
		name: s.name
	}
}
Game = {};
Game.inQueue = []; //等等画的游戏者
Game.player = null; //当前游戏者信息
Game.count = 0; //房间总人数
userArr = []; //记录进来过的玩家数
active = 0; //记录玩家准备的状态
gameFlag = true;  //修改游戏状态
io.sockets.on('connection', function(socket) {
	socket.on('login', function(name) {
		this.attrin = false;
		socket.name = name || socket.id.substring(2);
		socket.sid = socket.id;

        this.on('game begin',function(count){
            var nums = JSON.parse(count);
            if(nums == 4){
                gameFlag = false;
            }
        });
		//userArr.push(socket.name);
		if(userArr.length < 4 && gameFlag) {
			console.log('new user', new Date().format('yyyy-MM-dd hh:mm:ss'), socket.name);
			console.log('new user', new Date().format('yyyy-MM-dd hh:mm:ss'),active);
			userArr.push({ "sid": socket.sid, "name": socket.name, "active": 0 });
		} else {
            socket.emit('user over', JSON.stringify(true));
			return false;
		}
		var msg = "欢迎, " + socket.name + " 加入了房间!";

		var data = {
			"name": "法官：",
			"user": userArr,
			"flag": "suss",
			"msg": msg
		}
		socket.emit('server msg', JSON.stringify(data));
		socket.broadcast.emit('server msg', JSON.stringify(data));

		socket.emit('paint paths', JSON.stringify(paths));
		var users = Game.inQueue.map(x => { return getSocket(x) });
		this.emit('reset in users', JSON.stringify(users));

		this.on('in', function() {
			if(this.attrin) return;
			this.attrin = Date.now();
			Game.inQueue.push(this);
			Game.count++;
			var json = JSON.stringify(getSocket(this));
			this.broadcast.emit('new in user', json);
			this.emit('in', json);

			setTimeout(function() {
				if(Game.player || !Game.inQueue.length) return;
				console.log(Game.player);
				Game.run = arguments.callee
				var t = Game.inQueue[0];
				Game.player = t;
				t.time = 60;
				t.word = db.randomWord();
				t.rights_num = 0;
				var msg = {
					"name": "法官：",
					"msg": "玩家 " + t.name + " 开始画了"
				}
				t.broadcast.emit('server msg', JSON.stringify(msg));
				t.emit('mytime', JSON.stringify({ name: t.name, word: t.word.word, time: t.time, id: t.id.substring(2) }));
				t.broadcast.emit('othertime', JSON.stringify({ name: t.name, time: t.time, id: t.id.substring(2) }));
				Game.timer = setTimeout(function() {
					console.log(t.time, t.name);
					var isrightAll = Game.player.rights_num > 1 && Game.player.rights_num == (Game.count - 1);
					if(t.time === 0 || isrightAll) {
						t.emit('mytimeout', JSON.stringify({ rightNum: Game.player.rights_num, id: t.id.substring(2), word: t.word.word }));
						t.broadcast.emit('timeout', JSON.stringify({ rightNum: Game.player.rights_num, id: t.id.substring(2), word: t.word.word }));
						paths.remove();
						delete t.time;
						delete Game.player;
						delete t.attrin;
						console.log("isrightAll:" + isrightAll);
						console.log("isrightAll:" + isrightAll);
						console.log("t.time:" + t.time);
						// paths=[];
						Game.inQueue.shift();
						setTimeout(Game.run, 8000);
						t.emit('clear paint');
						t.broadcast.emit('clear paint');
						return;
					}
					t.time--;
					var o = { name: t.name, time: t.time, word: t.word.word.length + '个字' };
					if(t.time <= 30) {
						o.word = o.word + ',' + t.word.tip;
					}
					o = JSON.stringify(o);
					t.emit('update my time', o);
					t.broadcast.emit('update time', o);
					Game.timer = setTimeout(arguments.callee, 1000);
				}, 1000);
			}, 4000);
		});

		this.on('erase',function (x,y,w,h) {
            this.broadcast.emit('erase',x,y,w,h);
        });

		this.on('out', function() {
			console.log('before', Game.inQueue.length);
			Game.inQueue.splice(Game.inQueue.findIndex(x => { x.id === this.id }));
			console.log('after', Game.inQueue.length);
			this.attrin = false;
			this.emit('out', this.id.substring(2));
			this.broadcast.emit('out user', this.id.substring(2));
		});

		this.on('client msg', function(msg) {
			if(!doCmd(msg, this)) {
				msg = escapeHTML(msg);
				var date = new Date().format('yyyy-MM-dd hh:mm:ss');
				var data = {
					"name": socket.name + "：",
					"msg": msg
				}
				this.emit('server msg', JSON.stringify(data));
				this.broadcast.emit('server msg', JSON.stringify(data));
			}
		});
		this.on('ready go', function(users_alon) {
			for(var i = 0; i < userArr.length; i++) {
				if(userArr[i].sid == socket.sid) {
					userArr[i].active = 1;
					active = active + userArr[i].active;
				}
			}
			var data = {
				"user": userArr,
				"readyUser": users_alon,
				"flag": "suss",
				"active": true
			}
			//active ++;
			this.emit('server msg', JSON.stringify(data));
			this.broadcast.emit('server msg', JSON.stringify(data));

			this.emit('active msg', JSON.stringify(active));
			this.broadcast.emit('active msg', JSON.stringify(active));
		});
		this.on("answer", function(msg) {
			if(!doCmd(msg, this)) {
				msg = escapeHTML(msg);
				if(Game.player && Game.player.word.word === msg) {
					if(this.prev && this.prev.player === Game.player && this.prev.word === msg) {
						var data = {
							"name": "法官：",
							"msg": "您已经正确回答过了！"
						}
						this.emit('server msg', JSON.stringify(data));
						return;
					}
					Game.player.rights_num++
						console.log(Game.player.rights_num);
					var right_answer = {
						"name": this.name,
						"rightNum": Game.player.rights_num,
						"id": this.id.substring(2)
					}
					console.log(right_answer.rightNum);
					console.log(JSON.stringify(right_answer));
					this.emit("right answer", JSON.stringify(right_answer));
					this.broadcast.emit("right answer", JSON.stringify(right_answer));
					var data = {
						"name": "法官：",
						"msg": "真棒！您的回答正确！"
					}
					this.emit('server msg', JSON.stringify(data));
					var data = {
						"name": "法官：",
						"msg": "恭喜！" + this.name + " 回答正确！"
					}
					this.broadcast.emit('server msg', JSON.stringify(data));
					this.prev = {
						player: Game.player,
						word: msg
					};
					return;
				} else {

					var data = {
						"name": "法官：",
						"msg": "抱歉！" + this.name + " 回答错误！答案不是 " + msg
					}
					this.emit('server msg', JSON.stringify(data));
					this.broadcast.emit('server msg', JSON.stringify(data));
				}
			}
		})

		this.on('disconnect', function() {
			if(Game.player && this.id === Game.player.id) {
				delete Game.player;
				console.log("重置paths301行");
				// paths=[];
				paths.remove();
				Game.inQueue.shift();
				if(Game.timer != null) {
					clearTimeout(Game.timer);
					setTimeout(Game.run, 4000);
				}
				this.broadcast.emit('othertime', JSON.stringify({ name: this.name + '(已退出)', time: 0 }));
				this.broadcast.emit('clear paint');
			}

			var i = Game.inQueue.indexOf(this);
			if(i != -1)
				Game.inQueue.splice(i, 1);
			var msg = "玩家 " + socket.name + ' 离开了房间';
			for(var i = 0; i < userArr.length; i++) {
				if(userArr[i].sid == socket.sid) {
					active = active - userArr[i].active;
					userArr.splice(i, 1);
                    if(gameFlag){
                        msg = "玩家 " + socket.name + ' 退出了房间';
                    }else{
                        msg = "画的人 " + socket.name + ' 掉线了，本轮结束';
                    }
				}
			}
			var data = {
				"name": "法官：",
				"user": userArr,
				"flag": "suss",
				"msg": msg
			}
			this.broadcast.emit('server msg', JSON.stringify(data));
			this.broadcast.emit('out user', this.id.substring(2));
			socket.emit('active msg', JSON.stringify(active));
			socket.broadcast.emit('active msg', JSON.stringify(active));
		});

		this.on('dis user', function() {
			socket.emit('user level');

		});
		// 清空本人的画布
		socket.on('remove paint', function() {
			console.log("paths.remove(this.id)");
			paths.remove(this.id);
			socket.emit('paint paths', JSON.stringify(paths));
			socket.broadcast.emit('paint paths', JSON.stringify(paths));

		});
		socket.on('move my paint', function(x, y) {
			var _paths = paths.get(socket.id) || [];
			_paths.forEach(ele => {
				ele.pts.forEach(v => {
					v.x += x;
					v.y += y;
				});
			});
			paths.set(socket.id, _paths);
			socket.emit('paint paths', JSON.stringify(paths));
			socket.broadcast.emit('paint paths', JSON.stringify(paths));
		});
		socket.on('paint', function(data) {
			data = JSON.parse(data);
			var pts = data.data;
			switch(data.status) {
				case 'ing':
					socket.broadcast.emit('paint pts', JSON.stringify(pts));
					break;
				case 'end':
					socket.broadcast.emit('paint pts', JSON.stringify(pts));
					console.log("end && paths.add(this.id,pts)");
					console.log(paths);
					paths.add(this.id, pts);
					break;
			}
		});

		socket.on('repaint', function() {
			socket.emit('paint paths', JSON.stringify(paths));
		})
	});
	socket.emit('login');
})

Date.prototype.format = function(fmt) { 
	var o = {
		"M+": this.getMonth() + 1, //月份
		"d+": this.getDate(), //日
		"h+": this.getHours(), //小时
		"m+": this.getMinutes(), //分
		"s+": this.getSeconds(), //秒
		"q+": Math.floor((this.getMonth() + 3) / 3), //季度
		"S": this.getMilliseconds() //毫秒
	};
	if(/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
	for(var k in o)
		if(new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
	return fmt;
}