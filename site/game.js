var enablePlay = false;
var localPlay = false;
var turn = false;
var running = false;
var width = 6;
var height = 6;
var amOrder = false;
// Declare the board
var board;

function enabledPlay() {
  $("#showme").html("");
  enablePlay = true;
  $("#localButton").hide();
  $("#clearButton").show();
}

function addTile(cell, type, color) {
  if (enablePlay) {
    if (!cell.hasClass("marked")) {
      cell.addClass("marked");
      if (type == "o") {
        cell.append('<img class="mark" src="/O_' + color + '.png">');
      } else {
        cell.append('<img class="mark" src="/X_' + color + '.png">');
      }
      var x = parseInt(cell.attr("x"), 10);
      var y = parseInt(cell.attr("y"), 10);
      // mark shall be 'x' or 'o', lowercase if it's order, and uppercase if it's chaos
      var mark;
      if (color == "red") {
        mark = type.toUpperCase();
      } else {
        mark = type.toLowerCase();
      }
      board[x][y] = mark;
      return true;
    }
  }
  return false;
}

function getColor(me) {
  // if me is true, get my color, else get my foe's color
  if (localPlay) {
    if (turn) {
      return "red";
    } else {
      return "blue";
    }
  } else {
    if (me == amOrder) {
      // Order is blue and chaos is red
      // So if I am order or if it's not my turn, return blue
      return "blue";
    } else {
      // If I am chaos or it's not my turn, return red
      return "red";
    }
  }
}

function clearBoard() {
  $("table.board td").html("");
  $("table.board td").removeClass("marked");
  board = new Array(width);
  for (var i = 0; i < width; i++) {
    board[i] = new Array(height);
  }
}

function canPlay() {
  return turn || localPlay;
}

function updateTurn(newTurn) {
  turn = newTurn;
  if (localPlay) {
    if (turn) {
      $("#turn").html("It is now <strong style=\"color:" + getColor() + "\">Chaos's</strong> turn.");
    } else {
      $("#turn").html("It is now <strong style=\"color:" + getColor() + "\">Order's</strong> turn.");
    }
  } else {
    if (turn) {
      $("#turn").html("It is now <strong>your</strong> turn.");
    } else {
      $("#turn").html("It is now <strong>your opponent's</strong> turn.");
    }
  }
}

// Reset all HTML elements (except showme) to their initial state
function resetPage() {
  $("#friendlink").html("Loading...");
  $("#turn").html("");
  $("#localButton").show();
  $("#clearButton").hide();
  enablePlay = false;
}

// Send every tile that's currently on my board to the opponent via addTile.
// Useful when opponent is reconnecting
function sendBoard() {
  for (var x = 0; x < width; x++) {
    for (var y = 0; y < height; y++) {
      if (board[x][y]) {
        var mark = board[x][y];
        var type = mark.toLowerCase();
        // mark == type means mark is lowercase, so it's order. Else it's chaos.
        var color = mark == type ? "blue" : "red";
        if (mark) {
          var mess = x + "," + y + "," + type + "," + color;
          console.log(mess);
          cloak.message("sendTile", mess);
        }
      }
    }
  }
}

var userID = "original";
$(function () {
  // Generate Table
  var tablestr = "";
  for (var y = 0; y < height; y++) {
    tablestr += "<tr>";
    for (var x = 0; x < width; x++) {
      tablestr += "<td x='" + x + "' y='" + y + "'></td>";
    }
    tablestr += "</tr>";
  }
  $("#board").append(tablestr);
  $("table.board td:not(.marked)").on({
    mousedown: function (event) {
      if (canPlay()) {
        var type = "x";
        var cell = $(this);
        if (event.which == 3) {
          type = "o";
        }
        var color = getColor(true);
        if (addTile(cell, type, color)) {
          updateTurn(!turn);
          cloak.message("putTile", cell.attr("x") + "," + cell.attr("y") + "," + type);
        }
      }
    },
    contextmenu: function () {
      return false;
    }
  });
  clearBoard();
  $("#localButton").click(function () {
    localPlay = true;
    clearBoard();
    if (running) {
      cloak.end();
      running = false;
    }
    $("#friendlink").html("You are playing locally.");
    enabledPlay();
  });
  $("#clearButton").click(function () {
    clearBoard();
    cloak.message("clearBoard", "");
  });
  var url = window.location.pathname;
  cloak.configure({
    serverEvents: {
      begin: function () {
        console.log("BEGAN");
        if (url.startsWith("/p/")) {
          cloak.message("joinRoom", url.substring(3));
        } else {
          cloak.message("initRoom", "");
        }
      }
    },
    messages: {
      setId: function (id) {
        userID = id;
        $("#friendlink").html(window.location.protocol + "//" + window.location.hostname + "/p/" + id);
      },
      completed: function (message) {
        data = message.split(",");
        // The role of the player (order or chaos)
        role = data[0];
        if (role == "order") {
          role = "Order";
          amOrder = true;
        } else if (role == "chaos") {
          role = "Chaos";
          amOrder = false;
        }
        // The turn is the second part of the message
        updateTurn(data[1] == "turn");
        $("#friendlink").html("You are connected.<br><small>You are playing as <strong style=\"color: " + getColor(true) + "\">" + role + "</strong>.</small>");
        sendBoard();
        enabledPlay();
      },
      tile: function (tiledata) {
        // tile means the opponent has played a tile
        updateTurn(true);
        var data = tiledata.split(",");
        addTile($("td[x='" + data[0] + "'][y='" + data[1] + "']"), data[2], getColor(false));
      },
      blindTile: function (tiledata) {
        // blindTile means opponent is sending a tile but not through playing.
        // When a board gets sent via reconnection this gets called
        var data = tiledata.split(",");
        addTile($("td[x='" + data[0] + "'][y='" + data[1] + "']"), data[2], data[3]);
      },
      clear: function (message) {
        clearBoard();
      },
      disconnected: function (message) {
        $("#showme").html("You opponent has disconnected. <br>To reconnect, they should go to this URL:");
        resetPage();
      }
    }
  });
  $.getJSON('/config.json', function (config) {
    if (!localPlay) {
      cloak.run(config.cloakhost);
      running = true;
    }
  })

});