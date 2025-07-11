/* MagicMirror Module: MMM-MPlayer.js
 * Version: 2.0.1 dev
 * This script communicates with the backend (node_helper.js) to control mplayer window streaming
 * It starts the stream cycle process only after the DOM is fully loaded.
 */

Module.register('MMM-MPlayer', {
    // Define the module's defaults
    defaults: {
      streamInterval: 30000, // Cycle interval (in milliseconds),
      layout: '', // '', 'row', 'column'
      monitorAspect: 0, // -monitoraspect <ratio>
      noAspect: false, // -noaspect - Disable automatic movie aspect ratio compensation.
      noBorder: true, // -border - Play movie with window border and decorations. Since this is on by default, use -noborder to disable this.
      rotate: -1, // -vf rotate[=<0-7>]
      windowPosition: { x: 5, y: 225 }, // -geometry x[%][:y[%]] - Adjust where the output is on the screen initially.
      windowSize: { width: 640, height: 360 }, // -x <x> and // -y <y> - Scale image to width <x> and height <y> - Disables aspect calculations.
      windowWidth: 640, // -xy <value> - Set width to value and calculate height to keep correct aspect ratio.
      windowWidthNoNewAspect: 640, // -x <x> - Scale image to width <x> - Disables aspect calculations.
      windowHeightNoNewAspect: 360, // -y <y> - Scale image to height <y> - Disables aspect calculations.
      rtspStreamOverTcp: false, // -rtsp-stream-over-tcp - Used with 'rtsp://' URLs to specify that the resulting incoming RTP and RTCP packets be streamed over TCP.
      rtspStreamOverHttp: false, // -rtsp-stream-over-http - Used with 'http://' URLs to specify that the resulting incoming RTP and RTCP packets be streamed over HTTP.
      preferIpv4: false, // -prefer-ipv4 - Use IPv4 on network connections. Falls back on IPv6 automatically.
      ipv4onlyProxy: false, // -ipv4-only-proxy - Skip the proxy for IPv6 addresses. It will still be used for IPv4 connections.
      videoOutputDriver: "xv,gl,gl_nosw,vdpau,", // -vo <driver1[,driver2,...[,]> - Specify a priority list of video output drivers to be used.
      noSound: false, // -nosound - Do not play/encode sound.
      mplayerOption: '', // user defined mplayer option.
      windows:[
        {
          rotate: -1, // -vf rotate[=<0-7>]
          noAspect: false, // -noaspect - Disable automatic movie aspect ratio compensation.
          noBorder: true, // -border - Play movie with window border and decorations. Since this is on by default, use -noborder to disable this.    
          windowPosition: { x: 5, y: 225 }, // -geometry x[%][:y[%]] - Adjust where the output is on the screen initially.
          windowSize: { width: 640, height: 360 }, // -x <x> and // -y <y> - Scale image to width <x> and height <y> - Disables aspect calculations.
          windowWidth: 640, // -xy <value> - Set width to value and calculate height to keep correct aspect ratio.
          windowWidthNoNewAspect: 640, // -x <x> - Scale image to width <x> - Disables aspect calculations.
          windowHeightNoNewAspect: 360, // -y <y> - Scale image to height <y> - Disables aspect calculations.
          rtspStreamOverTcp: false, // -rtsp-stream-over-tcp - Used with 'rtsp://' URLs to specify that the resulting incoming RTP and RTCP packets be streamed over TCP.
          rtspStreamOverHttp: false, // -rtsp-stream-over-http - Used with 'http://' URLs to specify that the resulting incoming RTP and RTCP packets be streamed over HTTP.
          preferIpv4: false, // -prefer-ipv4 - Use IPv4 on network connections. Falls back on IPv6 automatically.
          ipv4onlyProxy: false, // -ipv4-only-proxy - Skip the proxy for IPv6 addresses. It will still be used for IPv4 connections.
          videoOutputDriver: "xv,gl,gl_nosw,vdpau,", // -vo <driver1[,driver2,...[,]> - Specify a priority list of video output drivers to be used.
          noSound: false, // -nosound - Do not play/encode sound.
          mplayerOption: '', // user defined mplayer option.
          streams: [
	          'rtsp://foo',
	          'rtsp://bar'
          ]
        }
      ]
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
