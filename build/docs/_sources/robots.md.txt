# Running a drawn face on M and Baxter

The same `drawing-face.vizij.glb` can drive either screen. M renders it directly in its existing Vizij browser app. Baxter receives rendered image frames from a companion computer through ROS 1.

## M robot (ROS 2)

The integration is in the separate `m-sarg` repository, under `src/m_sarg/web3d`. The drawing profile keeps the existing settings, pairing-code overlay, and visual-aid display. It uses the existing face-node WebSocket and speech topics; it does not change servo control.

1. Build and export a face from this studio with **Natural mouth & eye motion** and **Keep my drawn shapes** enabled.
2. Copy the GLB into the M checkout:

   ```sh
   cp /path/to/drawing-face.vizij.glb /path/to/m-sarg/src/m_sarg/web3d/public/assets/drawing-face.vizij.glb
   ```

3. Build the M web app with the drawing profile as its kiosk default:

   ```sh
   cd /path/to/m-sarg/src/m_sarg/web3d
   npm ci
   VITE_FACE_PROFILE=drawing npm run build
   ```

4. Copy or commit the M source, asset, and generated `dist` changes to the robot workspace, then rebuild its installed package:

   ```sh
   cd /path/to/m-sarg
   colcon build --packages-select m_sarg
   source install/setup.bash
   ros2 run m_sarg face_node --ros-args -p kiosk:=true
   ```

This command runs the display node only. When the robot already runs its face node as a service, restart that service instead of starting a second node on port 8765. Its existing speech stack must be running to provide voice audio and viseme messages.

For development, `?face=drawing` selects the drawing profile on a normal build. `?face=default` selects the original face. To restore the original kiosk default, rebuild without `VITE_FACE_PROFILE=drawing`.

### Speech contract

| ROS topic | Type | Payload |
| --- | --- | --- |
| `face/expression` | `std_msgs/String` | `neutral`, `happy`, `sad`, `surprised`, or `blink` |
| `face/visemes` | `std_msgs/String` | JSON array of `{ "viseme_id": 2, "audio_offset": 1000000 }` |
| `face/command` | `std_msgs/String` | JSON command described below |

Viseme IDs use the [Azure 0–21 vocabulary](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-speech-synthesis-viseme); `audio_offset` is measured in **100 ns units**, so `1000000` means 100 ms. The adapter maps these sounds onto the drawing's jaw and lip-rounding controls. Silence and ID 21 (P/B/M) close the mouth.

A speech producer should send, in order:

1. The complete viseme timeline.
2. `{"command":"set_mode","mode":"viseme"}`.
3. `{"command":"start_audio_sync"}` as audio playback begins.
4. `{"command":"stop_audio_sync"}` when playback ends or is interrupted.

The adapter closes the mouth on disconnect, stop, or 500 ms after the final event if a stop message is missing. Timing is relative to receipt of the start message; transport and audio-device latency still require on-robot checks. Emotion support is limited to the drawing's available brow and gaze controls; it does not create additional smile/frown shapes.

## Baxter head display (ROS 1)

Baxter's [display example](https://github.com/RethinkRobotics/baxter_examples/blob/master/scripts/xdisplay_image.py) accepts `sensor_msgs/Image` messages on `/robot/xdisplay`, at up to 1024 × 600 pixels.

The bridge in `integrations/baxter/display_bridge.py` runs on a modern companion computer. It serves the built M web app locally, renders the drawing profile in Chromium, and publishes 1024 × 600 RGB frames through ROS 1 rosbridge. It also relays the same three face topics from ROS 1 to the browser, so the drawing adapter can use your speech timeline. It does not generate or play speech audio.

### Set up

On the ROS 1 workstation configured to communicate with Baxter, start the installed `rosbridge_server`:

```sh
roslaunch rosbridge_server rosbridge_websocket.launch
```

Use that workstation's rosbridge address below. The workstation must already have the appropriate Baxter ROS master and networking configuration. If rosbridge is not installed, install the package for that workstation's ROS distribution first.

On the rendering computer, use Python 3.10 or newer:

```sh
cd /path/to/fcp_unr
python3 -m venv .venv-baxter
.venv-baxter/bin/python -m pip install -r integrations/baxter/requirements.txt
.venv-baxter/bin/python -m playwright install chromium
.venv-baxter/bin/python integrations/baxter/display_bridge.py \
  --web-root /path/to/m-sarg/src/m_sarg/web3d/dist \
  --rosbridge ws://ROS_WORKSTATION:9090 \
  --fps 5
```

Build the M web app and install the exported drawing GLB as described above before starting this command. The two repositories are both needed for this setup. The bridge uses rosbridge rather than importing `rospy`, allowing the renderer's Python environment to be separate from Baxter's older ROS installation.

The renderer serves its local preview at `http://127.0.0.1:8766/?face=drawing`. It does not publish frames until the Vizij runtime reports ready. Ctrl-C stops publishing; Baxter may retain the last frame. A ROS connection loss stops the bridge and requires a restart.

Five frames per second is the initial setting, not a measured hardware limit. Raw 1024 × 600 RGB frames are about 1.8 MB each before base64 overhead. Start on a wired network and measure display latency before raising the rate (allowed range: 1–15 fps). Keep rosbridge on your robot network; the renderer needs access to its topics.

### Speech on Baxter

Publish the speech contract above on ROS 1 `/face/visemes` and `/face/command`, synchronized with the audio player on the robot or companion computer. M's ROS 2 speech node cannot publish directly into ROS 1 without an additional bridge. Idle blinking works without speech messages.

## Validation status

The M adapter has TypeScript, production-build, and motion-contract checks. A regenerated drawing GLB was loaded in its browser preview. The Baxter adapter has image-message and event-relay unit tests, but has not been run against a ROS master or physical Baxter. Neither robot's hardware, audio timing, or display performance has been verified in this workspace.

```sh
cd /path/to/m-sarg/src/m_sarg/web3d
node --test src/drawingMotion.test.mjs
node node_modules/typescript/bin/tsc --noEmit

cd /path/to/fcp_unr
python3 -m unittest discover -s integrations/baxter -p 'test_*.py'
```
