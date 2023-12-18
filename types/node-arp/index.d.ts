type GetMacCallback = (err: any, mac: string) => void

export function getMAC(ip: string, cb: GetMacCallback): void
