import { TClient } from '../client'
import net from 'net'
import { PromiseSocket } from 'promise-socket'
import { ProliteApiImplementation } from '../prolite'
import { ProliteApiCommand } from '../ProliteApiTypes'
import { ProliteNackError, ProliteChecksumError } from './errors'
import Queue from 'queue-promise'

const ProliteApiHeader = ':01'
const ProliteAPIAckNackHeader = '401'
const EOL = '\r'
const ACK = '+'
const NACK = '-'

enum ProliteDirection {
	Get = 'G',
	Set = 'S',
}

export default class ProliteTE04Api implements ProliteApiImplementation {
	// @ts-ignore
	private _host: string
	// @ts-ignore
	private _port: number
	private _client?: TClient

	private queue = new Queue({
		concurrent: 1,
		interval: 1,
	})

	constructor(host: string) {
		this._host = host
		this._port = 4664
	}

	public destroy() {
		this.killClient()
	}

	private killClient() {
		if (this._client) {
			this._client.destroy()
			this._client = undefined
		}
	}

	async connect(): Promise<TClient> {
		if (this._client) {
			return this._client
		}
		let socket = new net.Socket()
		let client = new PromiseSocket(socket)
		client.setTimeout(1500)
		client.socket.once('close', () => {
			this.killClient()
		})
		client.setEncoding('ascii')
		await client.connect(this._port, this._host)
		this._client = client
		return this._client
	}

	private async write(message: string) {
		try {
			var buffer = Buffer.from(message)
			//      console.log('Prolite Sending', buffer.toString('hex'));
			var client = await this.connect()
			await client.write(buffer)
		} catch (e) {
			this.killClient()
			throw e
		}
	}

	private async AckNack() {
		await this.readReply() // throws if a nack
	}

	/**
	 * Read from socket until EOL
	 * @return {Promise<string>}
	 */
	private async read(): Promise<string> {
		try {
			var client = await this.connect()
			var message = ''
			var char = ''
			do {
				char = (await client.read(1)) as string // set encoding to ascii so we'll get a string
				message += char
			} while (char !== EOL)
			//      console.log('Prolite Received ', Buffer.from(message).toString('hex'));
			return message
		} catch (e) {
			this.killClient()
			throw e
		}
	}

	private makeMessage(direction: ProliteDirection, cmd: ProliteApiCommand, value?: string | number): string {
		if (typeof value === 'number') {
			value = Math.max(0, Math.min(100, value)).toString()
		}
		if (value === undefined) {
			value = '000'
		}
		return `${ProliteApiHeader}${direction}${cmd}${value}${EOL}`
	}

	private decodeReply(reply: string): string {
		return reply.slice(5, 8)
	}

	private async readReply(): Promise<string> {
		var reply = await this.read()
		this.checkReply(reply) // throws if there's an error
		return this.decodeReply(reply)
	}

	private checkReply(reply: string) {
		if (reply.startsWith(ProliteAPIAckNackHeader)) {
			if (reply.length == 5) {
				var response = reply[3]
				if (response === NACK || response !== ACK) {
					throw new ProliteNackError()
				}
			} else {
				throw new ProliteChecksumError()
			}
		} else {
			// a reply to a get
			if (!reply.endsWith(EOL)) {
				throw 'Missing EOL'
			}
			if (reply.length !== 9) {
				throw new ProliteChecksumError()
			}
		}
	}

	public async set(cmd: ProliteApiCommand, value: string | number) {
		await new Promise<void>((resolve, reject) => {
			this.queue.enqueue(async () => {
				try {
					await this.queuedSet(cmd, value)
					resolve()
				} catch (e) {
					reject(e)
				}
			})
		})
	}

	public async queuedSet(cmd: ProliteApiCommand, value: string | number) {
		let message = this.makeMessage(ProliteDirection.Set, cmd, value)
		await this.write(message)
		await this.AckNack()
	}

	public async get(cmd: ProliteApiCommand): Promise<string> {
		return await new Promise<string>((resolve, reject) => {
			this.queue.enqueue(async () => {
				try {
					var reply = await this.queuedGet(cmd)
					resolve(reply)
				} catch (e) {
					reject(e)
				}
			})
		})
	}

	public async queuedGet(cmd: ProliteApiCommand): Promise<string> {
		let message = this.makeMessage(ProliteDirection.Get, cmd)
		await this.write(message)
		var reply = await this.readReply()
		return reply
	}
}
