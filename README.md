# What is this
This is a script running on the raspberry-pi on the icebox in the nbsp.

#Explanations

(the code might not be up to date, but the principles still apply)

First it takes some data out of the GPIO pin of the raspberry-pi every half second. Depending on the incoming data it sends out data to turn on some LEDs.

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

The leds() function creates a buffer with the values for the LEDs. values could be up to 255, but that seems to much. 0 is off.

    function leds(on) {
      console.log("-->" + on)
      //do not do stuff, if the state has not changed.
      if (before == on) {
        return;
      }
      //state has changed, set before to the new state
      before = on;

      /actually do stuff to send things to the leds
      var dgramClient = dgram.createSocket('udp6');
      var buf = new Buffer(630);
      for (var i = 0; i < buf.length; i++) {
        if (!on) {
          //white. not all that strong.
          buf[i] = 180;
        } else {
          //off
          buf[i] = 0;
        }
      }
      console.log(buf);

      //send the buffer to the leds
      sendLightCommand(dgramClient, buf, 0);

      //also send a udp multicast, so that other devices can not when the door is opened.
      sendUdpMulticast(on);
    }

Since it's udp and sometimes packages get lost, we send it three times

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

Sending multicast udp is done like this:

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
