/** Shared contract between the Game House shell and every mini-game. */

export type RoomId = 'bedroom' | 'living-room' | 'kitchen' | 'bathroom' | 'yard';

/** Named launch spots on the house map (see src/map/layout.ts). */
export type SpotId =
  | 'bed'
  | 'bedroom-wardrobe'
  | 'living-floor'
  | 'living-windows'
  | 'street-door'
  | 'fps-wall'
  | 'bunny-wall'
  | 'kitchen-cabinets'
  | 'kitchen-counter'
  | 'bathroom-floor'
  | 'turtle-pool';

export interface GameProps {
  /** Return to the house map. Every game must show a visible way to call this (use <ExitButton>). */
  onExit: () => void;
}

export interface GameMeta {
  id: string;
  title: string;
  room: RoomId;
  spot: SpotId;
  /** One line shown on the map's room card. */
  blurb: string;
  /** 'coming-soon' shows a placeholder card; flip to 'ready' when the game is playable. */
  status: 'ready' | 'coming-soon';
}
