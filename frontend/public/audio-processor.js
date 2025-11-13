class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {

    const leftChannel = inputs[0]?.[0];
    const rightChannel = inputs[0]?.[1];

    if (leftChannel && rightChannel) {
      const monoChannel = new Float32Array(leftChannel.length);
      for (let i = 0; i < leftChannel.length; i++) {
        monoChannel[i] = (leftChannel[i] + rightChannel[i]) / 2;
      }

      let hasSound = false;
      for (let i = 0; i < 100; i++) {
        if (Math.abs(monoChannel[i]) > 0.01) {
          hasSound = true;
          break;
        }
      }
      if (hasSound) {
        console.log('AudioProcessor: Sound detected in mixed audio.');
      }
      this.port.postMessage(monoChannel);

    } else if (leftChannel) {
      this.port.postMessage(leftChannel);
    }

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);