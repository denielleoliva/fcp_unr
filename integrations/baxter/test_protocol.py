import base64
import unittest
from protocol import face_event, image_message


class PixelImage:
    width, height = 2, 1
    def convert(self, mode):
        assert mode == 'RGB'
        return self
    def tobytes(self):
        return bytes([255, 0, 0, 0, 255, 0])


class ProtocolTests(unittest.TestCase):
    def test_image_encoding(self):
        message = image_message(PixelImage(), 7)
        self.assertEqual(message['step'], 6)
        self.assertEqual(message['encoding'], 'rgb8')
        self.assertEqual(base64.b64decode(message['data']), PixelImage().tobytes())
        self.assertEqual(message['header']['seq'], 7)

    def test_relay(self):
        self.assertEqual(face_event('/face/expression', {'data': ' blink '}), {'type': 'expression', 'name': 'blink'})
        self.assertEqual(face_event('/face/command', {'data': '{"command":"stop_audio_sync"}'})['data']['command'], 'stop_audio_sync')

    def test_invalid_messages(self):
        for topic, value in [('/face/visemes', '{}'), ('/face/command', '[]'), ('/face/command', 'bad'), ('/unrelated', 'blink')]:
            self.assertIsNone(face_event(topic, {'data': value}))


if __name__ == '__main__':
    unittest.main()
