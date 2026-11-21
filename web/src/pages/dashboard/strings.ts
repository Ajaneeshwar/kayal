/*
  English source strings for the inspector dashboard. The Malayalam lives in ml.json beside this
  file and comes from sarvam-translate:v1: run on gon
    ssh gon 'cd ~/hackathoni && node web/src/pages/dashboard/translate.mjs'
  then copy ml.json back. Never write Malayalam by hand. Plain data only: Node imports this file.
*/
export const en = {
  boatSearch: 'Search boats by name or registration',
  stateFilter: 'Boat state',
  filterAll: 'All',
  exportCsv: 'Export CSV',
  csvName: 'Name',
  csvRegistration: 'Registration',
  csvState: 'State',
  csvDays: 'Days since counted sewage pump-out',
  csvSewageDate: 'Counted sewage pump-out date',
  csvSewageProof: 'Counted sewage pump-out proof',
  csvSewagePlace: 'Counted sewage pump-out place',
  countedPumpOut: 'Counted sewage pump-out',
  csvSolidDate: 'Last solid date',
  csvSolidProof: 'Solid proof',
  csvSolidPlace: 'Solid place',
  title: 'Inspector dashboard',
  statVerified: 'Boats verified',
  statDeclared: 'Declared only',
  statOverdue: 'Boats overdue',
  statToday: 'Entries today',
  statWeek: 'Entries this week',
  unlinkedReport: 'Unlinked report',
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
  methodTruck: 'Suction truck',
  methodPump: 'Mobile pump',
  methodCollector: 'Waste collector',
  methodBin: 'Waste bin',
  receivedBy: 'Received by',
} as const;

export type DashKey = keyof typeof en;
