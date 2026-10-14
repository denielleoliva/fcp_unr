#!/usr/bin/env python3
import argparse
import asyncio
import io
import json
from pathlib import Path

from aiohttp import web, ClientSession, WSMsgType
from PIL import Image
from playwright.async_api import async_playwright
from protocol import TOPICS, face_event, image_message


async def run(args):
    clients = set()
    root = args.web_root.resolve()
    if not (root / 'index.html').is_file() or not (root / 'assets/drawing-face.vizij.glb').is_file():
        raise ValueError('web-root must contain the built M face app and assets/drawing-face.vizij.glb')

    @web.middleware
    async def headers(request, handler):
        response = await handler(request)
        response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
        response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
        return response

    async def socket(request):
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        clients.add(ws)
        try:
            async for _ in ws:
                pass
        finally:
            clients.discard(ws)
        return ws

    async def index(request):
        return web.FileResponse(root / 'index.html')

    async def receive(ros):
        async for message in ros:
            if message.type != WSMsgType.TEXT:
                continue
            packet = json.loads(message.data)
            if packet.get('op') == 'status' and packet.get('level') == 'error':
                raise RuntimeError('rosbridge: ' + packet.get('msg', 'unknown error'))
            if packet.get('op') != 'publish':
                continue
            event = face_event(packet.get('topic'), packet.get('msg', {}))
            if event:
                await asyncio.gather(*(ws.send_json(event) for ws in tuple(clients)), return_exceptions=True)
        raise ConnectionError('ROS connection closed; restart the bridge after reconnecting')

    app = web.Application(middlewares=[headers])
    app.router.add_get('/ws', socket)
    app.router.add_get('/', index)
    app.router.add_static('/', root)
    runner = web.AppRunner(app)
    await runner.setup()
    await web.TCPSite(runner, '127.0.0.1', args.port).start()
    try:
        async with ClientSession() as session, async_playwright() as playwright:
            async with session.ws_connect(args.rosbridge, heartbeat=20, max_msg_size=4 * 1024 * 1024) as ros:
                await ros.send_json({'op': 'advertise', 'topic': '/robot/xdisplay', 'type': 'sensor_msgs/Image', 'latch': True, 'queue_size': 1})
                for topic in TOPICS:
                    await ros.send_json({'op': 'subscribe', 'topic': topic, 'type': 'std_msgs/String', 'queue_length': 1})
                browser = await playwright.chromium.launch(headless=True)
                receiver = asyncio.create_task(receive(ros))
                try:
                    page = await browser.new_page(viewport={'width': 1024, 'height': 600}, device_scale_factor=1)
                    await page.goto(f'http://127.0.0.1:{args.port}/?face=drawing')
                    await page.locator('[data-face-ready="true"]').wait_for(timeout=60000)
                    print('Publishing face frames to /robot/xdisplay. Ctrl-C to stop.', flush=True)
                    sequence = 0
                    while not receiver.done():
                        start = asyncio.get_running_loop().time()
                        png = await page.screenshot(type='png', animations='allow')
                        with Image.open(io.BytesIO(png)) as image:
                            payload = image_message(image, sequence)
                        await ros.send_json({'op': 'publish', 'topic': '/robot/xdisplay', 'msg': payload})
                        sequence += 1
                        await asyncio.sleep(max(0, 1 / args.fps - (asyncio.get_running_loop().time()-start)))
                    await receiver
                finally:
                    receiver.cancel()
                    await asyncio.gather(receiver, return_exceptions=True)
                    await browser.close()
                    if not ros.closed:
                        await ros.send_json({'op': 'unadvertise', 'topic': '/robot/xdisplay'})
    finally:
        await runner.cleanup()


def main():
    parser = argparse.ArgumentParser(description='Render the drawing face and publish Baxter ROS 1 head-display frames through rosbridge.')
    parser.add_argument('--web-root', type=Path, required=True, help='M web3d/dist directory')
    parser.add_argument('--rosbridge', required=True, help='ws://ROS_WORKSTATION:9090')
    parser.add_argument('--port', type=int, default=8766)
    parser.add_argument('--fps', type=float, default=5)
    args = parser.parse_args()
    if not 1 <= args.fps <= 15:
        parser.error('--fps must be between 1 and 15')
    try:
        asyncio.run(run(args))
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
