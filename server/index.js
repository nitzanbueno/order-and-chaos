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

function setId(m, user) {
  var id = user.id.substring(0, 5);
  IDs[id] = user;
  user.message("setId", id);
}

cloak.configure({
  express: server,
  defaultRoomSize: 2,
  pruneEmptyRooms: 2000,
  messages: {
    joinRoom: function (id, user) {
      // User requested id, so their mate is IDs[id]
      if (id in IDs) {
        var mate = IDs[id];
      }
      // If the requested mate doesn't exist, 
      // we're just gonna act as if there was no request and set ID
      else {
        setId(id, user);
        return;
      }
      var newRoom = cloak.createRoom(id);
      delete IDs[id];
      user.data.mate = mate;
      mate.data.mate = user;
      newRoom.addMember(user);
      newRoom.addMember(mate);
      // If true, then 'user' is chaos, else 'user' is order
      var chaos;
      // If mate is defined to be chaos (by previous connect) than that takes hold
      if ('chaos' in mate.data) {
        chaos = !mate.data.chaos;
      } else {
        // Else just randomly choose
        chaos = Math.random() >= 0.5;
      }
      
      
      // Messages are in the form "<order/chaos>,<turn/wait>"
      // with "order/chaos" meaning the role of the player, and "turn/wait" meaning who goes first
      // The message sent to the "hosting" user
      var userMessage;
      // The message sent to the mate
      var mateMessage;

      if (chaos) {
        userMessage = "chaos";
        user.data.chaos = true;
        mateMessage = "order";
        mate.data.chaos = false;
      } else {
        mateMessage = "chaos";
        mate.data.chaos = true;
        userMessage = "order";
        user.data.chaos = false;
      }
      
      // Similarly with the turn
      var turn = Math.random() >= 0.5;
      if ('turn' in mate.data) {
        turn = !mate.data.turn;
      }
      if (turn) {
        userMessage += ",turn";
        user.data.turn = true;
        mateMessage += ",wait";
        mate.data.turn = false;
      } else {
        mateMessage += ",turn";
        mate.data.turn = true;
        userMessage += ",wait";
        user.data.turn = false;
      }
      
      user.message("completed", userMessage);
      mate.message("completed", mateMessage);
    },
    initRoom: setId,
    putTile: function (message, user) {
      user.data.mate.message("tile", message);
      // putTile means the user has just played so it's now not their turn
      user.data.turn = false;
      user.data.mate.data.turn = true;
    },
    sendTile: function (message, user) {
      user.data.mate.message("blindTile", message);
    },
    clearBoard: function (message, user) {
      user.data.mate.message("clear", message);
    }
  },
  clientEvents: {
    disconnect: function (user) {
      // Hopefully the user has a mate, if not the room shall disintegrate
      var mate = user.data.mate;
      try {
        // Let the connected user (if exists) know their opponent has disconnected
        if (mate.connected()) {
          mate.message("disconnected", "");
          // Then allow for the option to reconnect
          setId(null, mate);
        }
      } catch (err) {
        // Mate probably doesn't exist or something, I dunno
        // Anyways, just do nothing
      }
    }
  }
});

cloak.run();