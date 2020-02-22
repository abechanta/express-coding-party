//
// global
//
var param = {
};

var ui = {
	connectButton: null,
	disconnectButton: null,
	hideButton: null,
	usersName: null,
	usersMessage: null,
	someonesNode: null,
	someonesLabel: null,
	someonesMessage: null,
	othersNodes: {},

	initUi: function () {
		ui.connectButton = document.getElementById("connect");
		ui.disconnectButton = document.getElementById("disconnect");
		ui.hideButton = document.getElementById("hide");
		ui.usersName = document.getElementById("username");
		ui.usersMessage = document.getElementById("message");
		ui.someonesNode = document.getElementById("someones");
		ui.someonesLabel = document.getElementById("someonesLabel");
		ui.someonesMessage = document.getElementById("someonesMessage");
	},

	disableUi: function () {
		ui.usersMessage.readOnly = true;
		ui.usersName.disabled = true;
		ui.connectButton.disabled = true;
		ui.disconnectButton.disabled = true;
	},

	updateUi: function (isJoined) {
		ui.usersMessage.readOnly = !isJoined;
		ui.usersName.disabled = isJoined;
		ui.connectButton.disabled = isJoined || (ui.usersName.value.length == 0);
		ui.disconnectButton.disabled = !isJoined;
	},

	updateSomeones: function (someone) {
		if (ui.othersNodes[someone] == null) {
			return;
		}

		var h3array = ui.othersNodes[someone].getElementsByTagName("h3");
		var taarray = ui.othersNodes[someone].getElementsByTagName("textarea");

		if (
			(h3array.length == 0) ||
			(taarray.length == 0)
		) {
			return;
		}

		// update visibility.
		ui.someonesNode.style.display = "block";

		// update label & message.
		ui.someonesLabel.innerHTML = h3array[0].innerHTML;
		ui.someonesMessage.value = taarray[0].value;
	},

	createOthers: function () {
		var se = document.createElement("div");
		var h3, ta;
		{
			h3 = document.createElement("h3");
			se.appendChild(h3);
		}
		{
			ta = document.createElement("textarea");
			ta.readOnly = true;
			ta.cols = "79";
			ta.rows = "20";
			se.appendChild(ta);
		}
		others.appendChild(se);
		return {
			se: se,
			h3: h3,
			ta: ta
		};
	},

	updateOthers: function (someone, entryList) {
		for (var key in entryList) {
			var entry = entryList[key];
			var se = ui.othersNodes[entry.username];
			if (se == null) {
				return;
			}

			var h3array = se.getElementsByTagName("h3");
			var taarray = se.getElementsByTagName("textarea");

			if (
				(h3array.length == 0) ||
				(taarray.length == 0)
			) {
				return;
			}

			// update visibility.
			se.style.display = (
				!ui.hideButton.checked &&
				(entry.username != someone)
			) ? "inline-block" : "none";

			// update label & message.
			h3array[0].innerHTML = entry.username;
			taarray[0].value = entry.message;
		}
	}
};

var globals = {
	isJoined: false,
	username: "you",
	someone: "master",
	entryList: []
};

//
// util
//
var util = {
	connect: function(element, type, callback) {
		if (window.addEventListener) {
			element.addEventListener(type, callback, false);
		} else {
			// for older IE
			element.attachEvent("on" + type,
				function () { 
					return callback(window.event); 
				}
			);
		}
	},

	createXHR: function () {
		if (XMLHttpRequest) {
			return new XMLHttpRequest();
		} else {
			// for older IE
			return new ActiveXObject('MSXML2.XMLHTTP.6.0');
		}
	}
};

