# Face Rigging Studio

A web app for drawing faces, rigging them with control points, and animating them with text-to-speech.

## Features

- **Draw Mode**: Create faces using pen, rectangle, and circle tools
- **Rig Points Mode**: Position control points on your drawing for animation
- **Animate Mode**: Watch your drawing come alive with speech!

Animations include:
- Mouth opening/closing synced with speech
- Eyebrow movement
- Eye blinking (every 2-4 seconds)
- Pupil movement


## Local Development

To run locally:

```bash
npm install
npm start
```

Opens at [http://localhost:3000](http://localhost:3000)

## Usage

### Drawing Your Face

1. **Draw Mode**: Use the pen tool to draw eyes, eyebrows, and mouth
2. **Rig Points Mode**: 
   - Drag the eye control points to the center of each eye
   - Drag eyebrow control points above each eye
   - Drag the 4 mouth control points around the mouth (left, right, top, bottom)
3. **Animate Mode**: 
   - Enter text to speak
   - Click "Animate with Speech"
   - Watch your drawing come alive!

### Detection Zones

- **Pupils**: 15px from eye center (small inner circles move)
- **Eyes**: 40px from eye points (blink during speech)
- **Eyebrows**: 60px from eyebrow points (lift during speech)
- **Mouth**: 120px from mouth center (opens/closes with speech)

## Troubleshooting

### Shapes not animating?
- Check the debug panel to see detected shapes
- Make sure control points are positioned over your drawings
- Green glow = detected, Red glow = actively animating

### Can't deploy?
- Make sure you have Node.js installed
- Check that your GitHub repository is public
- Verify the homepage URL in package.json matches your GitHub username

## Technologies

- React 18
- Tailwind CSS
- Lucide React Icons
- Web Speech API for text-to-speech
