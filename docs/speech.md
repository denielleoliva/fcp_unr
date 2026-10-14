# Speech and blinking

A **viseme** is a visible mouth pose associated with a speech sound. For example, “M,” “B,” and “P” share a closed-lip pose.

The speech pipeline is:

```text
Typed text → word lookup and pronunciation rules → estimated sound sequence
           → viseme timeline → mouth opening and lip rounding → Vizij rig
```

Browser speech synthesis produces the voice. Voice playback starts the animation, and word-boundary events help realign the timeline when the browser supplies them. Speech temporarily drives mouth opening and rounding; other controls remain available. **Stop** cancels speech and its animation.

Lip sync is approximate because browser speech does not provide reliable phoneme timestamps. Accurate audio alignment would require a speech service with phoneme timing or an audio-alignment step.

Automatic blinking uses a short close-and-open cycle with varied pauses between blinks. The manual blink slider can also close the eyes. Neither blinking nor slider movement changes the original extracted vectors.
