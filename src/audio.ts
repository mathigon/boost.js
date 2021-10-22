// =============================================================================
// Audio Tools
// (c) Mathigon
// =============================================================================


export class AudioPlayer {
  private player = new Audio();

  constructor(public src: string, public defaultVolume = 1, preload = true) {
    this.player.src = src;
    if (preload) this.player.preload = 'auto';
  }

  play(volume?: number) {
    this.player.currentTime = 0;
    this.player.volume = volume || this.defaultVolume;
    this.player.play();
  }
}
