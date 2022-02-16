import { Socket } from 'net';
import { PromiseSocket } from 'promise-socket';

export type TClient = PromiseSocket<Socket>;

