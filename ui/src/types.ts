/**
 * Domain types mirroring the Go structs in model.go.
 */

export interface Song {
  Path: string;
  Title: string;
  Size: number;
  Artists: string;
  AlbumArtist: string;
  Album: string;
  Genre: string;
  Year: string;
  Track: number;
  Length: number;
  Bitrate: number;
  Samplerate: number;
  Channels: number;
  Lyrics: string;
  Comment: string;
  IsFavourite: boolean;
  PlayCount: number;
}

export interface HistoryEntry extends Song {
  Time: string;
}

export interface Playlist {
  Name: string;
  Type: "LIST" | "QUERY";
  Id: number;
  Description: string;
  Query: string;
  Count: number;
  Tracks?: Song[];
}

export interface Album {
  Path: string;
  Album: string;
  AlbumArtist: string;
  Year: string;
  Songs: number;
}

export interface Artist {
  Artists: string;
}

export interface Folder {
  Path: string;
  Name: string;
  Parent: string;
  Songs: number;
}

/** A paginated API response. `Next` is -1 when there are no more pages. */
export interface Page<T> {
  Data: T[];
  Next: number;
}

export interface SongLyrics {
  Title: string;
  Artists: string;
  Album: string;
  Lyrics: string;
  SyncedLyrics: string;
  Instrumental: number;
}

export interface TrackProps {
  Genre?: string;
  Size?: string;
  Comment?: string;
  Lyrics?: string;
}

/** Repeat modes supported by the player. */
export type RepeatMode = "off" | "all" | "one";

/** A parsed LRC line. */
export interface LyricLine {
  time: number;
  text: string;
}
