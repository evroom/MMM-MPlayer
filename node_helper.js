/* MagicMirror Module: MMM-MPlayer.js
 * Version: 2.0.0
 */

const NodeHelper = require('node_helper');
const { spawn } = require('child_process');
const { os } = require('os');
const Log = require('logger');  // Import the Log module from MagicMirror

let layout;
let monitorAspect;
let monitorAspectValue;
let noAspect;
let noBorder;
let rotate;
let rotateValue;
let windowPosition;
let windowPositionValue;
let windowPositionValueX ;
let windowPositionValueY;
let new_windowPositionValue;
const windowPositionValues = new Map();
let saved_windowPositionValue;
let saved_windowPositionValueX;
let saved_windowPositionValueY;
let windowSize;
let windowSizeX;
let windowSizeValueX;
let windowSizeY;
let windowSizeValueY;
let windowWidth;
let windowWidthValue;
let windowWidthNoNewAspect;
let windowWidthNoNewAspectValue;
let windowHeightNoNewAspect;
let windowHeightNoNewAspectValue;
let rtspStreamOverTcp;
let rtspStreamOverHttp;
let preferIpv4;
let ipv4onlyProxy;
let videoOutputDriver;
let videoOutputDriverValue;
let noSound;
let mplayerOption;
let mplayerOptionValue;

