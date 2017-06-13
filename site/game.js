var enablePlay = false;
var localPlay = false;
// Local play: true=Chaos, false=Order
// Web play: true = Your turn, false = Opponent's turn
var turn = false;
var running = false;
var width = 6;
var height = 6;
var amOrder = false;
var isAI = false;
// Declare the board
var board;

function enabledPlay() {
  $("#showme").html("");
  enablePlay = true;
  $("#localPlay").hide();
  $("#clearButton").show();
  console.log("ENABLE");
}

function xyToCell(x, y) {
  return y * width + x;
}

function cellToXY(cell) {
  return [cell % width, Math.floor(cell / width)];
}

function addTileById(id, type, color) {
  cell = $('td[cellId="' + id + '"]');
  return addTile(cell, type, color);
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
      var id = parseInt(cell.attr("cellId"), 10);
      board[id].mark = type;
      board[id].color = color;
      return true;
    }
  }
  return false;
}

function getColor(me) {
  // if me is true, get my color, else get my foe's color
  if (localPlay && !isAI) {
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
  board = new Array(width * height);
  for (var x = 0; x < width; x++) {
    for (var y = 0; y < height; y++) {
      var id = xyToCell(x, y);
      var cell = {
        mark: undefined,
        color: undefined,
        id: id
      }
      board[id] = cell;
    }
  }
  initLines(board);
}

function canPlay() {
  return turn || (localPlay && !isAI);
}

// newTurn is:
// True for order, false for chaos in local play.
// True for your turn, false for opponent's turn in net play or AI play.
function updateTurn(newTurn) {
  turn = newTurn;
  var winString = getWinString(board);
  if (winString != "") {
    // We got a win
    $("#turn").html("<strong>" + winString + "</strong>");
    enablePlay = false;
    return;
  }
  if (localPlay && !isAI) {
    if (turn) {
      // Chaos
      $("#turn").html("It is now <strong style=\"color:" + getColor() + "\">Chaos's</strong> turn.");
    } else {
      // Order
			$("#turn").html("It is now <strong style=\"color:" + getColor() + "\">Order's</strong> turn.");
    }
  }
  else {
    if (turn) {
      $("#turn").html("It is now <strong>your</strong> turn.");
    } else {
      $("#turn").html("It is now <strong>your opponent's</strong> turn.");
			if (isAI) {
				setTimeout(doAI, 1000);
			}
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
  for (var i = 0; i < width * height; i++) {
    if (board[i]) {
      var type = board[i].mark;
      var color = board[i].color;
      if (type) {
        var messij = i + "," + type + "," + color;
        cloak.message("sendTile", messij);
      }
    }
  }
}

// Does the opponent's AI move.
function doAI() {
	if (amOrder) {
		doChaosAI();
	}
	else {
		doOrderAI();
	}
  updateTurn(true);
}

function doOrderAI() {
  move = orderAI(board);
  if(move) {
    if(addTileById(move.cell, move.mark, "blue")) {
      updateTurn(true);
    }
    else {
      console.error("Cell taken or something");
      console.error(JSON.stringify(move));
    }
  }
}

function doChaosAI() {
  move = chaosAI(board);
  if(move) {
    if(addTileById(move.cell, move.mark, "red")) {
      updateTurn(true);
    }
    else {
      console.error("Cell taken or something");
      console.error(JSON.stringify(move));
    }
  }
}

function playLocal() {
	localPlay = true;
	clearBoard();
	if (running) {
		cloak.end();
		running = false;
	}
	$("#friendlink").html("You are playing locally.");
	enabledPlay();
	updateTurn(true);
}

function playAI() {
  isAI = true;
  amOrder = Math.random() > 0.5;
  role = amOrder ? "Order" : "Chaos";
	clearBoard();
	if (running) {
		cloak.end();
		running = false;
	}
	$("#friendlink").html("You are playing as " + role + ".");
	enabledPlay();
	updateTurn(true);
}

var userID = "original";
$(function () {
  // Generate Table
  var tablestr = "";
  for (var y = 0; y < height; y++) {
    tablestr += "<tr>";
    for (var x = 0; x < width; x++) {
      var id = xyToCell(x, y);
      tablestr += "<td cellId='" + id + "'></td>";
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
          console.log("RC");
          type = "o";
				}
        var color = getColor(true);
        if (addTile(cell, type, color)) {
          console.log("CLICK SUCCESS");
          updateTurn(!turn);
          cloak.message("putTile", cell.attr("cellId") + "," + type);
        }
        else console.log("CLICK FAIL");
      }
    },
    contextmenu: function () {
      console.log("CONTEXT");
      if (canPlay()) {
        var type = "o";
        var cell = $(this);
        var color = getColor(true);
        if (addTile(cell, type, color)) {
          console.log("CONTEXT SUCCESS");
          updateTurn(!turn);
          cloak.message("putTile", cell.attr("cellId") + "," + type);
        }
        else console.log("CONTEXT FAIL");
      }
      return false;
    }
  });
  clearBoard();
  $("#localButton").click(playLocal);
  $("#clearButton").click(function () {
    clearBoard();
    enablePlay = true;
    updateTurn(turn);
    cloak.message("clearBoard", "");
  });
  $("#aiButton").click(playAI);
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
        if(!enablePlay) {
          $("#friendlink").html(window.location.protocol + "//" + window.location.hostname + "/p/" + id);
        }
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
		console.log("CONN");
        enabledPlay();
      },
      tile: function (tiledata) {
        // tile means the opponent has played a tile
        var data = tiledata.split(",");
        addTileById(data[0], data[1], getColor(false));
        updateTurn(true);
      },
      blindTile: function (tiledata) {
        // blindTile means opponent is sending a tile but not through playing.
        // When a board gets sent via reconnection this gets called
        var data = tiledata.split(",");
        addTileById(data[0], data[1], data[2]);
        updateTurn(turn);
      },
      clear: function (message) {
        clearBoard();
        enablePlay = true;
        updateTurn(turn);
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
