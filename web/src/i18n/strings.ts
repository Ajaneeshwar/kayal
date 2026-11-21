/*
  English source strings for every screen. The Malayalam lives in ml.json and comes from
  sarvam-translate:v1: run `node web/scripts/translate.mjs` on gon after adding or changing a
  string here, then copy ml.json back. Never write Malayalam by hand.

  This file must stay plain data (Node strips the types when the script imports it).
*/
export const en = {
  boatSearch: 'Search boats by name or registration',
  boatMatches: '{count} matching boats',
  noBoatMatches: 'No boat matches',
  tagline: 'Proof of where houseboat waste went',
  pageMissing: 'This page does not exist',
  chooseDoorHelp: 'Go back to the start and choose a door.',
  goHome: 'Go to the start',
  pickBoatFirst: 'Pick your boat first',
  inspectorFirst: 'Sign in as inspector',

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
  loggedDaysAgo: 'Logged {days} days ago',
  loggedDayAgo: 'Logged 1 day ago',

  yourBoat: 'Your boat',
  loadingBoats: 'Loading boats…',
  openCrew: 'Open the crew page',
  pinLabel: 'Inspector PIN',
  signIn: 'Sign in',
  pinWrong: 'That PIN is wrong. Check it and try again.',

  language: 'Language',
  langTitle: 'Choose your language',
  langEnNote: 'Everything in English',
  langMlNote: 'Everything in Malayalam',
  langBothNote: 'English, with Malayalam beside it',
  langLater: 'You can change this at the top of any page.',

  verified: 'Verified',
  declared: 'Declared only',
  overdue: 'Overdue',
  confirmed: 'Confirmed',
  disputed: 'Disputed',
} as const;

export type StringKey = keyof typeof en;
