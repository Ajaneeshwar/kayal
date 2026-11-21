/*
  English source strings for every screen. The Malayalam lives in ml.json and comes from
  sarvam-translate:v1: run `node web/scripts/translate.mjs` on gon after adding or changing a
  string here, then copy ml.json back. Never write Malayalam by hand.

  This file must stay plain data (Node strips the types when the script imports it).
*/
export const en = {
  tagline: 'Proof of where houseboat waste went',

  howTitle: 'How it works',
  sayTitle: 'Say it',
  sayBody: 'The crew says in Malayalam which waste they handed over, and where.',
  proveTitle: 'Prove it',
  proveBody: 'The phone’s location and a photo of the receipt back up the entry.',
  showTitle: 'Show it',
  showBody: 'Tourists and inspectors see the boat’s record, with a seal anyone can read.',

  signinTitle: 'Choose your door',
  crewTitle: 'Crew',
  crewBody: 'Log a waste handover by voice for your boat.',
  inspectorTitle: 'Inspector',
  inspectorBody: 'See every boat on one map, most overdue first.',
  guestTitle: 'Guest',
  guestBody: 'See any boat’s public record. No sign-in needed.',

  yourBoat: 'Your boat',
  openCrew: 'Open the crew page',
  pinLabel: 'Inspector PIN',
  signIn: 'Sign in',
  pinWrong: 'That PIN is wrong. Check it and try again.',

  verified: 'Verified',
  declared: 'Declared only',
  overdue: 'Overdue',
} as const;

export type StringKey = keyof typeof en;
