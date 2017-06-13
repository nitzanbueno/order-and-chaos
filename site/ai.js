// AI Utilities

// Old get line function with x and y
// (Deprecated)
function getLine_xy(board, id) {
    // These variables are modified, then iteratively dx is added to x and dy is added to y until out of range
    var x = 0, y = 0, dx = 0, dy = 0;
    if (id < 6) {
        // Horizontal row
        x = 0;
        y = id;
        dx = 1;
        dy = 0;
    } else if (id < 12) {
        // Vertical column
        x = id - 6;
        y = 0;
        dx = 0;
        dy = 1;
    } else if (id < 15) {
        // Top-left to bottom-right diagonal
        dx = 1;
        dy = 1;
        // 12 -> main diagonal (x=y=0), 13 -> x=1, y=0, 14 -> x=0,y=1
        // Easiest way: subtract 12, then the binary bits are xy
        x = (id - 12) & 1;
        y = (id - 12) >>> 1;
    } else if (id < 18) {
        // Top-right to bottom-left diagonal
        dx = -1;
        dy = 1;
        // 15 -> main diagonal (x=5, y=0), 16 -> x=4, y=0, 17 -> x=5,y=1
        // Copied and altered from above:
        x = 5 - ((id - 15) & 1);
        y = (id - 15) >>> 1;
    }

    // Iterate through board until we're out of range
    var line = [];
    while (x >= 0 && x < 6 && y >= 0 && y < 6) {
        var tile = board[x][y];
        line.push(tile);
        x += dx;
        y += dy;
    }

    line.lineId = id;
    return line;
}

// Gets a line from the board by the ID
// Line = Row, column or diagonal
// Return value is array with special property "lineId"
// ID is zero-based and the order is:
// First the rows, then columns, then TL-BR diags, then TR-BL diags
function getLine(board, id) {
    // These variables are modified, then iteratively d is added to i size times or until out of range
    // Size is 6 for rows, columns and main diagonals, but 5 for secondary diagonals
    var i = 0, d = 0, size = width;
    if (id < width) {
        // Horizontal row
        i = id * width;
        d = 1;
    } else if (id < width + height) {
        // Vertical column
        i = id - 6;
        d = width;
    } else if (id < width + height + 3) {
        // Top-left to bottom-right diagonal
        d = width + 1;
        // 12 -> main diagonal (i=0), 13 -> i=1, 14 -> i=width
        i = id - 12;
        if (i == 2) {
          i = width;
        }
        if (id != 12) {
          size = 5;
        }
    } else if (id < width + height + 6) {
        // Top-right to bottom-left diagonal
        d = width - 1;
        // 15 -> main diagonal (i = 5), 16 -> i=4, 17 -> i=width+5
        // Copied and altered from above:
        i = 20 - id;
        if (i == 3) {
          i = width + 5;
        }
        if (id != 15) {
          size = 5;
        }
    }

    // Iterate through board until we're out of range or size reaches 0
    var line = [];
    while (i < width * height && size > 0) {
        var tile = board[i];
        if (!tile.lines) {
          tile.lines = new Set();
        }
        tile.lines.add(id);
        line.push(tile);
        i += d;
        size -= 1;
    }

    line.lineId = id;
    return line;
}

// Total number of lines that can win the game (lines of length 5 or more)
var numLines = width + height + 6;

var lines = Array(numLines);
var cells = Array(width * height);

// Updates "lines" to the given board.
function initLines(board) {
  for (var i = 0; i < numLines; i++) {
    var line = getLine(board, i);
    lines[i] = line;
  }
}

// Returns true if a line is disqualified
// A line is "disqualified" or "DQ'd" if you cannot win it no matter what you do
function disqualified(line, swapId, swapMark) {
    var xCount = line.xCount;
    var oCount = line.oCount;
    if (swapMark) {
      if (swapMark == 'x') {
        xCount++;
      } else {
        oCount++;
      }
    }

    // Remove obvious cases
    if (xCount == 0 || oCount == 0) {
        return false;
    } else if (xCount > 1 && oCount > 1) {
        if(!swapMark) {
          line.disqualified = true;
        }
        return true;
    }

    // There has to be a better way but fuck it

    // Goes through every row of 5 cells to see if it can be taken
    // If one can, return false
    var n = line.length;

    // Go through each option
    for (var start = 0; start <= n - 5; start++) {
        var initial = undefined;
        var qualified = true;
        for (var i = start; i < start + 5; i++) {
            var mark = line[i].mark;
            if (swapMark && swapId == line[i].id) {
              mark = swapMark;
            }
            if (mark) {
                if (initial && mark != initial) {
                    qualified = false;
                    break;
                }
                else if (!initial) {
                    initial = mark;
                }
            }
        }
        if (qualified) {
            return false;
        }
    }

    if(!swapMark) {
      line.disqualified = true;
    }
    return true;
}


