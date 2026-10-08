import bbuBoys from './bbu_boys.json';
import bbuGirls from './bbu_girls.json';
import tbuBoys from './tbu_boys.json';
import tbuGirls from './tbu_girls.json';
import bbpbBoys from './bbpb_boys.json';
import bbpbGirls from './bbpb_girls.json';
import bbtbBoys from './bbtb_boys.json';
import bbtbGirls from './bbtb_girls.json';
import lkBoys from './lk_boys.json';
import lkGirls from './lk_girls.json';

export type ZScoreTable = Record<string, {
  '-3': number;
  '-2': number;
  '-1': number;
  '0': number;
  '1': number;
  '2': number;
  '3': number;
}>;

export const zscoreData = {
  bbu: { L: bbuBoys as ZScoreTable, P: bbuGirls as ZScoreTable },
  tbu: { L: tbuBoys as ZScoreTable, P: tbuGirls as ZScoreTable },
  bbpb: { L: bbpbBoys as ZScoreTable, P: bbpbGirls as ZScoreTable },
  bbtb: { L: bbtbBoys as ZScoreTable, P: bbtbGirls as ZScoreTable },
  lk: { L: lkBoys as ZScoreTable, P: lkGirls as ZScoreTable },
};
