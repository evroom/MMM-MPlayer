/* MagicMirror Module: MMM-MPlayer.js
 * This script communicates with the backend (node_helper.js) to control mplayer window streaming
 * It starts the stream cycle process only after the DOM is fully loaded.
 */

Module.register('MMM-MPlayer', {
    // Define the module's defaults
    defaults: {
      useTwoWindows: true,
      layout: '',
      monitorAspect: 0,
      rotate: -1,
      mplayerOptions: '',
      streamInterval:30000,
      windows:[
        {
          windowSize: { width: 640, height: 480 },
          windowPosition: { x: 5, y: 225 },
          streams: [
            'http://stream1.example.com/video1',
            'http://stream2.example.com/video1'
          ]
        },
        {
          windowSize: { width: 640, height: 480 },
          windowPosition: { x: 5, y: 225 },
          streams: [
            'http://stream1.example.com/video2',
            'http://stream2.example.com/video2'
          ]
        },
        {
          windowSize: { width: 640, height: 480 },
          windowPosition: { x: 5, y: 225 },
          streams: [
            'http://stream1.example.com/video3',
            'http://stream2.example.com/video3'
          ]
        }
      ],
    },
  
    // Start the module
    start: function() {
      Log.log('MMM-MPlayer module starting...');
      
      // Send the configuration to the backend
      this.sendSocketNotification('SET_CONFIG', this.config);
    },
  
    // Define socket notification handlers
    socketNotificationReceived: function(notification, payload) {
      switch(notification)
      {
        case 'STREAM_CYCLE_STARTED':
          Log.log('Stream cycle process started.');
          break;
      }
    },
  
    // This function listens to the DOM_CREATED event and starts the stream cycle process
    notificationReceived: function(notification, payload, sender) {
      switch(notification) {
        case 'DOM_OBJECTS_CREATED':
          Log.log('DOM created. Starting the stream cycle process...');
          
          // Send the notification to the backend to initiate the stream cycle
          this.sendSocketNotification('START_STREAM_CYCLE');
          break;
        case 'MMM_PIR-SCREEN_POWERSTATUS':
          Log.log(`Received PIR Screen Show Notification ${payload}`);
          if (payload == true) {
            this.sendSocketNotification('START_STREAM_CYCLE');
          }
          else {
            this.sendSocketNotification('STOP_STREAM_CYCLE');
          }
          break;
        case 'NEW_PAGE':
          Log.log(`Received MMM-pages NEW_PAGE ${payload}`);
          this.curPage = payload;
          if (payload == 0) {
            this.sendSocketNotification('START_STREAM_CYCLE');
          }
          else {
            this.sendSocketNotification('STOP_STREAM_CYCLE');
          }
          break;
        case 'PAGE_CHANGED':
          Log.log(`Received MMM-pages PAGE_CHANGED ${payload}`);
          this.curPage = payload;
          if (payload == 0) {
            this.sendSocketNotification('START_STREAM_CYCLE');
          }
          else {
            this.sendSocketNotification('STOP_STREAM_CYCLE');
          }
          break;
        case 'SHOW_HIDDEN_PAGE':
          Log.log(`Received MMM-pages ${notification}`);
            this.sendSocketNotification('STOP_STREAM_CYCLE');
            this.sendSocketNotification('START_STREAM_CYCLE');
          break;        
        case 'LEAVE_HIDDEN_PAGE':
          Log.log(`Received MMM-pages ${notification}`);
          this.sendSocketNotification('STOP_STREAM_CYCLE');
          break;           
        case 'MAX_PAGES_CHANGED':
          Log.log(`Received MMM-pages PAGE_NUMBER_IS ${payload}`);
          this.maxPages = payload;
          break;
      }
    },

    getDom: function() {
        var wrapper = document.createElement("div");
        wrapper.innerHTML = '';
        return wrapper;
    }
  });
