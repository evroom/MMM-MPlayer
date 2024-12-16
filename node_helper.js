const NodeHelper = require('node_helper');
const { spawn } = require('child_process');
const { os } = require('os');
const Log = require('logger');  // Import the Log module from MagicMirror

module.exports = NodeHelper.create({
  start: function() {
    Log.log('Starting MMM-MPlayer module...');
    this.streams = {};
    this.currentStreamIndex = { window1: -1, window2: -1 };
    this.mplayerProcesses = { window1: null, window2: null }; // Track mplayer processes for each window
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
    Log.debug(`[MMM-MPlayer] streams window1: ${this.config.streams['window1']}`);
    if (this.config.streams['window1'] === undefined) {
      Log.debug('[MMM-MPlayer] streams window1 is undefined - no stream to start');
    } else {
      this.switchStream('window1');
    }
    Log.debug(`[MMM-MPlayer] streams window2: ${this.config.streams['window2']}`);
    if (this.config.streams['window2'] === undefined) {
      Log.debug('[MMM-MPlayer] streams window2 is undefined - no stream to start');
    } else {
      this.switchStream('window2');
    }
    if (this.streamSwitcher == null) {
      this.streamSwitcher = setInterval(() => {
        if (this.config.streams['window1'] === undefined) {
          Log.debug('[MMM-MPlayer] streams window1 is undefined - no stream to cycle');
        } else {
          this.switchStream('window1');
        }
        if (this.config.streams['window2'] === undefined) {
          Log.debug('[MMM-MPlayer] streams window2 is undefined - no stream to cycle');
        } else {
          this.switchStream('window2');
        }
      }, this.config.streamInterval);  // Cycle based on the config
      this.sendSocketNotification('STREAM_CYCLE_STARTED');
    }
  },

  stopStreams: function() {
    Log.debug('[MMM-MPlayer] stopStreams - killMPlayer');
    if (this.streamSwitcher != null) {
      clearInterval(this.streamSwitcher);
      if (this.config.streams['window1'] === undefined) {
        Log.debug('[MMM-MPlayer] streams window1 is undefined - no stream to cycle');
      } else {
        this.killMPlayer('window1');
      }
      if (this.config.streams['window2'] === undefined) {
        Log.debug('[MMM-MPlayer] streams window2 is undefined - no stream to cycle');
      } else {
        this.killMPlayer('window2');
      }
      this.streamSwitcher = null;
      this.currentStreamIndex = { window1: -1, window2: -1 };
    }
  },

  // Switch the stream for the given window
  switchStream: function(window) {
    Log.debug('[MMM-MPlayer] switchStream - killMPlayer + launchMPlayer');
    Log.debug(`[MMM-MPlayer] Switching stream for ${window}`);
    const windowStreams = this.config.streams[window];
    Log.debug(`[MMM-MPlayer] windowStreams: ${windowStreams}`);
    const currentIndex = this.currentStreamIndex[window];
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
      Log.debug(`[MMM-MPlayer] Killing mplayer process for ${window} PID ${mplayerProcess.pid}`);
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
    const size = this.config.windowSize;
    const position = this.config[`${window}Position`] || this.config.windowPosition;

    // Spawn a new mplayer process
    const env = { ...process.env, DISPLAY: ':0' };
    const mplayerProcess = spawn(`mplayer`, ['-noborder', '-monitoraspect', `${monitorAspect}`, '-vf', `rotate=${rotate}`, '-geometry', `${position.x}:${position.y}`, `-xy`, `${size.width}`, `${size.height}`, `${stream}`], {env: env});

    Log.info(`[MMM-MPlayer] Launched mplayer process for ${window} with PID ${mplayerProcess.pid}`);
    Log.info(`[MMM-MPlayer] mplayer -noborder -monitoraspect ${monitorAspect} -vf rotate=${rotate} -geometry ${position.x}:${position.y} -xy ${size.width} ${size.height} ${stream}`);

    // Track the process for future termination
    this.mplayerProcesses[window] = mplayerProcess;

    // Handle standard output and error
    mplayerProcess.stdout.on('data', (data) => {
      Log.debug(`mplayer [${window}] stdout: ${data}`);
    });

    mplayerProcess.stderr.on('data', (data) => {
      //Log.error(`mplayer [${window}] stderr: ${data}`);
    });

    mplayerProcess.on('close', (code) => {
      Log.info(`[MMM-MPlayer] mplayer process for ${window} exited with code ${code}`);
    });
  },

  // Adjust stream positions and size based on layout
  adjustLayout: function() {
    const windowPosition = this.config.windowPosition; // General window position for window1
    const windowSize = this.config.windowSize;
    const layout = this.config.layout;

    // Calculate position for second window automatically based on layout
    if (layout === 'column') {
      // If layout is column, position window 2 below window 1
      this.config.window2Position = {
        x: windowPosition.x,  // Same x position
        y: windowPosition.y + windowSize.height + 5 // y position of window2 is below window1
      };
    } else if (layout === 'row') {
      // If layout is row, position window 2 to the right of window 1
      this.config.window2Position = {
        x: windowPosition.x + windowSize.width + 5, // x position of window2 is to the right of window1
        y: windowPosition.y  // Same y position
      };
    }
    Log.debug(`[MMM-MPlayer] adjustLayout - layout: ${layout} window1Position: ${this.config.windowPosition.x}:${this.config.windowPosition.y}`);
    Log.debug(`[MMM-MPlayer] adjustLayout - layout: ${layout} window2Position: ${this.config.window2Position.x}:${this.config.window2Position.y}`);
  }
});
