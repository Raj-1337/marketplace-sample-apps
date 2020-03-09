let client = null;
let user_id = null;
let stage = false;
let t1 = null,
  t2 = null,
  t3 = null,
  t4 = null;
let endTime = null;
$(document).ready(function() {
  app.initialized().then(function(_client) {
    client = _client;
    client.events.on("app.activated", function() {
      console.log("checkTimer start");
      checkTimer();
      console.log("checkTimer end");
      /**
       * get the id of the user loged in using the data API
       */
      client.data.get("loggedInUser").then(
        function(data) {
          user_id = data.loggedInUser.user.id.toString();
        },
        function(err) {
          console.log(JSON.stringify(err));
        }
      );

      /**
       * a click event handler to start and stop pomodoro sessions
       */
      $("#ip").click(function() {
        if (!stage) {
          makeSMICall("serverMethod");
          startTimer();
          countdown();
          session();
          stopText();
          stage = true;
        } else {
          stopPromodoro(0);
          stopTimer();
          clearInterval(t5);
          stage = false;
        }
      });

      /** a click event handler to get user's past sessions data, process it and pass it to a modal to show output in chart form
       * refer mod.js for flow continuation
       */
      $("#sa").click(function() {
        let hs = [];
        let td = null;
        client.db.get(user_id).then(
          function(data) {
            console.log(data);
            td = data.totalDays;
            data.history.forEach((element, index) => {
              hs.push([
                index + 1,
                element.noOfSessions,
                element.noOfInterruptions
              ]);
            });
            client.interface.trigger("showModal", {
              title: "sample modal",
              template: "./mod.html",
              data: { totalDays: td, history: hs }
            });
          },
          function(err) {
            console.log(
              "Couldn't get data for ShowActivity!\nargs: " +
                JSON.stringify(err)
            );
          }
        );
      });

      /** a click event handler to clear all of the user's activity and schedules using clearActivity server.js method */
      $("#ca").click(function() {
        makeSMICall("clearActivity");
      });

      /** a click event handler to populate user data randomly using testData server.js method */
      $("#td").click(function() {
        makeSMICall("testData");
      });
      /** registering an event to save timer if the pages was unloaded during session */
      $(window).on("beforeunload", saveTimer);
    });
  });
});

/**
 * a helper function to triggers notifications
 * @param {string} notificationType - type of notification to be triggered
 * @param {string} notificationMessage - notification message to be displayed
 */
function notifyUser(notificationType, notificationMessage) {
  client.interface
    .trigger("showNotify", {
      type: notificationType,
      message: notificationMessage
    })
    .then(function(data) {
      console.log(
        "Notification for " + notificationMessage + " showed successfully!"
      );
      console.log(JSON.stringify(data));
    })
    .catch(function(err) {
      console.log(
        "Notification for " + notificationMessage + " couldn't be shown!"
      );
      console.log(JSON.stringify(err));
    });
}

/**
 * simple function to change UI
 */
function startText() {
  $("#apptext").text("Click me to start focus mode!!!");
  $("#ip").html("start");
}

/**
 * simple function to change UI
 */
function stopText() {
  $("#apptext").text("Click me to stop focus mode!!!");
  $("#ip").html("stop");
}

/**
 * Function to show user that his session has started using a helper function
 */
function session() {
  notifyUser("warning", "your 25 mins streak starts!");
  t2 = setTimeout(takeBreak, 1500000);
}

/**
 * a function to tell users that they should take thier 5 mins break using a helper function
 * It also triggers nextSessionCheck and session functions to notfy about thier progress using js setTimeout
 */
function takeBreak() {
  notifyUser("success", "take a 5 mins break!");
  t3 = setTimeout(nextSessionCheck, 290000);
}

/**
 * This function is executed before the break period's end time to ask if the user
 * wants to continue having pomodoro sessions or not
 * They can give thier response using the showConfirm interface triggered by this method
 */
function nextSessionCheck() {
  client.interface
    .trigger("showConfirm", {
      title: "Do you want to continue ?",
      message:
        "your break's about to be over, do you want to start a new pomodoro session ? "
    })
    .then(function(result) {
      console.log(JSON.stringify(result));
      if (result.message == "OK") {
        console.log("user is continuing with next session!");
        t1 = setTimeout(session, 10000);
      } else {
        console.log("user is stopping sessions!");
        stopPromodoro(1);
      }
    })
    .catch(function(err) {
      console.log("error with showConfirm: " + JSON.stringify(err));
    });
}

/**
 * This function invokes interruptSchedule server.js methods via a helper function
 * It also clears the setTimeout and setInterval events put forth by takeBreak and takebreak itself
 */
function stopPromodoro(flag) {
  if(flag == 1) {
    makeSMICall("deleteSchedule");
  }
  else{
    makeSMICall("interruptSchedule");
  }
  clearTimeout(t1);
  clearTimeout(t3);
  clearTimeout(t2);
  startText();
}

/**
 * This is a helper function which calls server.js methods using client.request.invoke API (SMI)
 * Data for a particular user has been atached to his ID in the database, hence the need for pasing user_id via SMI
 * @param {string} - methodName name of the server.js method you wish to call
 */
function makeSMICall(methodName) {
  client.request.invoke(methodName, { id: user_id }).then(
    function(data) {
      console.log("server method request id: " + data.requestID);
      console.log("response: " + data.response.reply);
    },
    function(err) {
      console.log(JSON.stringify(err));
    }
  );
}

/** a function to save data of running counter using localstorage */
function saveTimer() {
  console.log("saveTimer invoked! stage: " + stage + " " + endTime);
  if (stage) {
    console.log("saving item" + stage + " " + endTime);
    localStorage.setItem(
      "timerStorage",
      JSON.stringify({ state: stage, end: endTime })
    );
  }
}

/** a function to set the session's end time and start countdown */
function startTimer() {
  endTime = new Date();
  endTime.setMinutes(endTime.getMinutes() + 1);
  t4 = setInterval(countdown, 999);
}

/** function to update the counter */
function countdown() {
  let current = endTime - new Date();
  let minutes = Math.floor((current % (1000 * 60 * 60)) / (1000 * 60));
  let seconds = Math.floor((current % (1000 * 60)) / 1000);
  $("#timer").text(`${minutes} min  :  ${seconds} sec`);
}

/** function to check if there is a running session, if so change the global variables which affetcs the UI and starts the timer */
function checkTimer() {
  console.log("inside");
  if (localStorage.getItem("timerStorage") !== null) {
    let temp = localStorage.getItem("timerStorage");
    temp = JSON.parse(temp);
    endTime = new Date(temp.end);
    stage = temp.state;
    stopText();
    countdown();
    t4 = setInterval(countdown, 998);
  } else {
    console.log("no timerStorage");
  }
}

/** function to remove countdown and endTime */
function stopTimer() {
  endTime = null;
  $("#timer").empty();
  clearInterval(t4);
  localStorage.removeItem("timerStorage");
}
