var express = require("express");
var defaultHtml = "v2.html";
var app = express();
app.configure(
	function () {
		app.use(express.static(__dirname + "/public"));
		app.use(express.bodyParser());
		app.use(express.logger());
	}
);

var messageStore = {
	_messages: [],
	_listeners: [],

	addUser: function (entry) {
		console.log("debug: addUser");
		console.dir(entry);

		var bDone = false;

		// find user entry.
		var ii = 0;
		for (; ii < this._messages.length; ii++) {
			if (this._messages[ii].username == entry.username) {
				// found.
				if (entry.action === "disconnect") {
					this._messages.splice(ii, 1);
					bDone = true;
				} else {
					// nothing to be done with "connect" for existing user.
				}
				break;
			}
		}

		if (ii >= this._messages.length) {
			// not found.
			if (entry.action === "connect") {
				this._messages.push(
					{
						username: entry.username,
						message: "",
					}
				);
				bDone = true;
			} else {
				// nothing to be done with "disconnect" for non-existing user.
			}
		}

		return bDone;
	},

	addMessage: function (entry) {
		console.log("debug: addMessage");
		console.dir(entry);
		console.dir(this._messages);
		console.dir(this._listeners);

		// find user entry.
		var ii = 0;
		for (; ii < this._messages.length; ii++) {
			if (this._messages[ii].username == entry.username) {
				// found.
				this._messages[ii] = entry;
				break;
			}
		}

		for (var key in this._listeners) {
			this._listeners[key]();
			console.log("debug: listeners done/" + key);
		}
		this._listeners.splice(0, this._listeners.length);
	},

	listenOnce: function (listener) {
		console.log("debug: listenOnce");

		this._listeners.push(listener);
	},

	getMessages: function () {
		console.log("debug: getMessages");

		return this._messages;
	},
}

app.get("/",
	function (req, res) {
		console.log("log: get '/'");
		res.redirect(defaultHtml);
	}
);

app.post("/entry",
	function (req, res) {
		console.log("log: post '/entry'");
		var bDone = messageStore.addUser(
			{
				username: req.body.username,
				action: req.body.action,
			}
		);
		if (bDone) {
			res.send("entry accepted.", 202);

			if (req.body.action == "connect") {
				// notify all users that new user is joined.
				messageStore.addMessage(
					{
						username: req.body.username,
						message: "",
					}
				);
			}
		} else {
			res.send("entry rejected.", 406);
		}
	}
);

app.post("/message",
	function (req, res) {
		console.log("log: post '/message'");
		messageStore.addMessage(
			{
				username: req.body.username,
				message: req.body.message,
			}
		);
		res.send("message received.", 202);
	}
);

app.get("/message",
	function (req, res) {
		console.log("log: get '/message'");
		res.header("content-type", "text/javascript");
		if (req.url == "/message") {
			// this is first time, so respond in sync, immediately.
			res.end(JSON.stringify(messageStore.getMessages()));
		} else {
			// this is NOT first time, so respond in async.
			// this means that the responce will be invoked by messageStore.addMessage().
			messageStore.listenOnce(
				function () {
					res.end(JSON.stringify(messageStore.getMessages()));
				}
			);
		}
	}
);

app.listen(8080);	// all connections will be accepted via INADDR_ANY.

console.log("Server running at http://127.0.0.1:8080/");
