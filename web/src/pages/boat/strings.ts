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
  sentenceDeclared: 'The crew says they emptied the sewage tank, but nothing confirms where the waste went.',
  sentenceOverdue: 'This boat has not logged emptying its sewage tank in the last 90 days.',

  lastEmptied: 'Sewage last emptied',
  where: 'Where',
  proof: 'Proof',
  daysLeft: 'Days left before overdue',

  logTitle: 'Waste log',
  kindSewage: 'Sewage tank emptied',
  kindSolid: 'Solid waste handed over',
  kindOil: 'Used engine oil handed over',
  levelReceipt: 'Receipt',
  levelLocation: 'Location',
  levelDeclared: 'Declared',
  corrected: 'Quantity corrected',
  receiptPhoto: 'Receipt photo',

  chainOk: 'Record intact',
  chainBroken: 'Record altered',

  reportTitle: 'Report dumping',
  reportPrompt: 'Did you see waste going into the water?',
  sendReport: 'Send report',
  reportSent: 'Report sent',

  howToRead: 'How to read the seal',
  notFound: 'Boat not found',
  goHome: 'Go to the start',
} as const;

export type BoatStringKey = keyof typeof en;
