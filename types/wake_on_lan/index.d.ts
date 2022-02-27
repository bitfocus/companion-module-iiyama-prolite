type WakeCallback = (err: any) => void;

interface WakeOptions {
  address?: string; //	The destination address
  num_packets?: number; //	The number of packets to send
  interval?: number; //	The interval between packets in milliseconds
  port?: number; //	The destination port to send to
}

export function wake(mac: string, options?: WakeOptions, cb?: WakeCallback ): void;