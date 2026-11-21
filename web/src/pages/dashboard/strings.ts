/*
  English source strings for the inspector dashboard. The Malayalam lives in ml.json beside this
  file and comes from sarvam-translate:v1: run on gon
    ssh gon 'cd ~/hackathoni && node web/src/pages/dashboard/translate.mjs'
  then copy ml.json back. Never write Malayalam by hand. Plain data only: Node imports this file.
*/
export const en = {
  title: 'Inspector dashboard',
  statVerified: 'Boats verified',
  statDeclared: 'Declared only',
  statOverdue: 'Boats overdue',
  statToday: 'Entries today',
  statReports: 'Open reports',
  mapTitle: 'Collection points and recent entries',
  boatsTitle: 'Boats, longest wait first',
  feedTitle: 'Live log',
  pointsTitle: 'Collection points',
  reportsTitle: 'Tourist reports',
  addBoat: 'Add boat',
  addPoint: 'Add collection point',
  qrCodes: 'QR codes',
  open: 'Open now',
  closed: 'Closed now',
  chainOk: 'Chain intact',
  chainBroken: 'Chain broken',
  crewLink: 'Crew link',
  publicRecord: 'Public record',
  signOut: 'Sign out',
} as const;

export type DashKey = keyof typeof en;
