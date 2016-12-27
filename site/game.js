var enablePlay = false;
var localPlay = false;
var turn = false;
var running = false;
var width = 6;
var height = 6;

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
        return true;
      } else {
        cell.append('<img class="mark" src="/X_' + color + '.png">');
        return true;
      }
    }
  }
  return false;
}

function clearBoard() {
  $("table.board td").html("");
  $("table.board td").removeClass("marked");
}
var userID = "original";
$(function () {
  // Generate Table
  var tablestr = "";
  for (y = 0; y < height; y++) {
    tablestr += "<tr>";
    for (x = 0; x < width; x++) {
      tablestr += "<td x='" + x + "' y='" + y + "'></td>";
    }
    tablestr += "</tr>";
  }
  $("#board").append(tablestr);
  $("table.board td:not(.marked)").on({
    mousedown: function (event) {
      var type = "x";
      var cell = $(this);
      if (event.which == 3) {
        type = "o";
      }
      var color = "blue"
      if (localPlay) {
        if (turn) {
          color = "red";
        }
      }
      if (addTile(cell, type, color)) {
        turn = !turn;
        cloak.message("putTile", cell.attr("x") + "," + cell.attr("y") + "," + type);
      }
    },
    contextmenu: function () {
      return false;
    }
  });
  $("#localButton").click(function () {
    localPlay = true;
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
        $("#friendlink").html("You are connected.");
        enabledPlay();
      },
      tile: function (tiledata) {
        var data = tiledata.split(",");
        addTile($("td[x='" + data[0] + "'][y='" + data[1] + "']"), data[2], "red");
      },
      clear: function (message) {
        clearBoard();
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