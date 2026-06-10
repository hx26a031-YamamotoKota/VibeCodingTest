/**
 * Web Audio API を使用した、お菓子テトリス用のかわいいポップ効果音シンセサイザー
 */

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ミュート切り替え
  public toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // 移動音：「ピョコッ」
  public playMove() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(261.63, this.ctx.currentTime); // C4
    osc.frequency.exponentialRampToValueAtTime(329.63, this.ctx.currentTime + 0.08); // E4

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // 回転音：「きゅるん」
  public playRotate() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(392.00, this.ctx.currentTime); // G4
    osc.frequency.exponentialRampToValueAtTime(523.25, this.ctx.currentTime + 0.1); // C5

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  // ホールド音：「ぷわん」
  public playHold() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(293.66, this.ctx.currentTime); // D4
    osc.frequency.setValueAtTime(440.00, this.ctx.currentTime + 0.05); // A4

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  // ハードドロップ音：「ポココンッ」
  public playDrop() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(196.00, this.ctx.currentTime); // G3
    osc.frequency.exponentialRampToValueAtTime(80.00, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // ライン消去音：「シャラシャラリン✨」
  public playLineClear(linesCount: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const baseFreqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (ドミソド)

    // 消去ライン数に応じてきらびやかさを変える
    const repeatCount = Math.min(linesCount * 3, 12);
    
    for (let i = 0; i < repeatCount; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      const fIndex = (i + linesCount) % baseFreqs.length;
      const freq = baseFreqs[fIndex] * (1 + Math.floor(i / baseFreqs.length) * 0.5);
      
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      
      const playTime = 0.3;
      gain.gain.setValueAtTime(0.08, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + playTime);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + playTime);
    }
  }

  // フィーバーモード突入！：「パーパラポロロン！🍬」
  public playFeverStart() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51]; // アルペジオ

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.1, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.4);
    });
  }

  // ゲームオーバー音：「ショボ〜〜ん…💧」
  public playGameOver() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // 悲しいダウンコード
    const baseFreqs = [392.00, 311.13, 261.63]; // G4, Eb4, C4

    baseFreqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      osc.frequency.linearRampToValueAtTime(freq * 0.6, now + i * 0.1 + 0.8);

      gain.gain.setValueAtTime(0.12, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.8);
    });
  }
}

export const sounds = new SoundEffectsManager();
