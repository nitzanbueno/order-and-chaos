var express = require("express");
var app = express();
var path = require('path');
//var io = require('socket.io')(app);
var dirpath = path.resolve(__dirname + '/../');
var cloak = require('cloak');

var IDs = {};

cloak.configure({
  port: 8090,
  defaultRoomSize: 2,
  messages: {
    joinRoom: function(id, user) {
      var mate = IDs[id];
      var newRoom = cloak.createRoom(id);
      delete IDs[id];
      user.data.mate = mate;
      mate.data.mate = user;
      newRoom.addMember(user);
      newRoom.addMember(mate);
      newRoom.messageMembers("completed", "");
    },
    initRoom: function(message, user) {
      var id = user.id.substring(0,5);
      IDs[id] = user;
      user.message("setId", id);
    },
    putTile: function(message, user) {
      user.data.mate.message("tile", message);
    }
  }
});

app.get("/", function (req, res) {
  // Send the HTTP header
  // HTTP Status: 200 : OK
  // Content Type: text/plain
  // response.writeHead(200, {'Content-Type': 'text/plain'});

  res.sendFile(path.resolve(__dirname + '/../index.html'));
});

app.get("/p/*", function(req, res) {
  res.sendFile(path.resolve(__dirname + '/../index.html'));
});

app.get("/*", function (req, res) {
  // Send the HTTP header
  // HTTP Status: 200 : OK
  // Content Type: text/plain
  // response.writeHead(200, {'Content-Type': 'text/plain'});
  var s = dirpath + req.url;
  res.sendFile(s);
});

app.listen(8081, function() {
  // Console will print the message
  console.log('Server running at http://127.0.0.1:8081/');
});


cloak.run();
