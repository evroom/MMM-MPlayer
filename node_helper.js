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
  launchMPlayer: function(stream, window) {
    const monitorAspect = this.config.monitorAspect || 0;
    const rotate = this.config.rotate || -1; 
    const size = this.config.windows[window].windowSize || this.config.windowSize;
    const position = this.config.windows[window].windowPosition || this.config.windowPosition;
    const mplayerOptions = this.config.mplayerOptions || '';

    // Spawn a new mplayer process
    const env = { ...process.env, DISPLAY: ':0' };
    //const mplayerProcess = spawn(`mplayer`, [`${mplayerOptions}`, '-noborder', '-monitoraspect', `${monitorAspect}`, '-vf', `rotate=${rotate}`, '-geometry', `${position.x}:${position.y}`, `-xy`, `${size.width}`, `${size.height}`, `${stream}`], {env: env});
    const mplayerProcess = spawn(`mplayer`, `${stream}`, {env: env}, [`${mplayerOptions}`, '-noborder', '-monitoraspect', `${monitorAspect}`, '-vf', `rotate=${rotate}`, '-geometry', `${position.x}:${position.y}`, `-xy`, `${size.width}`, `${size.height}`]);

    Log.info(`[MMM-MPlayer] Launched mplayer process for window ${window} with PID ${mplayerProcess.pid}`);
    Log.info(`[MMM-MPlayer] mplayer ${mplayerOptions} -noborder -monitoraspect ${monitorAspect} -vf rotate=${rotate} -geometry ${position.x}:${position.y} -xy ${size.width} ${size.height} ${stream}`);

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

  // Adjust stream positions and size based on layout
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
