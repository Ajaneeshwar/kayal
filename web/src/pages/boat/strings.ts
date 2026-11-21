/*
  English source strings for the boat record page. The Malayalam lives in ./ml.json and comes from
  sarvam-translate:v1. After adding or changing a string, deploy, then on the laptop run:
    ssh gon 'cd ~/hackathoni && node web/src/pages/boat/translate.mjs'
    scp gon:hackathoni/web/src/pages/boat/ml.json web/src/pages/boat/
  Never write Malayalam by hand. This file must stay plain data (Node strips the types).
*/
export const en = {
  recordLabel: 'Public waste record',
  registration: 'Registration',

  sealVerified: 'Verified',
  sealDeclared: 'Declared only',
  sealOverdue: 'Overdue',
  sentenceVerified: 'This boat emptied its sewage tank at a treatment plant, and the crew’s phone was there when they logged it.',
  sentenceVerifiedSlip: 'This boat handed its sewage to a truck or pump, and a photo of the operator’s slip or number plate backs it up.',
  sentenceDeclared: 'The crew says they emptied the sewage tank, but nothing confirms where the waste went.',
  sentenceOverdue: 'This boat has not logged emptying its sewage tank in the last 90 days.',

  lastEmptied: 'Sewage last emptied',
  where: 'Where',
  proof: 'Proof',
  daysLeft: 'Days left before overdue',
  overdueBy: 'Overdue by',
  lastEntryProof: 'Proof of last sewage entry',
  daysOverdue: '{days} days overdue',
  emptyEvery: 'Must empty every {days} days',

  logTitle: 'Waste log',
  kindSewage: 'Sewage tank emptied',
  kindSolid: 'Solid waste handed over',
  kindOil: 'Used engine oil handed over',
  levelReceipt: 'Receipt',
  levelLocation: 'Location',
  levelDeclared: 'Declared',
  corrected: 'Quantity corrected',
  receiptPhoto: 'Receipt photo',

  methodPoint: 'Collection point',
  methodTruck: 'Suction truck',
  methodPump: 'Mobile pump',
  methodCollector: 'Waste collector',
  methodBin: 'Waste bin',
  vehicle: 'Vehicle',
  receivedBy: 'Received by',
  reasonNoFixedPoint: 'Handed over away from a plant, so the phone’s location cannot confirm it. No photo of a slip or number plate backs it up.',
  reasonHandoverSlip: 'A photo of the operator’s slip or the vehicle’s number plate backs this handover.',
  reasonWasteBin: 'Put in a public waste bin. Nobody receives it there, so it stays Declared.',
  legendTruckTitle: 'Handed to a truck, pump or collector',
  legendTruckBody: 'Some boats hand their waste to a septic truck on the shore, a pump boat or a waste collector instead of a plant. Such an entry stays Declared until a photo of the operator’s slip or the vehicle’s number plate backs it up. Then it counts as Receipt.',

  chainOk: 'Record intact',
  chainBroken: 'Record altered',
  boatChainIntact: 'This boat’s {count} entries are sealed and intact. Each entry is sealed to the one before it so old entries cannot be quietly changed.',
  share: 'Share',
  linkCopied: 'Link copied',
  shareFailed: 'Could not share the link. Copy the address from your browser.',
  sealHelp: 'What does this mean?',

  reportTitle: 'Report dumping',
  reportPrompt: 'Did you see waste going into the water?',
  sendReport: 'Send report',
  reportSent: 'Report sent',

  howToRead: 'How to read the seal',
  notFound: 'Boat not found',
  goHome: 'Go to the start',
} as const;

export type BoatStringKey = keyof typeof en;
