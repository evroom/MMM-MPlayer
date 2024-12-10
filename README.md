# MMM-MPlayer
A MagicMirror module that uses MPlayer to display rtsp streams
## Installation
1. In your terminal, change to your Magic Mirror module directory `cd ~/MagicMirror/modules`

2. Clone this repository `git clone https://github.com/evroom/MMM-MPlayer`

3. Make changes to your `config.js` file.
### Config Example
Edit the file `~/MagicMirror/config/config.js` to add or modify the module.
```javascript
{
	module: 'MMM-MPlayer',  // Update the module name here
	position: 'top_left',  // Magic Mirror position
	config: {
	  useTwoWindows: true, // Use two windows
	  layout: 'row',  // Can be 'row' or 'column'
	  windowSize: { width: 525, height: 295 },  // Window size for both windows
	  windowPosition: { x: 12, y: 575 },  // Position of the first window (window1) [window2 is either 5px below or to the right of this window, depending on layout]
	  streamInterval: 30000,
	  streams: {
		window1: [
		  'somthing_else.mp4',
		  'something.mp4'
		],
		window2: [
		  'rtsp://foo',
		  'rtsp://bar',
		]
	  }
	}
},
```
###
Initial code provided by user 'myfingersarecold'.
https://forum.magicmirror.builders/user/myfingersarecold
