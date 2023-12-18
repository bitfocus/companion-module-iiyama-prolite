import arp from 'node-arp'
import { CompanionActions, CompanionFeedbackEvent, SomeCompanionConfigField } from '../types/instance_skel_types'
import InstanceSkel from '../../../instance_skel'
import sleep from './sleep'
import ProliteApi from './prolite-api/prolite'
import { ProliteProtocol } from './prolite-api/protocol'
import { ProliteVideoSource, ProlitePowerState } from './prolite-api/ProliteApiTypes'

interface IiyamaProliteConfig {
	host: string
	mac: string
	port: number
	protocol: ProliteProtocol
	monitorId: number
}

///
class instance extends InstanceSkel<IiyamaProliteConfig> {
	private _api: ProliteApi | null = null

	constructor(system: any, id: any, config: any) {
		super(system, id, config)
		this.setupFeedback()
		this.setActions(this.actions)
	}

	private _videoSubscriptions: Set<string> = new Set<string>()
	private _powerSubscriptions: Set<string> = new Set<string>()

	private addVideoSubscription(value: string) {
		this._videoSubscriptions.add(value)
		this.checkIfShouldBePollingVideo()
	}

	private removeVideoSubscription(value: string) {
		this._videoSubscriptions.delete(value)
		this.checkIfShouldBePollingVideo()
	}

	private checkIfShouldBePollingVideo() {
		this.shouldBePollingVideo = this._videoSubscriptions.size > 0
		if (this.shouldBePollingVideo && !this.isPollingVideo) {
			this.pollVideoSource()
			// it stops by itself
		}
	}

	private addPowerSubscription(value: string) {
		this._powerSubscriptions.add(value)
		this.checkIfShouldBePollingPower()
	}

	private removePowerSubscription(value: string) {
		this._powerSubscriptions.delete(value)
		this.checkIfShouldBePollingPower()
	}

	private checkIfShouldBePollingPower() {
		this.shouldBePollingPower = this._powerSubscriptions.size > 0
		if (this.shouldBePollingPower && !this.isPollingPower) {
			this.pollPowerState()
			// it stops by itself
		}
	}

	private shouldBePollingVideo: boolean = false
	private shouldBePollingPower: boolean = false
	private isPollingVideo: boolean = false
	private isPollingPower: boolean = false
	private activeInput?: ProliteVideoSource
	private powerState?: ProlitePowerState

