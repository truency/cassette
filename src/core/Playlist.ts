import * as EventEmitter from 'events';
import { knuthShuffle } from 'knuth-shuffle';

import { IService } from '../interfaces/IService';
import Client from './Client';
import Song from './Song';

export default class Playlist extends EventEmitter {
  public client: Client;

  public songs: Song[] = [];
  public loop: boolean = false;
  public autoplay: boolean = false;

  protected _pos: number = 0;
  protected _playing: boolean = false;

  constructor(client: Client) {
    super();
    this.client = client;
  }

  get length() {
    return this.songs.length;
  }

  get pos() {
    return this._pos + 1;
  }

  get current() {
    return this.songs[this._pos];
  }

  get playing() {
    return this._playing;
  }

  public reset() {
    this.songs = [];
    this._pos = 0;
    this.emit('reset');
  }

  public hasPrev() {
    return this._pos > 0;
  }

  public prev() {
    if (this.hasPrev()) {
      this._pos -= 1;
      this.emit('prev');
      return true;
    }

    if (this.loop) {
      this._pos = this.songs.length - 1;
      this.emit('prev');
      return true;
    }

    return false;
  }

  public hasNext() {
    return this._pos < this.songs.length - 1;
  }

  public async next() {
    if (this.hasNext()) {
      this._pos += 1;
      this.emit('next');
      return true;
    }

    if (this.loop) {
      this._pos = 0;
      this.emit('next');
      return true;
    }

    if (this.autoplay) {
      const next = await this.current.nextRecommended();
      if (next) {
        this.songs.push(next);
        this._pos += 1;
        this.emit('next');
        return true;
      }
    }

    return false;
  }

  public shuffle() {
    this.songs = knuthShuffle(this.songs);
    this._pos = 0;
    this.emit('shuffle');
  }

  public async add(content: string, position = Infinity) {
    const added: Song[] = [];

    for (const service of this.client.services) {
      const fetchable = service.fetchable(content);
      added.push(...(await service.fetch(fetchable)));
    }

    this.songs.splice(position, 0, ...added);
    this.emit('add', added);
    return added;
  }
}