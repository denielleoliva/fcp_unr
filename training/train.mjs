import fs from 'node:fs';
import path from 'node:path';
import { trainFeatureModel } from '../src/vizij/featureModel.mjs';
const [input, output = 'training/output'] = process.argv.slice(2);
if (!input) { console.error('Usage: node training/train.mjs annotations.json [output-directory]'); process.exit(1); }
try {
  const {model,report} = trainFeatureModel(JSON.parse(fs.readFileSync(input,'utf8')));
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'feature-model.json'),JSON.stringify(model,null,2)+'\n');
  fs.writeFileSync(path.join(output,'metrics.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} catch(error) { console.error(error.message); process.exitCode=1; }