	private REGEX_MAC: string = '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$'
	/**
	 * Provide a simple return
	 * of the necessary fields for the
	 * instance configuration screen.
	 * @return {object[]}
	 */
	config_fields(): SomeCompanionConfigField[] {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'IP Address',
				width: 6,
				regex: this.REGEX_IP,
			},
			{
				type: 'text',
				id: 'info',
				width: 12,
				label: 'MAC Address (used for Wake on LAN)',
				value:
					"The screen must be connected when you save the config so that the MAC Address will be auto populated from the IP address. If the MAC address does not change that means the screen isn't being seen by the router ARP table. It might be powered off or not connected to the same network segment as you.",
			},
			{
				type: 'textinput',
				id: 'mac',
				label: 'MAC Address',
				width: 8,
				regex: this.REGEX_MAC,
			},
			{
				type: 'dropdown',
				id: 'protocol',
				label: 'Protocol',
				width: 6,
				choices: [
					{
						id: ProliteProtocol.LH42UHS,
						label: 'LHxx42UHS',
					},
					{
						id: ProliteProtocol.TE04,
						label: 'TExx04',
					},
				],
				default: ProliteProtocol.LH42UHS,
			},
		]
	}

	/**
	 * Main initialization function called once the module is
	 * OK to start doing things. Principally, this is when
	 * the module should establish a connection to the device.
	 * @return {void}
	 */
	init(): void {
		try {
			const config = this.config
			if (this._api) {
				this._api.destroy()
			}
			this._api = new ProliteApi(config.host, config.mac, config.protocol)
			this.subscribeFeedbacks()
			this.checkStatus()
		} catch (e) {
			console.log('prolite/error ', e)
		}
	}

	/**
	 * Clean up the instance before it is destroyed.
	 * This is called both on shutdown and when an instance
	 * is disabled or deleted. Destroy any timers and socket
	 * connections here.
	 * @return {void}
	 */
	destroy(): void {
		if (this._api) {
			this._api.destroy()
			this._api = null
		}
	}

	private async checkStatus() {
		while (this._api) {
			try {
				await this._api.getInput()
				this.status(this.STATUS_OK)
			} catch (e) {
				console.log(e)
				this.status(this.STATUS_ERROR, (e as any).message)
			}
			await sleep(2000)
		}
	}

	/**
	 * Poll for video source continuously until there are
	 * no more videoSubscriptions or until the module is destroyed
	 * @return {void}
	 */
	private async pollVideoSource() {
		this.isPollingVideo = true
		try {
			// loop until we don't need to poll any more
			while (this._api && this.shouldBePollingVideo) {
				// check the status via the api
				try {
					let activeInput = await this._api.getInput()
					//          console.log(activeInput);
					this.status(this.STATUS_OK)
					if (activeInput !== this.activeInput) {
						// status changed
						//            console.log('activeInput changed');
						this.activeInput = activeInput
						this.checkFeedbacks('activeInput')
					}
				} catch (e) {
					this.status(this.STATUS_ERROR, (e as any).message)
				}
				await sleep(750)
			}
		} finally {
			this.isPollingVideo = false
		}
	}

	/**
	 * Poll for power status continuously until there are
	 * no more powerSubscriptions or until the module is destroyed
	 * @return {void}
	 */
	private async pollPowerState() {
		this.isPollingPower = true
		try {
			// loop until we don't need to poll any more
			while (this._api && this.shouldBePollingPower) {
				// check the status via the api
				try {
					let powerState = await this._api.getPowerState()
					this.status(this.STATUS_OK)
					if (powerState !== this.powerState) {
						// status changed
						this.powerState = powerState
						this.checkFeedbacks('powerState')
					}
				} catch (e) {
					this.status(this.STATUS_ERROR, (e as any).message)
				}
				await sleep(750)
			}
		} finally {
			this.isPollingPower = false
		}
	}

	/**
	 * When the instance configuration is saved by the user,
	 * this update will fire with the new configuration
	 * @param {BarcoClickShareConfig} config
	 * @return {void}
	 */
	async updateConfig(config: IiyamaProliteConfig): Promise<void> {
		//    console.log('updateConfig', config);
		this.config = config
		if (this._api) {
			this._api.destroy()
		}
		await this.setMacAddressFromNetwork()
		this._api = new ProliteApi(config.host, config.mac, config.protocol)
	}

	getMac(ip: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			arp.getMAC(ip, function (err, macAddress) {
				if (err) {
					reject(err)
				} else {
					resolve(macAddress)
				}
			})
		})
	}

	async setMacAddressFromNetwork(): Promise<void> {
		// Retrieve the corresponding MAC address for a given IP address
		try {
			if (this.config.host) {
				var newMac = await this.getMac(this.config.host)
				if (newMac === '(incomplete)') {
					// router doesn't know the MAC address
					// so don't change the value
					return
				}
				if (newMac !== this.config.mac) {
					this.config.mac = newMac
					this.saveConfig()
				}
			}
		} catch (e) {
			console.log(e)
			// ignore error - device is offline
		}
	}

	setupFeedback() {
		this.setFeedbackDefinitions({
			activeInput: {
				type: 'boolean', // Feedbacks can either a simple boolean, or can be an 'advanced' style change (until recently, all feedbacks were 'advanced')
				label: 'Active Input',
				description: 'Input being displayed on the screen',
				style: {
					// The default style change for a boolean feedback
					// The user will be able to customise these values as well as the fields that will be changed
					color: this.rgb(0, 0, 0),
					bgcolor: this.rgb(255, 0, 0),
				},
				// options is how the user can choose the condition the feedback activates for
				options: [
					{
						id: 'input',
						choices: [
							{ id: ProliteVideoSource.ATV, label: 'Analogue TV' },
							{ id: ProliteVideoSource.Android, label: 'Android' },
							{ id: ProliteVideoSource.AndroidPlus, label: 'Android Plus' },
							{ id: ProliteVideoSource.C1, label: 'C1' },
							{ id: ProliteVideoSource.C2, label: 'C2' },
							{ id: ProliteVideoSource.Component, label: 'Component' },
							{ id: ProliteVideoSource.Composite, label: 'Composite' },
							{ id: ProliteVideoSource.DTV, label: 'Digital TV' },
							{ id: ProliteVideoSource.DisplayPort, label: 'Display Port' },
							{ id: ProliteVideoSource.HDMI1, label: 'HDMI 1' },
							{ id: ProliteVideoSource.HDMI2, label: 'HDMI 2' },
							{ id: ProliteVideoSource.HDMI3, label: 'HDMI 3' },
							{ id: ProliteVideoSource.HDMI4, label: 'HDMI 4' },
							{ id: ProliteVideoSource.SlotInPC, label: 'Slot In PC' },
							{ id: ProliteVideoSource.VGA, label: 'VGA' },
							{ id: ProliteVideoSource.VGA, label: 'VGA 2' },
							{ id: ProliteVideoSource.VGA, label: 'VGA 3' },
						],
						type: 'dropdown',
						label: 'Input',
						default: 'HDMI',
					},
				],
				callback: (feedback: CompanionFeedbackEvent): boolean => {
					// This callback will be called whenever companion wants to check if this feedback is 'active' and should affect the button style
					return this.activeInput == feedback.options['input']?.valueOf()
				},
				subscribe: (feedback: CompanionFeedbackEvent) => {
					this.addVideoSubscription(feedback.id)
				},
				unsubscribe: (feedback: CompanionFeedbackEvent) => {
					this.removeVideoSubscription(feedback.id)
				},
			},
			powerState: {
				type: 'boolean', // Feedbacks can either a simple boolean, or can be an 'advanced' style change (until recently, all feedbacks were 'advanced')
				label: 'Power State',
				description: 'Power state of the screen',
				style: {
					// The default style change for a boolean feedback
					// The user will be able to customise these values as well as the fields that will be changed
					color: this.rgb(0, 0, 0),
					bgcolor: this.rgb(255, 0, 0),
				},
				// options is how the user can choose the condition the feedback activates for
				options: [
					{
						id: 'input',
						choices: [
							// you'll never get a power off state
							// as in this case the monitor won't be responding!
							{
								id: 'BacklightOn',
								label: 'Backlight On',
							},
							{
								id: 'BacklightOff',
								label: 'Backlight Off',
							},
						],
						type: 'dropdown',
						label: 'Input',
						default: 'BacklightOn',
					},
				],
				callback: (feedback: CompanionFeedbackEvent): boolean => {
					// This callback will be called whenever companion wants to check if this feedback is 'active' and should affect the button style
					return this.powerState == feedback.options['input']?.valueOf()
				},
				subscribe: (feedback: CompanionFeedbackEvent) => {
					this.addPowerSubscription(feedback.id)
				},
				unsubscribe: (feedback: CompanionFeedbackEvent) => {
					this.removePowerSubscription(feedback.id)
				},
			},
		})
	}

	get actions(): CompanionActions {
		return {
			changeInput: {
				label: 'Change Input',
				options: [
					{
						id: 'input',
						type: 'dropdown',
						label: 'Input',
						choices: [
							{ id: ProliteVideoSource.ATV, label: 'Analogue TV' },
							{ id: ProliteVideoSource.Android, label: 'Android' },
							{ id: ProliteVideoSource.AndroidPlus, label: 'Android Plus' },
							{ id: ProliteVideoSource.C1, label: 'C1' },
							{ id: ProliteVideoSource.C2, label: 'C2' },
							{ id: ProliteVideoSource.Component, label: 'Component' },
							{ id: ProliteVideoSource.Composite, label: 'Composite' },
							{ id: ProliteVideoSource.DTV, label: 'Digital TV' },
							{ id: ProliteVideoSource.DisplayPort, label: 'Display Port' },
							{ id: ProliteVideoSource.HDMI1, label: 'HDMI 1' },
							{ id: ProliteVideoSource.HDMI2, label: 'HDMI 2' },
							{ id: ProliteVideoSource.HDMI3, label: 'HDMI 3' },
							{ id: ProliteVideoSource.HDMI4, label: 'HDMI 4' },
							{ id: ProliteVideoSource.SlotInPC, label: 'Slot In PC' },
							{ id: ProliteVideoSource.VGA, label: 'VGA' },
							{ id: ProliteVideoSource.VGA, label: 'VGA 2' },
							{ id: ProliteVideoSource.VGA, label: 'VGA 3' },
						],
						default: ProliteVideoSource.HDMI1,
					},
				],
				callback: async ({ options }: { options: any }) => await this._api?.setInput(options.input),
			},
			power: {
				label: 'Set Power State',
				options: [
					{
						id: 'state',
						type: 'dropdown',
						label: 'State',
						choices: [
							{ id: ProlitePowerState.BacklightOn, label: 'Backlight On' },
							{ id: ProlitePowerState.BacklightOff, label: 'Backlight Off' },
							{ id: ProlitePowerState.PowerOn, label: 'Power On' },
							{ id: ProlitePowerState.PowerOff, label: 'Power Off' },
						],
						default: ProlitePowerState.BacklightOn,
					},
				],
				callback: async ({ options }: { options: any }) => await this._api?.setPowerState(options.state),
			},
			mute: {
				label: 'Mute/Unmute',
				options: [
					{
						id: 'mute',
						type: 'checkbox',
						label: 'Muted',
						default: false,
					},
				],
				callback: async ({ options }: { options: any }) => await this._api?.setMute(options.mute),
			},
			wakeOnLan: {
				label: 'Wake On LAN',
				options: [],
				callback: async () => await this._api?.wakeOnLan(),
			},
		}
	}
}

exports = module.exports = instance
