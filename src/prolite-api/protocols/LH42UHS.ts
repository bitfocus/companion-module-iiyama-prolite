import { TClient } from "../client";
import net from 'net';
import { PromiseSocket } from 'promise-socket';
import { ProliteApiImplementation } from "../prolite";
import { ProliteApiCommand, ProlitePowerState, ProliteVideoSource } from "../ProliteApiTypes";
import { ProliteChecksumError, ProliteUnknownResponseError, ProliteUnsupportedCommandError } from "./errors";
import Queue from "queue-promise";

/*
Byte 1 Header Header = 0xA6

Byte 2 Monitor ID
Monitor ID
Range : 1 ~ 255
Signal mode: Display Address range from 1 to 255
Broadcast mode: Display Address is 0 which indicates no ACK
or Report is expected.

Byte 3 Category Category = 0x00 (fixed)

Byte 4 Code0 (Page) Page = 0x00 (fixed)

Byte 5 Code1 (Function)

Byte 6 Length Length has to be calculated in the fallowing way:
Length = N + 3

Byte 7 Data Control Data Control = 0x01 (fixed)

Byte 8 ~ Byte 44 Data[0] ~ Data[N] This field can be also empty.
If not empty then the range of Data Size, N = 0 to 36.

Last Byte Checksum
Checksum.
Range = 0 to 255 (0xFF).
Algorithm: The EXCLUSIVE-OR (XOR) of all bytes in the
message except the checksum itself.
Checksum = [Header] XOR [Monitor ID] XOR …
DATA[0] … XOR DATA[N]
*/

const videoSourceMap = new Map<ProliteVideoSource, number>([
  [ ProliteVideoSource.Component, 0x03 ],
  [ ProliteVideoSource.Composite, 0x01 ],
  [ ProliteVideoSource.DisplayPort, 0x0A ],
  [ ProliteVideoSource.SlotInPC, 0x0B ],
  [ ProliteVideoSource.HDMI1, 0x0D ],
  [ ProliteVideoSource.HDMI2, 0x06 ],
  [ ProliteVideoSource.HDMI3, 0x0F ],
  [ ProliteVideoSource.HDMI4, 0x19 ],
  [ ProliteVideoSource.VGA, 0x05 ],
  [ ProliteVideoSource.DVI, 0x09 ]
])

const reverseVideoSourceMap = new Map<number, ProliteVideoSource>();

export default class ProliteLH42UHSApi implements ProliteApiImplementation {
  // @ts-ignore
  private _host: string;
  // @ts-ignore
  private _port: number;
  private _client?: TClient;
  private _monitorId: number;

  private queue = new Queue({
    concurrent: 1,
    interval: 1
  });

  constructor(host: string, monitorId: number) {
    this._host = host;
    this._port = 5000;
    this._monitorId = monitorId;
    if (reverseVideoSourceMap.size == 0) {
      for (var entry of videoSourceMap) {
        reverseVideoSourceMap.set(entry[1], entry[0]);
      }
    }
  }

  public destroy() {
    this.killClient();
  }

  private killClient() {
    if (this._client) {
      this._client.socket.removeAllListeners();
      this._client.destroy();
      this._client = undefined;
    }
  }

  async connect(): Promise<TClient> {
    if (this._client) {
      return this._client;
    }
    let socket = new net.Socket();
    let client = new PromiseSocket(socket);
    client.setTimeout(1500);
    client.socket.setMaxListeners(16);
    client.socket.addListener('close', () => {
      this.killClient();
    });
    await client.connect(this._port, this._host);
    this._client = client;
    return this._client;
  }
  
  private async write(buffer: Buffer) {
    try {
      // console.log('Prolite Sending', buffer.toString('hex'));  
      var client = await this.connect();
      await client.write(buffer);
    } catch (e: any) {
      this.killClient();
      throw e;
    }
  }

  private async AckNack() {
    var reply = await this.readReply();
    this.checkReply(reply); // throws if a nack
  }

