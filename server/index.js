var express = require("express");
var app = express();
var path = require('path');
//var io = require('socket.io')(app);
var dirpath = path.resolve(__dirname + '/../');
var cloak = require('cloak');

var IDs = {};

cloak.configure({
  port: process.env.PORT,
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

cloak.run();
