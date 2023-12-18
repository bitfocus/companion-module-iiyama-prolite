import { Regex, type SomeCompanionConfigField } from '@companion-module/base'
import { ProliteProtocol } from './prolite-api/protocol'

export interface IiyamaProliteConfig {
	host: string
	mac: string
	port: number
	protocol: ProliteProtocol
	monitorId: number
}

const REGEX_MAC: string = '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$'

export function getConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'IP Address',
			width: 6,
			regex: Regex.IP,
		},
		{
			type: 'static-text',
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
			regex: REGEX_MAC,
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