  /**
   * Read from socket until EOL
   * @return {Promise<string>}
   */
  private async read(): Promise<Buffer> {
    try {
      var client = await this.connect();
      // read header
      var header = await client.read(6) as Buffer;
      var msgLength = header[4];
      var body = await client.read(msgLength-1) as Buffer;
      if (!body) {
        throw new ProliteChecksumError();
      }      
      var message = Buffer.concat([header, body]);
      // console.log('received ', message.toString('hex'));  
      return message;
    } catch (e: any) {
      this.killClient();
      throw e;
    }
  }

  private makeMessage(code: number, data: number[] = []): Buffer {
    var header = new Uint8Array(7);
    header [0] = 0xa6;
    header [1] = this._monitorId;
    header [2] = 0;
    header [3] = 0;
    header [4] = 0;
    header [5] = 3 + data.length;
    header [6] = 0x01;

    data.unshift(code);

    var checksum = 0;
    for (var i=0; i < 7; i++) {
      checksum ^= header[i];
    }
    for (var i=0; i < data.length; i++) {
      checksum ^= data[i];
    }
    var dataArray = new Uint8Array(data);
    var checksumArray = new Uint8Array([checksum]);
    return Buffer.concat([header, dataArray, checksumArray]);
  }

  private decodeReply(reply: Buffer): Buffer {
    var length = reply[5] - 3;
    return reply.slice(7, 7+length);
  }

  private async readReply(): Promise<Buffer> {
    var reply = await this.read();
    this.checkReply(reply); // throws if there's an error
    return this.decodeReply(reply);
  }

  private checkReply(reply: Buffer) {
    if (reply[0] !== 0x21) {
      throw ('header is wrong');
    }
    if (reply.length < 8) {
      throw new ProliteChecksumError();
    }
    var msgChecksum = reply[reply.length-1];
    var calcChecksum = 0;
    for (var i=0; i< reply.length-1; i++) {
      calcChecksum ^= reply[i];
    }
    if (msgChecksum !== calcChecksum) {
      throw new ProliteChecksumError();
    }
  }

  public async set(cmd: ProliteApiCommand, value: string | number) {
    await new Promise<void>((resolve, reject) => {
      this.queue.enqueue(async () => {
        try {
          await this.queuedSet(cmd, value);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  public async queuedSet(cmd: ProliteApiCommand, value: string | number) {
    var message = null;
    switch(cmd) {
      case ProliteApiCommand.Power: {
        switch (value) {
          case ProlitePowerState.PowerOff:
            message = this.makeMessage(0x18, [0x01]);
            break;
          default:
            message = this.makeMessage(0x18, [0x02]);
            break;
        }
        break;
      }
      case ProliteApiCommand.VideoSource: {
        var source = videoSourceMap.get(value as ProliteVideoSource);
        if (source !== undefined) {
          var data = [
            source as number,
            0,
            0,
            0
          ];
          message = this.makeMessage(0xAC, data);
        } else {
          throw new ProliteUnsupportedCommandError();
        }
        break;
      }
      default:
        throw new ProliteUnsupportedCommandError()
    }
    await this.write(message);
    await this.AckNack();
  }

  public async get(cmd: ProliteApiCommand): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      this.queue.enqueue(async () => {
        try {
          var result = await this.queuedGet(cmd);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  public async queuedGet(cmd: ProliteApiCommand): Promise<string> {
    var message = null;
    switch(cmd) {
      case ProliteApiCommand.Power: {
        message = this.makeMessage(0x19);
        break;
      }
      case ProliteApiCommand.VideoSource: {
        message = this.makeMessage(0xAD);
        break;
      }
      default:
        throw new ProliteUnsupportedCommandError()
    }
    await this.write(message);
    var reply = await this.readReply();
    switch(cmd) {
      case ProliteApiCommand.Power: {
        if (reply[0] == 0x01) {
          return ProlitePowerState.BacklightOff;
        } else {
          return ProlitePowerState.BacklightOn;
        }
      }
      case ProliteApiCommand.VideoSource: {
        var source = reverseVideoSourceMap.get(reply[0]);
        if (source !== undefined) {
          return source;
        }
        throw new ProliteUnknownResponseError;
      }
    }
  }
} 

