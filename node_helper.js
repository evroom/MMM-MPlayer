const NodeHelper = require('node_helper');
const { spawn } = require('child_process');
const { os } = require('os');
const Log = require('logger');  // Import the Log module from MagicMirror

module.exports = NodeHelper.create({
  start: function() {
    Log.info('Starting MMM-MPlayer module...');
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
        Log.info('Received configuration for MMM-MPlayer module');

        // Save the configuration
        this.config = payload;

        // Adjust layout and start the stream cycle
        this.adjustLayout();
        break;
      case 'START_STREAM_CYCLE':
        Log.info('Stream cycle process started.');
        this.cycleStreams(); // Start the stream cycle after receiving the notification
        break;
      case 'STOP_STREAM_CYCLE':
        Log.info('Stream cycle process stopped.');
        this.stopStreams();
    }
  },

  // Start or refresh the streams
  cycleStreams: function() {
    //fire up the streams immediately
    this.switchStream('window1');
    this.switchStream('window2');
    if (this.streamSwitcher == null) {
      this.streamSwitcher = setInterval(() => {
        this.switchStream('window1');
        this.switchStream('window2');
      }, this.config.streamInterval);  // cycle based on the config

      this.sendSocketNotification('STREAM_CYCLE_STARTED');
    }
  },

  stopStreams: function() {
    if (this.streamSwitcher != null) {
      clearInterval(this.streamSwitcher);
      this.killMPlayer('window1');
      this.killMPlayer('window2');
      this.streamSwitcher = null;
      this.currentStreamIndex = { window1: -1, window2: -1 };
    }
  },

  // Switch the stream for the given window
  switchStream: function(window) {
    const windowStreams = this.config.streams[window];
    Log.info(`Switching stream for ${window}`);
    const currentIndex = this.currentStreamIndex[window];
    const nextIndex = (currentIndex + 1) % windowStreams.length;

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
    const mplayerProcess = this.mplayerProcesses[window];
    if (mplayerProcess) {
      Log.info(`Killing mplayer process for ${window}...${mplayerProcess.pid}`);
      const killer = spawn(`kill`, [`${mplayerProcess.pid}`]);

      // Handle standard output and error
      killer.stdout.on('data', (data) => {
        Log.debug(`killer [${window}] stdout: ${data}`);
      });

      killer.stderr.on('data', (data) => {
        Log.error(`killer [${window}] stderr: ${data}`);
      });

      killer.on('close', (code) => {
        Log.info(`killer process for ${window} exited with code ${code}`);
      });
    }
  },

  // Launch a new mplayer process for the window using spawn
  launchMPlayer: function(stream, window) {
    const rotate = this.config.rotate || 0; // Values can be 0, 1, 2, or 3
    const size = this.config.windowSize;
    const position = this.config[`${window}Position`] || this.config.windowPosition; // Use specific or general window position

    // Spawn a new mplayer process
    const env = { ...process.env, DISPLAY: ':0' };
    const mplayerProcess = spawn(`mplayer`, ['-noborder', '-monitoraspect', `0`, '-vf', `rotate=${rotate}`, '-geometry', `${position.x}:${position.y}`, `-xy`, `${size.width}`, `${size.height}`, `${stream}`], {env: env}); //C,

    Log.info(`Launched mplayer process for ${window} with PID ${mplayerProcess.pid}`);

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
      Log.info(`mplayer process for ${window} exited with code ${code}`);
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
  }
});
