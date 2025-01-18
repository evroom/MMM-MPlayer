# MMM-MPlayer
This is a module for [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror) that uses MPlayer to display various video files and RTSP streams.

## Screenshot
![Screenshot](screenshot.png)

## Project Status
This module is working, but some positioning related issues exist.<br>
See the [known bugs](#known-bugs) section for details.

PIR functions have not been tested by me, as I do not use it.

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
1. In your terminal, change to your MagicMirror module directory `cd ~/MagicMirror/modules`

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

- Raspberry Pi 4 Model B Rev 1.5 with 8 GB RAM
- Debian GNU/Linux 12 (bookworm)
- MagicMirror version: 2.30.0

## Support for MMM-pages
[Still under development]
This module has support for the module MMM-pages:
https://github.com/sdetweil/MMM-pages

It will start and stop the video stream based on the notifications:
- NEW_PAGE
- PAGE_CHANGED
If payload == 0 then START_STREAM_CYCLE else START_STREAM_CYCLE.
Requirement for the moment, is that MMM-MPlayer needs to have page index 0, so it needs to be the first page in the config.

## Known bugs
- When using 1 stream in 1 window, the positioning is not always correct. Restart of MM may be necessary.
- When using 2 streams in 1 window, the positioning is not correct when cycling through the streams.
- When using 2 streams in 2 windows, the positioning is not correct when cycling through the streams.

All 3 issues seem to be more related to mplayer then to the module.

## Opening Issues
Opening an Issue is possible, but I cannot promise to be able to do something about it.<br>
The code for the module was inherited and many stuff heavily depends on the MPlayer code (the latest MPlayer release is 1.5, created on 2022-02-27).

When opening an issue, be sure to include you config, a good description of the issue and [MMM-MPlayer] entries you might find in the log(s).

## Contributions
Code provided by user 'myfingersarecold'.<br>
https://forum.magicmirror.builders/user/myfingersarecold<br>
Code adapted by user 'evroom'.<br>
https://forum.magicmirror.builders/user/evroom

## MPlayer Project
MPlayer Documentation:<br>
http://www.mplayerhq.hu/design7/documentation.html

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
