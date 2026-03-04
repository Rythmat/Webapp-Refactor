import {
  ChorusParams,
  DelayParams,
  PhaserParams,
  CompressorParams,
  DriveParams,
} from '../types';
import { DriveEffect } from './DriveEffect';
import { ChorusEffect } from './ChorusEffect';
import { PhaserEffect } from './PhaserEffect';
import { DelayEffect } from './DelayEffect';
import { CompressorEffect } from './CompressorEffect';

/**
 * Master FX chain. Connects 5 effects in series:
 * input → Drive → Chorus → Phaser → Delay → Compressor → output
 */
export class FXChain {
  readonly input: GainNode;
  readonly output: GainNode;

  readonly drive: DriveEffect;
  readonly chorus: ChorusEffect;
  readonly phaser: PhaserEffect;
  readonly delay: DelayEffect;
  readonly compressor: CompressorEffect;

  constructor(ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    this.drive = new DriveEffect(ctx);
    this.chorus = new ChorusEffect(ctx);
    this.phaser = new PhaserEffect(ctx);
    this.delay = new DelayEffect(ctx);
    this.compressor = new CompressorEffect(ctx);

    // Chain: input → drive → chorus → phaser → delay → compressor → output
    this.input.connect(this.drive.input);
    this.drive.output.connect(this.chorus.input);
    this.chorus.output.connect(this.phaser.input);
    this.phaser.output.connect(this.delay.input);
    this.delay.output.connect(this.compressor.input);
    this.compressor.output.connect(this.output);
  }

  setDriveParams(params: Partial<DriveParams>): void {
    this.drive.updateParams(params);
  }

  setChorusParams(params: Partial<ChorusParams>): void {
    this.chorus.updateParams(params);
  }

  setPhaserParams(params: Partial<PhaserParams>): void {
    this.phaser.updateParams(params);
  }

  setDelayParams(params: Partial<DelayParams>): void {
    this.delay.updateParams(params);
  }

  setCompressorParams(params: Partial<CompressorParams>): void {
    this.compressor.updateParams(params);
  }

  dispose(): void {
    this.input.disconnect();
    this.output.disconnect();
    this.drive.dispose();
    this.chorus.dispose();
    this.phaser.dispose();
    this.delay.dispose();
    this.compressor.dispose();
  }
}
