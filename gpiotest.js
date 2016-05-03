var exec = require('exec');
var dgram = require('dgram');
var os = require('os');

var before = true;
var networkinterfaces = [];

exec('raspi-gpio set 26 pu', function(a, b, c) {
  setInterval(function() {
    exec('raspi-gpio get 26', function(error, stdout, stderr) {
      console.log(stdout);
      if (stdout.search('level=1') > -1) {
        leds(false);
      } else {
        leds(true);
      }
    });

  }, 500);
});


function leds(on) {
  console.log("-->" + on)
  if (before == on) {
    return;
  }
  before = on;
  var dgramClient = dgram.createSocket('udp6');
  var buf = new Buffer(630);
  for (var i = 0; i < buf.length; i++) {
    if (!on) {
      buf[i] = 180;
    } else {
      buf[i] = 0;
    }
  }
  console.log(buf);

  sendLightCommand(dgramClient, buf, 0);
  sendUdpMulticast(on);
}

function sendLightCommand(dgramClient, buf, counter) {
  if (counter > 3) {
    dgramClient.close();
    return;
  }
  dgramClient.send(buf, 0, buf.length, 2812, '2a01:170:1112:0:bad8:12ff:fe66:fa1', function(err, bytes) {
    if (err) {
      throw err;
    }
    // Reuse the message buffer,
    // or close client
    sendLightCommand(dgramClient, buf, counter + 1);
  });
}

function sendUdpMulticast(on) {
  var interfaces = os.networkInterfaces();
  networkinterfaces = [];
  Object.keys(interfaces).forEach(function(ifname) {
    console.log(ifname);
    networkinterfaces.push(ifname);
  });
  buzz(on, 0);
}

function buzz(on, i) {
  console.log("INTERAFACES:" + networkinterfaces.length);
  var message = createMessage(on);
  if (i < networkinterfaces.length) {
    sendMessage(message, networkinterfaces[i], function() {
      buzz(on, i + 1);
    });
  } else {

  }
}

function sendMessage(message, networkinterface, callback) {
  console.log(networkinterface);
  var dgramServer = dgram.createSocket('udp6');
  var destination = 'FF02::6006%' + networkinterface;
  console.log(destination);
  dgramServer.send(message, 0, message.length, 6006, destination, function(err, bytes) {
    if (err) {
      console.log("err when sending send UDP Message");
    }
    callback();
          dgramServer.close();
    console.log("server close");
  });
}

function createMessage(on) {
  var date = new Date();
  var dateString = date.getTime();
  var event = {
    eventtime: dateString,
    open: !on
  };
  var message = new Buffer(JSON.stringify(event));
  //var message = new Buffer("door");
  console.log(message);
  return message;
}
