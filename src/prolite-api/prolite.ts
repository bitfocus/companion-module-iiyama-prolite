import { ProliteApiCommand, ProliteAspectRatio, ProliteColorTemp, ProliteOnOff, ProlitePictureMode, ProlitePowerState, ProliteRemoteControl, ProliteSoundMode, ProliteVideoSource } from "./ProliteApiTypes";
import { ProliteProtocol } from "./protocol";
import ProliteLH42UHSApi from "./protocols/LH42UHS";
import ProliteTE04Api from "./protocols/TE04";

export interface ProliteApiImplementation {
  set(cmd: ProliteApiCommand, value: string | number): void;
  get(cmd: ProliteApiCommand): Promise<string>;
  destroy(): void;
}

export default class ProliteApi {
  _implementation: ProliteApiImplementation;

  constructor (host: string, protocol: ProliteProtocol) {
    switch(protocol) {
      case ProliteProtocol.LH42UHS: 
        this._implementation = new ProliteLH42UHSApi(host, 1);
        break;
      case ProliteProtocol.TE04: 
        this._implementation = new ProliteTE04Api(host);
        break;
      default:
        throw ('Unknown protocol: '+protocol)
    }
  }

  public destroy() {
    this._implementation.destroy();
  }

  public async getPowerState(): Promise<ProlitePowerState> {
    return await this._implementation.get(ProliteApiCommand.Power) as ProlitePowerState;
  }

  public async setPowerState(value: ProlitePowerState): Promise<void> {
    await this._implementation.set(ProliteApiCommand.Power, value);
  }

  public async getTreble(): Promise<number> {
    return parseInt(await this._implementation.get(ProliteApiCommand.Treble));
  }

  public async setTreble(value: number): Promise<void> {
    await this._implementation.set(ProliteApiCommand.Treble, value);
  }

  public async getBass(): Promise<number> {
    return parseInt(await this._implementation.get(ProliteApiCommand.Bass));
  }

  public async setBass(value: number): Promise<void> {
    await this._implementation.set(ProliteApiCommand.Bass, value);
  }

  public async getBalance(): Promise<number> {
    return parseInt(await this._implementation.get(ProliteApiCommand.Balance));
  }

  public async setBalance(value: number): Promise<void> {
    await this._implementation.set(ProliteApiCommand.Balance, value);
  }

  public async getContrast(): Promise<number> {
    return parseInt(await this._implementation.get(ProliteApiCommand.Contrast));
  }

  public async setContrast(value: number): Promise<void> {
    await this._implementation.set(ProliteApiCommand.Contrast, value);
  }

  public async getBrightness(): Promise<number> {
    return parseInt(await this._implementation.get(ProliteApiCommand.Brightness));
  }

  public async setBrightness(value: number): Promise<void> {
    await this._implementation.set(ProliteApiCommand.Brightness, value);
  }

  public async getSharpness(): Promise<number> {
    return parseInt(await this._implementation.get(ProliteApiCommand.Sharpness));
  }

  public async setSharpness(value: number): Promise<void> {
    await this._implementation.set(ProliteApiCommand.Sharpness, value);
  }

  public async getSoundMode(): Promise<ProliteSoundMode> {
    return await this._implementation.get(ProliteApiCommand.SoundMode) as ProliteSoundMode;
  }

  public async setSoundMode(value: ProliteSoundMode): Promise<void> {
    await this._implementation.set(ProliteApiCommand.SoundMode, value);
  }

  public async getVolume(): Promise<number> {
    return parseInt(await this._implementation.get(ProliteApiCommand.Volume));
  }

  public async setVolume(value: number): Promise<void> {
    await this._implementation.set(ProliteApiCommand.Volume, value);
  }

  public async getMute(): Promise<ProliteOnOff> {
    return await this._implementation.get(ProliteApiCommand.Mute) as ProliteOnOff;
  }

  public async setMute(value: ProliteOnOff): Promise<void> {
    await this._implementation.set(ProliteApiCommand.Mute, value);
  }

  public async getInput(): Promise<ProliteVideoSource> {
    return await this._implementation.get(ProliteApiCommand.VideoSource) as ProliteVideoSource;
  }

  public async setInput(value: ProliteVideoSource): Promise<void> {
    await this._implementation.set(ProliteApiCommand.VideoSource, value);
  }

  public async getAspectRatio(): Promise<ProliteAspectRatio> {
    return await this._implementation.get(ProliteApiCommand.AspectRatio) as ProliteAspectRatio;
  }

  public async setAspectRatio(value: ProliteAspectRatio): Promise<void> {
    await this._implementation.set(ProliteApiCommand.AspectRatio, value);
  }

  public async getPictureMode(): Promise<ProlitePictureMode> {
    return await this._implementation.get(ProliteApiCommand.PictureMode) as ProlitePictureMode;
  }

  public async setPictureMode(value: ProlitePictureMode): Promise<void> {
    await this._implementation.set(ProliteApiCommand.PictureMode, value);
  }

  public async getHue(): Promise<number> {
    return parseInt(await this._implementation.get(ProliteApiCommand.Hue));
  }

  public async setHue(value: number): Promise<void> {
    await this._implementation.set(ProliteApiCommand.Hue, value);
  }

  public async getBacklight(): Promise<number> {
    return parseInt(await this._implementation.get(ProliteApiCommand.Backlight));
  }

  public async setBacklight(value: number): Promise<void> {
    await this._implementation.set(ProliteApiCommand.Backlight, value);
  }

  public async getColorTemp(): Promise<ProliteColorTemp> {
    return await this._implementation.get(ProliteApiCommand.ColorTemp) as ProliteColorTemp;
  }

  public async setColorTemp(value: ProliteColorTemp): Promise<void> {
    await this._implementation.set(ProliteApiCommand.ColorTemp, value);
  }

  public async getRemoteControlEnabled(): Promise<ProliteRemoteControl> {
    return await this._implementation.get(ProliteApiCommand.RemoteControl) as ProliteRemoteControl;
  }

  public async setRemoteControlEnabled(value: ProliteRemoteControl): Promise<void> {
    await this._implementation.set(ProliteApiCommand.RemoteControl, value);
  }

  public async getSpeaker(): Promise<ProliteOnOff> {
    return await this._implementation.get(ProliteApiCommand.Speaker) as ProliteOnOff;
  }

  public async setSpeaker(value: ProliteOnOff): Promise<void> {
    await this._implementation.set(ProliteApiCommand.Speaker, value);
  }
} 