// Alters the given line to contain the up-to-date xCount, oCount,
// emptyCount, dominant and dominantCount properties.
// The "dominant" is the mark with the most appearances in the row.
function XOCount(line) {
    var xcount = 0, ocount = 0;
    for (var i = 0; i < line.length; i++) {
        if (line[i].mark == "x") {
            xcount++;
        } else if (line[i].mark == "o") {
            ocount++;
        }
    }
    line.xCount = xcount;
    line.oCount = ocount;
    line.emptyCount = line.length - xcount - ocount;
    if (xcount > ocount) {
        line.dominantCount = xcount;
        line.dominant = 'x';
    } else if (ocount > xcount) {
        line.dominantCount = ocount;
        line.dominant = 'o';
    } else {
        line.dominantCount = ocount;
    }

}

function winCheck(line) {
    // Returns the placement if there's a win, undefined if not

    // There might be a win here because there are 4 of a kind on the line
    // (Although not guaranteed, for example OO--OO)
    if(!(line.dominantCount > 3)) {
        return undefined;
    }
    var n = line.length;

    // Cycle through all sub-lines and if there's a win on the sub-line, place htere
    for (var start = 0; start <= n - 5; start++) {
        // How many of the same tile are on the subset
        var nullId = 0;
        var count = 0;
        for (var i = start; i < start + 5; i++) {
            if (line[i].mark) {
                if (line[i].mark == line.dominant) {
                    count += 1;
                } else {
                    // Make sure that something like OOOOX is not accidentally considered
                    // (count would be 4)
                    count = -1;
                    break;
                }
            } else {
                // If there are 4 of the same tile, this is going to be the 5th
                // (where we place the win)
                nullId = line[i].id;
            }
        }
        if (count == 4) {
            var placement = {mark: line.dominant, cell: nullId};
            return placement;
        }
    }

    return undefined;
}

function trapCheck(line) {
    // Traps not possible on lines less than 6 tiles long
    // Also not possible if line doesn't have exactly 3 dominants (and nothing else)
    // And also not possible if line has something in its edges
    if (line.length < 6 || line.dominantCount < 3 || line.emptyCount < 3 || line[0].mark || line[5].mark) {
        return undefined;
    }

    // Otherwise it's definitely possible so get the empty middle tile and make the move
    for(var i = 1; i < 5; i++) {
        if (!line[i].mark) {
            return {
                cell: line[i].id,
                mark: line.dominant
            };
        }
    }
}

function getSolarity(cell, mark) {
  var solarity = 0;
  if(!cell.lines) {
    initLines(board);
  }
  for(let lineId of cell.lines) {
    var line = lines[lineId];
    if (line.emptyCount == line.length) {
      // Empties have a +1 weight
      solarity += 1;
    } else if (!disqualified(line)) {
      if (disqualified(line, cell.id, mark)) {
        // Adding the mark would ruin the line
        // Destructions have a -2 weight
        solarity -= 2;
      } else {
        // Not empty, yet not disqualified
        // If line has one (or more) of the other type, it's considered "technically empty" and counts as +1
        // Else, it has just tiles of the same type, and then it's a reinforcement and counts as +2
        if ((mark == 'o' && line.xCount > 0) || (mark == 'x' && line.oCount > 0)) {
          solarity += 1;
        } else {
          solarity += 2;
        }
      }
    }
  }
  return solarity;
}

function union(setA, setB){
  var u = new Set(setA);
  for (var elem of setB) {
      u.add(elem);
  }
  return u;
}

function isWin(line) {
  // Remove obvious cases
  if (line.dominantCount < 5) {
      return false;
  }

  // There has to be a better way but fuck it

  // Goes through every row of 5 cells to see if it is a 5-of-a-kind
  // If one can, return false
  // (What? ^^^)
  var n = line.length;

  // Go through each option
  for (var start = 0; start <= n - 5; start++) {
    var initial = undefined;
    var win = true;
    for (var i = start; i < start + 5; i++) {
      var mark = line[i].mark;
      if (!mark) {
        win = false;
        break;
      }

      if (initial && mark != initial) {
        win = false;
        break;
      }
      else if (!initial) {
        initial = mark;
      }

    }
    if (win) {
        return true;
    }
  }
  return false;
}

