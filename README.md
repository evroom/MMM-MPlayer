# MMM-MPlayer
A is a module for [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror) that uses MPlayer to display various video files and rtsp streams.

## Project Status
This module is working, but some positioning related issues exist.<br>
See the [known bugs](#known-bugs) section for details.

## Installation of mplayer
### Verify if mplayer is already installed
```shell
$ which mplayer
/usr/bin/mplayer
```
### Install mplayer (when not installed yet)

```shell
$ sudo apt install -y mplayer
```

## Installation of the MM module
1. In your terminal, change to your Magic Mirror module directory `cd ~/MagicMirror/modules`

2. Clone this repository `git clone https://github.com/evroom/MMM-MPlayer`

3. Make changes to your `config.js` file.
### Config Example
Edit the file `~/MagicMirror/config/config.js` to add or modify the module.
```javascript
{
	module: 'MMM-MPlayer',
        disabled: false,
        position: "top_left",
        header: "MPlayer",
	config: {
	  useTwoWindows: true,
	  layout: 'row',
	  monitorAspect: 0,
	  rotate: -1,
	  windowSize: { width: 640, height: 360 },
	  windowPosition: { x: 5, y: 225 },
	  streamInterval: 30000,
	  streams: {
		window1: [
		  'something.mp4',
		  'something_else.mp4'
		],
		window2: [
		  'rtsp://foo',
		  'rtsp://bar',
		]
	  }
	}
},
```
## Configuration Options 
###
| Option | Description | Default |
| ------------- | ------------- | ------------- |
| `useTwoWindows`  | Use two windows. | true |
| `layout`  | Can be 'row' or 'column'. | row |
| `monitorAspect`  | Set the aspect ratio of your monitor or TV screen.<br>Examples:<br>16:9 or 1.7777<br>4:3 or 1.3333<br> | 0 |
| `rotate`  | Rotate window.<br>-1: Do not rotate (default).<br>0: Rotate by 90 degrees clockwise and flip.<br>1: Rotate by 90 degrees clockwise.<br>2: Rotate by 90 degrees counterclockwise.<br>3: Rotate by 90 degrees counterclockwise and flip. | -1 |
| `windowSize`  | Window size for both windows. | { width: 640, height: 360 } |
| `windowPosition`  | Position of the first window (window1).<br>[window2 is either 5px below or to the right of this window, depending on layout] | { x: 5, y: 225 } |
| `streamInterval`  | Cycles the streams defined in window1 and/or window2 after the provided interval (in milliseconds).<br>Where applicable, the streams will start from the beginning again (for example for mp4 videos). | 30000 |
| `streams`  | window1 and / or window2 streams [ mp4 , rtsp ]  |  |

### Streams for testing
These public streams can be used for testing:
- http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
- http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4
- http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4

## Test environment
This procedure has been tested on:

- Raspberry Pi 4 Model B Rev 1.5
- Debian GNU/Linux 12 (bookworm)
- Magic Mirror version: 2.30.0

## Known bugs
- When using 1 stream in 1 window, the positioning is not always correct. Restart of MM necessary.
- When using 2 streams in 1 window, the positioning is not correct when cycling through the streams.
- When using 2 streams in 2 windows, the positioning is not correct when cycling through the streams.

All 3 issues seem to be more related to mplayer then to the module.

## Contributions
Code provided by user 'myfingersarecold'.<br>
https://forum.magicmirror.builders/user/myfingersarecold<br>
Code adapted by user 'evroom'.<br>
https://forum.magicmirror.builders/user/evroom

## MPlayer Project
MPlayer Documentation:<br>
http://www.mplayerhq.hu/design7/documentation.html

