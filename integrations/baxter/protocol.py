import base64
import time

TOPICS = {'/face/expression': 'expression', '/face/visemes': 'visemes', '/face/command': 'command'}


def face_event(topic, message):
    import json
    kind = TOPICS.get(topic)
    value = message.get('data')
    if not kind or not isinstance(value, str):
        return None
    if kind == 'expression':
        return {'type': kind, 'name': value.strip()}
    try:
        data = json.loads(value)
    except ValueError:
        return None
    if kind == 'visemes' and not isinstance(data, list):
        return None
    if kind == 'command' and not isinstance(data, dict):
        return None
    return {'type': kind, 'data': data}


def image_message(image, sequence):
    rgb = image.convert('RGB')
    seconds = time.time()
    return {
        'header': {'seq': sequence, 'stamp': {'secs': int(seconds), 'nsecs': int(seconds % 1 * 1e9)}, 'frame_id': ''},
        'height': rgb.height, 'width': rgb.width, 'encoding': 'rgb8',
        'is_bigendian': 0, 'step': rgb.width * 3,
        'data': base64.b64encode(rgb.tobytes()).decode('ascii'),
    }