//
// ページが読み込まれたら呼び出される
//
util.connect(window, "load",
	function () {
		//
		// register event handlers.
		//
		ui.initUi();

		var sendEntry = function (action) {
			var data = "username=" + encodeURIComponent(ui.usersName.value) + "&action=" + action;
			var xhr = util.createXHR();

			xhr.open("POST", "/entry", false);	// sync
			xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			xhr.send(data);
			return (xhr.readyState == 4) && (xhr.status == 202);
		};

		util.connect(ui.connectButton, "click",
			function (evt) {
				ui.disableUi();
				globals.username = ui.usersName.value;
				if (sendEntry("connect")) {
					globals.isJoined = true;
				} else {
					alert("connect failed. try with another username.");
				}
				ui.updateUi(globals.isJoined);
			}
		);

		util.connect(ui.disconnectButton, "click",
			function (evt) {
				ui.disableUi();
				if (sendEntry("disconnect")) {
					globals.isJoined = false;
				} else {
					alert("disconnect failed.");
				}
				ui.updateUi(globals.isJoined);
			}
		);

		var sendMessage = function () {
			var data = "username=" + encodeURIComponent(ui.usersName.value) + "&message=" + encodeURIComponent(ui.usersMessage.value);
			var xhr = util.createXHR();

			xhr.open("POST", "/message", true);	// async
			xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			xhr.send(data);
		};

		util.connect(ui.usersMessage, "keyup",
			function (evt) {
				sendMessage();
			}
		);

		util.connect(ui.hideButton, "click",
			function (evt) {
				ui.updateOthers(globals.someone, globals.entryList);
			}
		);

		//
		// do first messaging.
		//
		loop(true);

		//
		// for ui tweak.
		//
		util.connect(ui.usersName, "keyup",
			function (evt) {
				ui.connectButton.disabled = (ui.usersName.value.length <= 0) ? true : false;
			}
		);

		util.connect(ui.usersName, "change",
			function (evt) {
				ui.connectButton.disabled = (ui.usersName.value.length <= 0) ? true : false;
			}
		);

		ui.usersName.focus();

		util.connect(document, "keydown",
			function (evt) {
				//console.dir(evt);
				if (evt == null) {
					return;
				}

				// NOTE: nodeName よりは tagName を使うべし。
				// http://aleembawany.com/2009/02/11/tagname-vs-nodename/
				if (
					// 全体で Backspace キー入力を無視する
					(evt.keyCode == 8) &&
					(
						(evt.srcElement == null) ||
						(evt.srcElement.id != "message") &&
						(evt.srcElement.tagName != "INPUT")
					) ||
					// input で Enter キー入力を無視する
					(evt.keyCode == 13) &&
					(
						(evt.srcElement) &&
						(evt.srcElement.tagName == "INPUT")
					)
				) {
					evt.returnValue = false;
					evt.cancelBubble = true;
				}
			}
		);

		// TAB キーをフォーカス移動ではなく TAB 文字の入力にマッピングする
		// かつ 範囲指定+TAB キーでブロックインデントする
		// かつ 範囲指定+Shift+TAB キーでブロック逆インデントする
		// → ここだけちょっと面倒なので／insertTab() が正常動作しないので、jQuery を使っちゃいました
		$("textarea#message").tabby();
	}
);

//
// ログを受け取るループを行う
//
function loop(isFirst) {
	var xhr = util.createXHR();
	var query = isFirst ? "" : ("?" + new Date().getTime());

	xhr.open("GET", "/message" + query, true);	// async
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				globals.entryList = eval(xhr.responseText);
				render();
			}
			loop(false);
		}
	};
	xhr.send();
}

//
// 受け取ったログ情報を画面に表示する
//
function render() {
	console.log("recv: ");
	console.dir(globals.entryList);

	var tmpNodes = ui.othersNodes;
	ui.othersNodes = {};	// cleanup

	var others = document.getElementById("others");

	for (var key in globals.entryList) {
		var entry = globals.entryList[key];

		if (tmpNodes[entry.username]) {
			// window node found, now reuse it.
			ui.othersNodes[entry.username] = tmpNodes[entry.username];

		} else {
			// window node not found, now create for it.
			var uiarray = ui.createOthers();
			ui.othersNodes[entry.username] = uiarray.se;
			util.connect(uiarray.h3, "click",
				function (evt) {
					if (
						(evt == null) ||
						(evt.srcElement == null)
					) {
						return;
					}
					globals.someone = evt.srcElement.innerHTML;
					ui.updateOthers(globals.someone, globals.entryList);
					ui.updateSomeones(globals.someone);
				}
			);
		}
	}

	// delete window nodes of disconnect users.
	for (var oldNode in tmpNodes) {
		if (ui.othersNodes[oldNode] == null) {
			// found in old ui.otherNodes(as tmpNode) & not found in new ui.otherNodes
			others.removeChild(tmpNodes[oldNode]);
			console.log("deleteChild");
		}
	}

	ui.updateOthers(globals.someone, globals.entryList);
	ui.updateSomeones(globals.someone);
}
// eof
