const NodeHelper = require('node_helper');
const { spawn } = require('child_process');
const { os } = require('os');
const Log = require('logger');  // Import the Log module from MagicMirror

module.exports = NodeHelper.create({
  start: function() {
    Log.log('Starting MMM-MPlayer module...');
    this.streams = {};
    this.currentStreamIndex = {};
    this.mplayerProcesses = {};
    this.streamInterval = 30000;
    this.streamSwitcher = null;
  },

  // Handle socket notifications from the frontend
  socketNotificationReceived: function(notification, payload) {
    switch(notification) {
      case 'SET_CONFIG':
        Log.debug('[MMM-MPlayer] Received configuration for MMM-MPlayer module');

        // Save the configuration
        this.config = payload;

        const payloadJson = JSON.stringify(payload);
        Log.debug(`[MMM-MPlayer] ${payloadJson}`);
        
        // Adjust layout and start the stream cycle
        this.adjustLayout();
        break;
      case 'START_STREAM_CYCLE':
        Log.debug('[MMM-MPlayer] Stream cycle process started.');
        // Start the stream cycle after receiving the notification
        this.cycleStreams();
        break;
      case 'STOP_STREAM_CYCLE':
        Log.debug('[MMM-MPlayer] Stream cycle process stopped.');
        // Stop the stream cycle after receiving the notification
        this.stopStreams();
    }
  },

  // Start or refresh the streams
  cycleStreams: function() {
    Log.debug('[MMM-MPlayer] cycleStreams - STREAM_CYCLE_STARTED');
    // Fire up the streams immediately
    for (let i=0; i < this.config.windows.length; i++) {
      if (this.config.windows[i].streams === undefined) {
        Log.debug(`[MMM-MPlayer] streams window-${i} is undefined - no stream to start`);
      } else {
        Log.debug(`[MMM-MPlayer] streams window-${i}: ${this.config.windows[i].streams}`);
        this.switchStream(i);
      }
    }
    
    if (this.streamSwitcher == null) {
      this.streamSwitcher = setInterval(() => {
        for (let i=0; i < this.config.windows.length; i++) {
          if (this.config.windows[i].streams === undefined) {
            Log.debug(`[MMM-MPlayer] streams window-${i} is undefined - no stream to start`);
          } else {
            Log.debug(`[MMM-MPlayer] streams window-${i}: ${this.config.windows[i].streams}`);
            this.switchStream(i);
          }
        }
      }, this.config.streamInterval);  // Cycle based on the config
      this.sendSocketNotification('STREAM_CYCLE_STARTED');
    }
  },

  stopStreams: function() {
    Log.debug('[MMM-MPlayer] stopStreams - killMPlayer');
    if (this.streamSwitcher != null) {
      clearInterval(this.streamSwitcher);
      for (let i=0; i < this.config.windows.length; i++) {
        if (this.config.windows[i].streams === undefined) {
          Log.debug('[MMM-MPlayer] streams window-${i} is undefined - no stream to cycle');
        } else {
          this.killMPlayer(i);
        }
        this.currentStreamIndex[i] = -1;
      }
      this.streamSwitcher = null;
    }
  },

  // Switch the stream for the given window
  switchStream: function(window) {
    Log.debug(`[MMM-MPlayer] currentStreamIndex - ${JSON.stringify(this.currentStreamIndex)}`);
    Log.debug(`[MMM-MPlayer] mplayerProcesses - ${JSON.stringify(this.mplayerProcesses)}`);

    Log.debug('[MMM-MPlayer] switchStream - killMPlayer + launchMPlayer');
    Log.debug(`[MMM-MPlayer] Switching stream for window-${window}`);
    const windowStreams = this.config.windows[window].streams;
    Log.debug(`[MMM-MPlayer] windowStreams: ${windowStreams}`);
    const currentIndex = this.currentStreamIndex[window] === undefined ? -1 : this.currentStreamIndex[window];
    Log.debug(`[MMM-MPlayer] currentIndex: ${currentIndex}`);
    const nextIndex = (currentIndex + 1) % windowStreams.length;
    Log.debug(`[MMM-MPlayer] nextIndex: ${nextIndex}`);

    // Update stream index
    this.currentStreamIndex[window] = nextIndex;

    if (currentIndex != nextIndex) {
        // Kill the old mplayer process for the window using SIGTERM
        this.killMPlayer(window);

        // Launch new mplayer process for the window
        this.launchMPlayer(windowStreams[nextIndex], window);
    }
  },

  // Kill any existing mplayer process for a window using SIGTERM
  killMPlayer: function(window) {
    Log.debug('[MMM-MPlayer] killMPlayer');
    const mplayerProcess = this.mplayerProcesses[window];
    if (mplayerProcess) {
      Log.debug(`[MMM-MPlayer] Killing mplayer process for window-${window} PID ${mplayerProcess.pid}`);
      const killer = spawn(`kill`, [`${mplayerProcess.pid}`]);
      // Handle standard output and error
      killer.stdout.on('data', (data) => {
        Log.debug(`killer [${window}] stdout: ${data}`);
      });

      killer.stderr.on('data', (data) => {
        Log.error(`killer [${window}] stderr: ${data}`);
      });

      killer.on('close', (code) => {
        Log.debug(`[MMM-MPlayer] killer process for ${window} exited with code ${code}`);
      });
    }
  },

  // Launch a new mplayer process for the window using spawn
  // monitorAspect: 0, // -monitoraspect <ratio>
  // noAspect: false, // -noaspect - Disable automatic movie aspect ratio compensation.
  // noBorder: false, // -border - Play movie with window border and decorations. Since this is on by default, use -noborder to disable this.
  // rotate: -1, // -vf rotate[=<0-7>]
  // windowPosition: { x: 5, y: 225 }, // -geometry x[%][:y[%]] - Adjust where the output is on the screen initially.
  // windowSize: { width: 640, height: 360 }, // -x <x> and // -y <y> - Scale image to width <x> and height <y> - Disables aspect calculations.
  // windowWidthNoNewAspect: 640, // -x <x> - Scale image to width <x> - Disables aspect calculations.
  // windowHeightNoNewAspect: 360, // -y <y> - Scale image to height <y> - Disables aspect calculations.
  // windowWidth: 640, // -xy <value> - Set width to value and calculate height to keep correct aspect ratio.
  // rtspStreamOverTcp: false, // -rtsp-stream-over-tcp - Used with 'rtsp://' URLs to specify that the resulting incoming RTP and RTCP packets be streamed over TCP.
  // rtspStreamOverHttp: false, // -rtsp-stream-over-http - Used with 'http://' URLs to specify that the resulting incoming RTP and RTCP packets be streamed over HTTP.
  // preferIpv4: false, // -prefer-ipv4 - Use IPv4 on network connections. Falls back on IPv6 automatically.
  // ipv4onlyProxy: false, // -ipv4-only-proxy - Skip the proxy for IPv6 addresses. It will still be used for IPv4 connections.
  // videoOutputDriver: "xv,gl,gl_nosw,vdpau,", // -vo <driver1[,driver2,...[,]> - Specify a priority list of video output drivers to be used.
  // mplayerOption1: '',
  // mplayerOption2: '',
  // mplayerOption3: '',

  launchMPlayer: function(stream, window) {
    const monitorAspect = this.config.windows[window].monitorAspect || this.config.monitorAspect || 0;
    const noAspect = this.config.windows[window].noAspect || this.config.noAspect;
    const noBorder= this.config.windows[window].noBorder || this.config.noBorder;
    const rotate = this.config.windows[window].rotate || this.config.rotate;
    const windowPosition = this.config.windows[window].windowPosition || this.config.windowPosition;
    const windowSize = this.config.windows[window].windowSize || this.config.windowSize;
    const windowWidthNoNewAspect = this.config.windows[window].windowWidthNoNewAspect || this.config.windowWidthNoNewAspect;
    const windowHeightNoNewAspect = this.config.windows[window].windowHeightNoNewAspect || this.config.windowHeightNoNewAspect;
    const windowWidth = this.config.windows[window].windowWidth || this.config.windowWidth;
    const rtspStreamOverTcp = this.config.windows[window].rtspStreamOverTcp || this.config.rtspStreamOverTcp;
    const rtspStreamOverHttp = this.config.windows[window].rtspStreamOverHttp || this.config.rtspStreamOverHttp;
    const preferIpv4 = this.config.windows[window].preferIpv4 || this.config.preferIpv4;
    const ipv4onlyProxy = this.config.windows[window].ipv4onlyProxy || this.config.ipv4onlyProxy;
    const videoOutputDriver = this.config.windows[window].videoOutputDriver || this.config.videoOutputDriver;
    const noSound = this.config.windows[window].noSound || this.config.noSound;
    const mplayerOption1 = this.config.windows[window].mplayerOption1 || this.config.mplayerOption1 || '';
    const mplayerOption2 = this.config.windows[window].mplayerOption2 || this.config.mplayerOption2 || '';
    const mplayerOption3 = this.config.windows[window].mplayerOption3 || this.config.mplayerOption3 || '';

    // Spawn a new mplayer process
    const env = { ...process.env, DISPLAY: ':0' };
    const mplayerProcess = spawn(`mplayer`,
       [`${mplayerOption1}`,
        `${mplayerOption2}`,
        `${mplayerOption3}`,
        '-monitoraspect', `${monitorAspect}`,
        `${noAspect}`,
        `${noBorder}`,
        '-vf', `rotate=${rotate}`,
        '-geometry', `${windowPosition.x}:${windowPosition.y}`,
        `-xy`, `${windowSize.width}`, `${windowSize.height}`,
        `${windowWidthNoNewAspect}`,
        `${windowHeightNoNewAspect}`,
        `${windowWidth}`,
        `${rtspStreamOverTcp}`,
        `${rtspStreamOverHttp}`,
        `${preferIpv4}`,
        `${ipv4onlyProxy}`,
        `${videoOutputDriver}`,
        `${noSound}`,
        `${stream}`],
        {env: env});

    Log.info(`[MMM-MPlayer] Launched mplayer process for window ${window} with PID ${mplayerProcess.pid}`);
    Log.info(`[MMM-MPlayer] mplayer ${mplayerOption1} ${mplayerOption2} ${mplayerOption3} -noborder -monitoraspect ${monitorAspect} -vf rotate=${rotate} -geometry ${windowPosition.x}:${windowPosition.y} -xy ${windowSize.width} ${windowSize.height} ${stream}`);

    // Track the process for future termination
    this.mplayerProcesses[window] = mplayerProcess;

    // Handle standard output and error
    mplayerProcess.stdout.on('data', (data) => {
      Log.debug(`mplayer [window-${window}] stdout: ${data}`);
    });

    mplayerProcess.stderr.on('data', (data) => {
      //Log.error(`mplayer [${window}] stderr: ${data}`);
    });

    mplayerProcess.on('close', (code) => {
      Log.info(`[MMM-MPlayer] mplayer process for window-${window} exited with code ${code}`);
    });
  },

  // Adjust stream positions and windowSize based on layout
  adjustLayout: function() {
    Log.debug(`[MMM-MPlayer] adjustLayout`);
    const windowPosition = this.config.windowPosition; // General window position
    const windowSize = this.config.windowSize;
    const layout = this.config.layout;

    if(((layout === 'column') || (layout === 'row'))) {
      // Calculate position for each window automatically based on the prior window
      for (let i=0; i < this.config.windows.length; i++) {
        if( i ==0 ) {
          this.config.windows[i].windowPosition = this.config.windowPosition;
        }
        else if (layout === 'column') {          
          this.config.windows[i].windowPosition = {
            x: this.config.windows[i-1].windowPosition.x,  // Same x position
            y: this.config.windows[i-1].windowPosition.y + windowSize.height + 5 // y position of previous window plus height and buffer
          };
        }
        else  if (layout === 'row') {
          this.config.windows[i].windowPosition = {
            x: this.config.windows[i-1].windowPosition.x + windowSize.width + 5, // x position of previous window plus width and buffer
            y: this.config.windows[i-1].windowPosition.y  // Same y position
          };
        }
        Log.debug(`[MMM-MPlayer] adjustLayout - layout: ${layout}, window-${i}: ${this.config.windows[i].windowPosition.x}:${this.config.windows[i].windowPosition.y}`);
      }
    }
    else {
      Log.log(`[MMM-MPlayer] layout is not column or row so expecting windowSize and windowPosition in each window config object to be set already with no adjustments`);
      for (let i=0; i < this.config.windows.length; i++) {
        Log.debug(`[MMM-MPlayer] adjustLayout - layout: ${layout}, window-${i}: ${this.config.windows[i].windowPosition.x}:${this.config.windows[i].windowPosition.y}`);
      }
    }
  }
});
