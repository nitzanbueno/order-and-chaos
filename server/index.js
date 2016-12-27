var express = require("express");
var app = express();
var path = require('path');
//var io = require('socket.io')(app);
var dirpath = path.resolve(__dirname + '/../');
var cloak = require('cloak');

var IDs = {};

app.get("/*", function (req, res) {
  // Send the HTTP header
  // HTTP Status: 200 : OK
  // Content Type: text/plain
  // response.writeHead(200, {'Content-Type': 'text/plain'});
  var s = dirpath + req.url;
  res.sendFile(s);
});

var server = app.listen(process.env.PORT, function () {
  // Console will print the message
  console.log('Server running...');
});

cloak.configure({
  express: server,
  defaultRoomSize: 2,
  messages: {
    joinRoom: function (id, user) {
      var mate = IDs[id];
      var newRoom = cloak.createRoom(id);
      delete IDs[id];
      user.data.mate = mate;
      mate.data.mate = user;
      newRoom.addMember(user);
      newRoom.addMember(mate);
      var chaos = Math.random() >= 0.5;
      if (chaos) {
        user.message("completed", "chaos");
        mate.message("completed", "order");
      } else {
        mate.message("completed", "chaos");
        user.message("completed", "order");
      }
    },
    initRoom: function (message, user) {
      var id = user.id.substring(0, 5);
      IDs[id] = user;
      user.message("setId", id);
    },
    putTile: function (message, user) {
      user.data.mate.message("tile", message);
    },
    clearBoard: function (message, user) {
      user.data.mate.message("clear", message);
    }
  }
});

cloak.run();