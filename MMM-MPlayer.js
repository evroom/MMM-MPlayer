/* MagicMirror Module: MMM-MPlayer.js
 * This script communicates with the backend (node_helper.js) to control mplayer window streaming
 * It starts the stream cycle process only after the DOM is fully loaded.
 */

Module.register('MMM-MPlayer', {
    // Define the module's defaults
    defaults: {
      useTwoWindows: true,
      layout: 'column',
      monitorAspect: 0,
      rotate: -1,
      windowSize: { width: 640, height: 480 },
      windowPosition: { x: 5, y: 225 }, 
      streamInterval:30000,
      streams: {
        window1: [
          'http://stream1.example.com/video1',
          'http://stream2.example.com/video1'
        ],
        window2: [
          'http://stream1.example.com/video2',
          'http://stream2.example.com/video2'
        ]
      }
    },
  
    // Start the module
    start: function() {
      console.log('MMM-MPlayer module starting...');
      
      // Send the configuration to the backend
      this.sendSocketNotification('SET_CONFIG', this.config);
    },
  
    // Define socket notification handlers
    socketNotificationReceived: function(notification, payload) {
      switch(notification)
      {
        case 'STREAM_CYCLE_STARTED':
          console.log('Stream cycle process started.');
          break;
      }
    },
  
    // This function listens to the DOM_CREATED event and starts the stream cycle process
    notificationReceived: function(notification, payload, sender) {
      switch(notification) {
        case 'DOM_OBJECTS_CREATED':
          console.log('DOM created. Starting the stream cycle process...');
          
          // Send the notification to the backend to initiate the stream cycle
          this.sendSocketNotification('START_STREAM_CYCLE');
          break;
        case 'MMM_PIR-SCREEN_POWERSTATUS':
          console.log(`Received PIR Screen Show Notification ${payload}`);
          if (payload == true) {
            this.sendSocketNotification('START_STREAM_CYCLE');
          }
          else {
            this.sendSocketNotification('STOP_STREAM_CYCLE');
          }
          break;
      }
    },

    getDom: function() {
        var wrapper = document.createElement("div");
        wrapper.innerHTML = '';
        return wrapper;
    }
  });