module.exports = NodeHelper.create({
  start: function() {
    Log.log('Starting MMM-MPlayer module ...');
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
         // Set the configuration after receiving the notification
        Log.debug('[MMM-MPlayer] (socketNotificationReceived) - Received SET_CONFIG');

        this.config = payload;
        const payloadJson = JSON.stringify(payload);
        Log.debug(`[MMM-MPlayer] ${payloadJson}`);
        
        // Set the parameters
        this.setConfig();
        break;
      case 'START_STREAM_CYCLE':
        // Start the stream cycle after receiving the notification
        Log.debug('[MMM-MPlayer] (socketNotificationReceived) - Received START_STREAM_CYCLE');
        this.cycleStreams();
        break;
      case 'STOP_STREAM_CYCLE':
        // Stop the stream cycle after receiving the notification
        Log.debug('[MMM-MPlayer] (socketNotificationReceived) - Received STOP_STREAM_CYCLE');
        this.stopStreams();
    }
  },

  // Start or refresh the streams
  cycleStreams: function() {
    Log.debug('[MMM-MPlayer] (cycleStreams) - Start or refresh the stream(s)');
    // Start the stream(s) immediately
    for (let window_index=0; window_index < this.config.windows.length; window_index++) {
      if (this.config.windows[window_index].streams === undefined) {
        Log.debug(`[MMM-MPlayer] streams window-${window_index} is undefined - no stream to start`);
      } else {
        Log.debug(`[MMM-MPlayer] streams window-${window_index}: ${this.config.windows[window_index].streams}`);
        this.switchStream(window_index);
      }
    }
    
    if (this.streamSwitcher == null) {
      this.streamSwitcher = setInterval(() => {
        for (let window_index=0; window_index < this.config.windows.length; window_index++) {
          if (this.config.windows[window_index].streams === undefined) {
            Log.debug(`[MMM-MPlayer] streams window-${window_index} is undefined - no stream to start`);
          } else {
            Log.debug(`[MMM-MPlayer] streams window-${window_index}: ${this.config.windows[window_index].streams}`);
            this.switchStream(window_index);
          }
        }
      }, this.config.streamInterval);  // Cycle based on the config
      this.sendSocketNotification('STREAM_CYCLE_STARTED');
    }
  },

  stopStreams: function() {
    Log.debug('[MMM-MPlayer] (stopStreams) - killMPlayer');
    if (this.streamSwitcher != null) {
      clearInterval(this.streamSwitcher);
      for (let window_index=0; window_index < this.config.windows.length; window_index++) {
        if (this.config.windows[window_index].streams === undefined) {
          Log.debug(`[MMM-MPlayer] streams window-${window_index} is undefined - no stream to cycle`);
        } else {
          this.killMPlayer(window_index);
        }
        this.currentStreamIndex[window_index] = -1;
      }
      this.streamSwitcher = null;
    }
  },

  // Switch the stream for the given windowIndex
  switchStream: function(windowIndex) {
    Log.debug(`[MMM-MPlayer] (switchStream) - killMPlayer & launchMPlayer`);
    Log.debug(`[MMM-MPlayer] currentStreamIndex - ${JSON.stringify(this.currentStreamIndex)}`);
    Log.debug(`[MMM-MPlayer] mplayerProcesses - ${JSON.stringify(this.mplayerProcesses)}`);
    Log.debug(`[MMM-MPlayer] Switching stream for window-${windowIndex}`);
    const windowStreams = this.config.windows[windowIndex].streams;
    Log.debug(`[MMM-MPlayer] windowStreams: ${windowStreams}`);
    const currentIndex = this.currentStreamIndex[windowIndex] === undefined ? -1 : this.currentStreamIndex[windowIndex];
    Log.debug(`[MMM-MPlayer] currentIndex: ${currentIndex}`);
    const nextIndex = (currentIndex + 1) % windowStreams.length;
    Log.debug(`[MMM-MPlayer] nextIndex: ${nextIndex}`);

    // Update stream index
    this.currentStreamIndex[windowIndex] = nextIndex;

    if (currentIndex != nextIndex) {
        // Kill the old mplayer process for the window using SIGTERM
        this.killMPlayer(windowIndex);

        // Launch new mplayer process for the window
        this.launchMPlayer(windowStreams[nextIndex], windowIndex);
    }
  },

  // Kill any existing mplayer process for a window using SIGTERM
  killMPlayer: function(windowIndex) {
    Log.debug('[MMM-MPlayer] (killMPlayer) - Kill existing mplayer processes for a window using SIGTERM');
    const mplayerProcess = this.mplayerProcesses[windowIndex];
    if (mplayerProcess) {
      Log.debug(`[MMM-MPlayer] Killing mplayer process for window-${windowIndex} PID ${mplayerProcess.pid}`);
      const killer = spawn(`kill`, [`${mplayerProcess.pid}`]);
      // Handle standard output and error
      killer.stdout.on('data', (data) => {
        Log.debug(`kill [${windowIndex}] stdout: ${data}`);
      });

      killer.stderr.on('data', (data) => {
        Log.error(`kill [${windowIndex}] stderr: ${data}`);
      });

      killer.on('close', (code) => {
        Log.debug(`[MMM-MPlayer] killer process for ${windowIndex} exited with code ${code}`);
      });
    }
  },

  // Launch a new mplayer process for the window using spawn
  launchMPlayer: function(stream, windowIndex) {
    Log.info(`[MMM-MPlayer] (launchMPlayer) - Launch mplayer process for window-${windowIndex} ...`);

    // monitorAspect: 0, // -monitoraspect <ratio>
    // noAspect: false, // -noaspect - Disable automatic movie aspect ratio compensation.
    // noBorder: true, // -border - Play movie with window border and decorations. Since this is on by default, use -noborder to disable this.
    // rotate: -1, // -vf rotate[=<0-7>]
    // windowPosition: { x: 5, y: 225 }, // -geometry x[%][:y[%]] - Adjust where the output is on the screen initially.
    // windowSize: { width: 640, height: 360 }, // -x <x> and // -y <y> - Scale image to width <x> and height <y> - Disables aspect calculations.
    // windowWidth: 640, // -xy <value> - Set width to value and calculate height to keep correct aspect ratio.
    // windowWidthNoNewAspect: 640, // -x <x> - Scale image to width <x> - Disables aspect calculations.
    // windowHeightNoNewAspect: 360, // -y <y> - Scale image to height <y> - Disables aspect calculations.
    // rtspStreamOverTcp: false, // -rtsp-stream-over-tcp - Used with 'rtsp://' URLs to specify that the resulting incoming RTP and RTCP packets be streamed over TCP.
    // rtspStreamOverHttp: false, // -rtsp-stream-over-http - Used with 'http://' URLs to specify that the resulting incoming RTP and RTCP packets be streamed over HTTP.
    // preferIpv4: false, // -prefer-ipv4 - Use IPv4 on network connections. Falls back on IPv6 automatically.
    // ipv4onlyProxy: false, // -ipv4-only-proxy - Skip the proxy for IPv6 addresses. It will still be used for IPv4 connections.
    // videoOutputDriver: "xv,gl,gl_nosw,vdpau,", // -vo <driver1[,driver2,...[,]> - Specify a priority list of video output drivers to be used.
    // mplayerOption: '', // user defined mplayer option.

    layout = this.config.layout;
    monitorAspect = this.config.monitorAspect;
    monitorAspectValue = '';
    noAspect = this.config.windows[windowIndex].noAspect || this.config.noAspect;
    noBorder = this.config.windows[windowIndex].noBorder || this.config.noBorder;
    rotate = this.config.windows[windowIndex].rotate || this.config.rotate;
    rotateValue = '';
    windowPosition = this.config.windows[windowIndex].windowPosition || this.config.windowPosition;
    windowPositionValue = '';
    windowPositionValueX = '';
    windowPositionValueY = '';
    new_windowPositionValue = '';
    windowSize = this.config.windows[windowIndex].windowSize || this.config.windowSize;
    windowSizeX = '';
    windowSizeValueX = '';
    windowSizeY = '';
    windowSizeValueY = '';
    windowWidth = this.config.windows[windowIndex].windowWidth || this.config.windowWidth;
    windowWidthValue = '';
    windowWidthNoNewAspect = this.config.windows[windowIndex].windowWidthNoNewAspect || this.config.windowWidthNoNewAspect;
    windowWidthNoNewAspectValue = '';
    windowHeightNoNewAspect = this.config.windows[windowIndex].windowHeightNoNewAspect || this.config.windowHeightNoNewAspect;
    windowHeightNoNewAspectValue = '';
    rtspStreamOverTcp = this.config.windows[windowIndex].rtspStreamOverTcp || this.config.rtspStreamOverTcp;
    rtspStreamOverHttp = this.config.windows[windowIndex].rtspStreamOverHttp || this.config.rtspStreamOverHttp;
    preferIpv4 = this.config.windows[windowIndex].preferIpv4 || this.config.preferIpv4;
    ipv4onlyProxy = this.config.windows[windowIndex].ipv4onlyProxy || this.config.ipv4onlyProxy;
    videoOutputDriver = this.config.windows[windowIndex].videoOutputDriver || this.config.videoOutputDriver;
    videoOutputDriverValue = '';
    noSound = this.config.windows[windowIndex].noSound || this.config.noSound;
    mplayerOption = this.config.windows[windowIndex].mplayerOption || this.config.mplayerOption;
    mplayerOptionValue = '';
    stream = this.config.windows[windowIndex].streams;
      
    // Map module configuration option name / values to mplayer option name / values
    if (monitorAspect >= 0) { monitorAspectValue = monitorAspect; monitorAspect = "-monitoraspect"; } else { monitorAspect = ''; monitorAspectValue = ''; }
    if (noAspect) { noAspect = '-noaspect' } else { noAspect = '' }
    if (noBorder) { noBorder = '-noborder' } else { noBorder = '' }
    if (rotate) { rotateValue = ['rotate', rotate].join('='); rotate = '-vf'; } else { rotate = ''; rotateValue = ''; }
    if (windowPosition) {
      windowPositionValue = [windowPosition.x, windowPosition.y].join(':');
      windowPositionValueX = windowPosition.x;
      windowPositionValueY = windowPosition.y;
      if (windowIndex == 0) { // Only save windowPositionValue on first pass
        windowPositionValues.set(windowIndex, windowPositionValue);
      }
      windowPosition = "-geometry";
    } else { windowPosition = ''; windowPositionValue = ''; windowPositionValueX = ''; windowPositionValueY = ''; }
    if (windowSize) {
      windowSizeValueX = windowSize.width;
      windowSizeValueY = windowSize.height;
      windowSizeX = "-x";
      windowSizeY = "-y";
    } else { windowSizeX = ''; windowSizeValueX = ''; windowSizeY = ""; windowSizeValueY = ''; }
    if (windowWidth) { windowWidthValue = windowWidth; windowWidth = '-xy'; } else { windowWidth = ''; windowWidthValue = ''; }
    if (windowWidthNoNewAspect) { windowWidthNoNewAspectValue = windowWidthNoNewAspect; windowWidthNoNewAspect = "-x"; } else { windowWidthNoNewAspect = ''; windowWidthNoNewAspectValue = ''; }
    if (windowHeightNoNewAspect) { windowHeightNoNewAspectValue = windowHeightNoNewAspect; windowHeightNoNewAspect = '-y'; } else { windowHeightNoNewAspect = ''; windowHeightNoNewAspectValue = ''; }
    if (rtspStreamOverTcp) { rtspStreamOverTcp = '-rtsp-stream-over-tcp'; } else { rtspStreamOverTcp = ''; }
    if (rtspStreamOverHttp) { rtspStreamOverHttp = '-rtsp-stream-over-http'; } else { rtspStreamOverHttp = ''; }
    if (preferIpv4) { preferIpv4 = '-prefer-ipv4'; } else { preferIpv4 = ''; }
    if (ipv4onlyProxy) { ipv4onlyProxy = '-ipv4-only-proxy'; } else { ipv4onlyProxy = ''; }
    if (videoOutputDriver) { videoOutputDriverValue = videoOutputDriver; videoOutputDriver = '-vo' } else { videoOutputDriver = ''; videoOutputDriverValue = ''; }
    if (noSound) { noSound = '-nosound'; } else { noSound = ''; }
    if (mplayerOption) { mplayerOptionValue = mplayerOptionValue; mplayerOption = mplayerOption; } else { mplayerOption = ''; mplayerOptionValue = ''; }

    // windowSize takes precedence over windowWidthNoNewAspect, windowHeightNoNewAspect and windowWidth
    if (windowSize) {
      windowWidthNoNewAspect = '';
      windowWidthNoNewAspectValue = '';
      windowHeightNoNewAspect = '';
      windowHeightNoNewAspectValue = '';
      windowWidth = '';
      windowWidthValue = '';
    // windowWidth takes precedence over windowWidthNoNewAspect and windowHeightNoNewAspect
    } else if (windowWidth) {
      windowWidthNoNewAspect = '';
      windowWidthNoNewAspectValue = '';
      windowHeightNoNewAspect = '';
      windowHeightNoNewAspectValue = '';
    // windowWidthNoNewAspect takes precedence over windowHeightNoNewAspect
    } else if (windowWidthNoNewAspect) {
      windowHeightNoNewAspect = '';
      windowHeightNoNewAspectValue = '';
    }

    // monitorAspect takes precedence over noAspect
    if (monitorAspect >= 0) {
      noAspect = '';
    }

    // rtspStreamOverTcp takes precedence over rtspStreamOverHttp
    if (rtspStreamOverTcp) {
      rtspStreamOverHttp = '';
    }

    // Calculate position for the windows with windowIndex > 0, based on the prior window.
    // The layout value needs to be column or row.
    // Only necessary for windows where windowPosition is not set in the windows array.
    if ((layout === 'column') || (layout === 'row')) {
      Log.info(`[MMM-MPlayer] layout is ${layout}, so need to calculate windowSize and windowPosition for each window.`);
      Log.info(`[MMM-MPlayer] windowIndex = ${windowIndex} of ${this.config.windows.length - 1}`);
      if ( windowIndex == 0 ) {
        Log.info(`[MMM-MPlayer] windowPosition: ${windowPosition} ${windowPositionValue} `);
      } else if (layout === 'column') {
        saved_windowPositionValue = windowPositionValues.get(windowIndex - 1);
        saved_windowPositionValueX = Number(saved_windowPositionValue.split(":")[0]);
        saved_windowPositionValueY = Number(saved_windowPositionValue.split(":")[1]);
        Log.info(`[MMM-MPlayer] saved_windowPositionValue: ${saved_windowPositionValue}`);
        Log.info(`[MMM-MPlayer] saved_windowPositionValueX: ${saved_windowPositionValueX}`);
        Log.info(`[MMM-MPlayer] saved_windowPositionValueY: ${saved_windowPositionValueY}`);
        new_windowPositionValue = {
          x: saved_windowPositionValueX, // Same x position
          y: saved_windowPositionValueY + windowSizeValueY + 5 // y position of previous window plus height and buffer
        };
        windowPositionValue = [new_windowPositionValue.x, new_windowPositionValue.y].join(':');
        windowPositionValues.set(windowIndex, windowPositionValue);
        Log.info(`[MMM-MPlayer] previous windowPosition: ${windowPosition} ${saved_windowPositionValue}`);
        Log.info(`[MMM-MPlayer] new windowPosition: ${windowPosition} ${windowPositionValue}`);
      } else if (layout === 'row') {
        saved_windowPositionValue = windowPositionValues.get(windowIndex - 1);
        saved_windowPositionValueX = Number(saved_windowPositionValue.split(":")[0]);
        saved_windowPositionValueY = Number(saved_windowPositionValue.split(":")[1]);
        Log.info(`[MMM-MPlayer] saved_windowPositionValue: ${saved_windowPositionValue}`);
        Log.info(`[MMM-MPlayer] saved_windowPositionValueX: ${saved_windowPositionValueX}`);
        Log.info(`[MMM-MPlayer] saved_windowPositionValueY: ${saved_windowPositionValueY}`);
        new_windowPositionValue = {
          x: saved_windowPositionValueX + windowSizeValueX + 5, // x position of previous window plus width and buffer
          y: saved_windowPositionValueY  // Same y position
        };
        windowPositionValue = [new_windowPositionValue.x, new_windowPositionValue.y].join(':');
        Log.info(`[MMM-MPlayer] previous windowPosition: ${windowPosition} ${saved_windowPositionValue}`);
        windowPositionValues.set(windowIndex, windowPositionValue);
        Log.info(`[MMM-MPlayer] new windowPosition: ${windowPosition} ${windowPositionValue}`);
      }
    } else {
      Log.info(`[MMM-MPlayer] layout is not column or row, so expecting windowSize and windowPosition in each window config object to be set already with no adjustments.`);
    }

    // Print parameters to log 
    Log.info(`[MMM-MPlayer] Options and option values (after evaluation):`);
    Log.info(`[MMM-MPlayer] monitorAspect: ${monitorAspect} ${monitorAspectValue}`);
    Log.info(`[MMM-MPlayer] noAspect: ${noAspect}`);
    Log.info(`[MMM-MPlayer] noBorder: ${noBorder}`);
    Log.info(`[MMM-MPlayer] rotate: ${rotate} ${rotateValue}`);
    Log.info(`[MMM-MPlayer] windowPosition: ${windowPosition} ${windowPositionValue}`);
    Log.info(`[MMM-MPlayer] windowSize: ${windowSizeX} ${windowSizeValueX} ${windowSizeY} ${windowSizeValueY}`);
    Log.info(`[MMM-MPlayer] windowWidth: ${windowWidth} ${windowWidthValue}`);
    Log.info(`[MMM-MPlayer] windowWidthNoNewAspect: ${windowWidthNoNewAspect} ${windowWidthNoNewAspectValue}`);
    Log.info(`[MMM-MPlayer] windowHeightNoNewAspect: ${windowHeightNoNewAspect} ${windowHeightNoNewAspectValue}`);
    Log.info(`[MMM-MPlayer] rtspStreamOverTcp: ${rtspStreamOverTcp}`);
    Log.info(`[MMM-MPlayer] rtspStreamOverHttp: ${rtspStreamOverHttp}`);
    Log.info(`[MMM-MPlayer] preferIpv4: ${preferIpv4}`);
    Log.info(`[MMM-MPlayer] ipv4onlyProxy: ${ipv4onlyProxy}`);
    Log.info(`[MMM-MPlayer] videoOutputDriver: ${videoOutputDriver} ${videoOutputDriverValue}`);
    Log.info(`[MMM-MPlayer] noSound: ${noSound}`);
    Log.info(`[MMM-MPlayer] mplayerOption: ${mplayerOption} ${mplayerOptionValue}`);
    Log.info(`[MMM-MPlayer] stream: ${stream}`);

    // Discard empty arguments
    const mplayerArgumentsArray = [
      `${stream}`,
      `${rotate}`, `${rotateValue}`,
      `${monitorAspect}`, `${monitorAspectValue}`,
      `${noAspect}`,
      `${noBorder}`,
      `${windowPosition}`, `${windowPositionValue}`,
      `${windowSizeX}`, `${windowSizeValueX}`,
      `${windowSizeY}`, `${windowSizeValueY}`,
      `${windowWidth}`, `${windowWidthValue}`,
      `${windowWidthNoNewAspect}`, `${windowWidthNoNewAspectValue}`,
      `${windowHeightNoNewAspect}`, `${windowHeightNoNewAspectValue}`,
      `${rtspStreamOverTcp}`,
      `${rtspStreamOverHttp}`,
      `${preferIpv4}`,
      `${ipv4onlyProxy}`,
      `${videoOutputDriver}`, `${videoOutputDriverValue}`,
      `${noSound}`,
      `${mplayerOption}`, `${mplayerOptionValue}`
    ]
    const mplayerArgumentsArrayFilter = mplayerArgumentsArray.filter(discardEmptyArgument);
    function discardEmptyArgument(value, index, array) {
      return value != '';
    }
    mplayerArgumentsString = mplayerArgumentsArrayFilter.join(" ");

    // Spawn a new mplayer process
    const env = { ...process.env, DISPLAY: ':0' };
    const mplayerProcess = spawn(`mplayer`, mplayerArgumentsArrayFilter, {env: env});

    Log.info(`[MMM-MPlayer] Launched mplayer process for window ${windowIndex} with PID ${mplayerProcess.pid}`);
    Log.info(`[MMM-MPlayer] DISPLAY=:0 mplayer ${mplayerArgumentsString}`);

    // Track the process for future termination
    this.mplayerProcesses[windowIndex] = mplayerProcess;

    // Handle standard output and error
    mplayerProcess.stdout.on('data', (data) => {
      Log.debug(`mplayer [window-${windowIndex}] stdout: ${data}`);
    });

    mplayerProcess.stderr.on('data', (data) => {
    });

    mplayerProcess.on('close', (code) => {
      Log.info(`[MMM-MPlayer] mplayer process for window-${windowIndex} exited with code ${code}`);
    });
  },

  // Adjust windowPosition based on windowSize
  setConfig: function() {
    Log.info('[MMM-MPlayer] (setConfig) - Set configuration parameters ...');
    Log.info('[MMM-MPlayer] No need for setting configuration parameters prior to launchMPlayer()');
  }
});
