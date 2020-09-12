// =============================================================================
// Audio Tools
// (c) Mathigon
// =============================================================================


export class AudioPlayer {
  private player: HTMLAudioElement;

  constructor(url: string) {
    this.player = new Audio(url);
    this.player.preload = 'auto';
  }

  play() {
    this.player.currentTime = 0;
    this.player.play();
  }
}