// AI function as order
function orderAI(board, chaos) {
    // The cell ID the turn is played on, and the mark to place (O vs X)
    var move = {
        cell: 0,
        mark: 0
    };

    initLines(board);

    // Go through all lines
    for (var lineId = 0; lineId < numLines; lineId++) {
        var line = lines[lineId];
        XOCount(line);

        if(isWin(line)) {
          console.log("LINE " + lineId + " IS A WIN");
          return undefined;
        }

        // If a line is DQ'd it means there's no point of doing anything with it
        if (disqualified(line)) {
            continue;
        }

        // If there's a move I can make to win, I do it k
        var win = winCheck(line);
        if (win) {
            if(chaos) {
              console.log("WIN BLOCK: " + JSON.stringify(win));
            } else {
              console.log("WIN: " + JSON.stringify(win));
            }
            return win;
        }

        // If there's an option to set up a trap, I do that
        var trap = trapCheck(line);
        if (trap) {
          if(chaos) {
            console.log("TRAP BLOCK: " + JSON.stringify(trap));
          } else {
            console.log("TRAP: " + JSON.stringify(trap));
          }
            return trap;
        }
    }

    var maxSolO = 0;
    var maxSolX = 0;
    var maxOCells = new Set();
    var maxXCells = new Set();

    for (var cellId = 0; cellId < width * height; cellId++) {
      var cell = board[cellId];
      if (cell.mark) {
        continue;
      }
      var solarityO = getSolarity(cell, 'o');
      var solarityX = getSolarity(cell, 'x');
      if (maxSolO <= solarityO) {
        if(maxSolO != solarityO) {
          maxOCells = new Set();
        }
        maxSolO = solarityO;
        maxOCells.add({cell:cell.id, mark:'o'});
      }
      if (maxSolX <= solarityX) {
        if(maxSolX != solarityX) {
          maxXCells = new Set();
        }
        maxSolX = solarityX;
        maxXCells.add({cell:cell.id, mark:'x'});
      }
    }

    var bestCells;

    if (maxSolO > maxSolX) {
      bestCells = Array.from(maxOCells);
    } else if (maxSolX > maxSolO) {
      bestCells = Array.from(maxXCells);
    } else {
      bestCells = Array.from(union(maxOCells, maxXCells));
    }

    for (let moveOpt of bestCells) {
      move = moveOpt;
      //console.log(JSON.stringify(moveOpt));
    }

    return move;
}

// Returns the "win string" if a player has won, empty string if not.
// The win string is basically "Order won!" or "Chaos won!".
function getWinString(board) {
  initLines(board);
  // Go through all lines
  // If there is an order win in any line, then order won (obviously)
  // If not, and the board is 100% full, then chaos won

  var chaosWon = true;

  for (var lineId = 0; lineId < numLines; lineId++) {
    var line = lines[lineId];
    XOCount(line);

    // If all lines are full, then chaos won (unless order already won)
    chaosWon = chaosWon && (line.emptyCount <= 0)

    if(isWin(line)) {
      chaosWon = false;
      return "Order won!";
    }
  }
  if (chaosWon) return "Chaos won!"; else return "";
}

function notMark(mark) {
  return mark == 'o' ? 'x' : 'o';
}

// AI function as chaos
function chaosAI(board) {
  // Currently, chaos AI is "get order AI and do the opposite mark"
  var chaosMove = orderAI(board, true);
  if (chaosMove && chaosMove.mark) {
    chaosMove.mark = notMark(chaosMove.mark);
  }
  return chaosMove;
}

// After messing with the chaos AI, I have seen it's basically "take order AI and place the other mark instead"
// So if that doesn't work out, I'll do another function
function badChaosAI(board) {
  // The cell ID the turn is played on, and the mark to place (O vs X)
  var move = {
      cell: 0,
      mark: 0
  };

  initLines(board);

  // Go through all lines
  for (var lineId = 0; lineId < numLines; lineId++) {
      var line = lines[lineId];
      XOCount(line);

      // If a line is DQ'd it means order can't win it so there's no point in putting something there
      if (disqualified(line)) {
          continue;
      }

      // If there's a move that blocks a win, I do it so I don't lose k
      var winblock = winCheck(line);
      if (winblock) {
          winblock.mark = notMark(winblock.mark);
          console.log("WIN BLOCK: " + JSON.stringify(winblock));
          return winblock;
      }

      // If there's an option to set up a trap, I block that so I don't lose more
      var trapblock = trapCheck(line);
      if (trapblock) {
          trapblock.mark = notMark(trapblock.mark);
          console.log("TRAP BLOCK: " + JSON.stringify(trapblock));
          return trapblock;
      }
  }

  var maxSolO = 0;
  var maxSolX = 0;
  var maxOCells = new Set();
  var maxXCells = new Set();

  for (var cellId = 0; cellId < width * height; cellId++) {
    var cell = board[cellId];
    if (cell.mark) {
      continue;
    }
    var solarityO = getSolarity(cell, 'o');
    var solarityX = getSolarity(cell, 'x');
    if (maxSolO <= solarityO) {
      if(maxSolO != solarityO) {
        maxOCells = new Set();
      }
      maxSolO = solarityO;
      maxOCells.add({cell:cell.id, mark:'o'});
    }
    if (maxSolX <= solarityX) {
      if(maxSolX != solarityX) {
        maxXCells = new Set();
      }
      maxSolX = solarityX;
      maxXCells.add({cell:cell.id, mark:'x'});
    }
  }

  var bestCells;

  if (maxSolO > maxSolX) {
    bestCells = Array.from(maxOCells);
  } else if (maxSolX > maxSolO) {
    bestCells = Array.from(maxXCells);
  } else {
    bestCells = Array.from(union(maxOCells, maxXCells));
  }

  for (let moveOpt of bestCells) {
    move = moveOpt;
    //console.log(JSON.stringify(moveOpt));
  }

  return move;
}
