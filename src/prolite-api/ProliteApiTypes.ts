export enum ProliteApiCommand {
	Power = '0',
	Treble = '1',
	Bass = '2',
	Balance = '3',
	Contrast = '4',
	Brightness = '5',
	Sharpness = '6',
	SoundMode = '7',
	Volume = '8',
	Mute = '9',
	VideoSource = ':',
	AspectRatio = ';',
	Language = '<',
	PictureMode = '=',
	Hue = '>',
	Backlight = '?',
	ColorTemp = '@',
	RemoteControl = 'B',
	Speaker = 'C',
}

/**
 * Enum for monitor power state.
 * Can only set PowerOn via serial port.
 * Can only get PowerOff via serial port.
 * If PowerOff, LAN control will time out
 * @readonly
 * @enum {string}
 */
export enum ProlitePowerState {
	BacklightOff = '000',
	BacklightOn = '001',
	PowerOff = '002',
	PowerOn = '003', // only supported via serial comms
}

export enum ProliteSoundMode {
	Movie = '000',
	Standard = '001',
	Custom = '002',
	Classroom = '003',
	Meeting = '004',
}

export enum ProliteOnOff {
	Off = '000',
	On = '001',
}

export enum ProliteVideoSource {
	VGA = '000',
	VGA2 = '031',
	VGA3 = '032',
	HDMI1 = '001',
	HDMI2 = '002',
	HDMI3 = '021',
	HDMI4 = '022',
	Composite = '003',
	ATV = '051',
	Android = '101',
	SlotInPC = '103',
	DisplayPort = '007',
	AndroidPlus = '102',
	C1 = '104',
	C2 = '105',
	DTV = '106',
	Component = '107',
	DVI = '108',
}

export enum ProliteAspectRatio {
	SixteenNine = '000',
	FourThree = '001',
	PTP = '002',
}

export enum ProlitePictureMode {
	Standard = '000',
	Bright = '000',
	Soft = '000',
	Customer = '000',
}

export enum ProliteColorTemp {
	Cool = '000',
	Standard = '001',
	Warm = '002',
}

export enum ProliteRemoteControl {
	Enable = '000',
	Disable = '001',
}
