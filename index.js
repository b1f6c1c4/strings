require('json5/lib/register');
const path = require('path');
const data = require(path.join(__dirname, 'data.json5'));
const note_parser = require('note-parser');
const readline = require('readline/promises');

function getToverTau(len, freq) {
  // Standing wave frequency formula:
  // f = 1/(2L) * sqrt(T/tau)
  // T/tau = (2fL)^{2}
  return 2 * Math.log(2 * len * freq);
}

const results = [];
for (const instrument in data) {
  const item = data[instrument];
  const notes = item.notes.map((s) => note_parser.parse(s, false, 442));
  for (const size in item.len) {
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      results.push({
        instrument,
        size,
        note: note.pc,
        freq: note.freq,
        len: item.len[size],
        value: getToverTau(item.len[size], note.freq),
      });
    }
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const run_default = async () => {
  const instrument = await rl.question(`What instrument [${Object.keys(data).join(' ')}]? `);
  const item = data[instrument.trim().toLowerCase()];
  if (!item) {
    console.log('Sorry, I don\'t know this instrument');
    return false;
  }
  const size = await rl.question(`What size [${Object.keys(item.len).join(' ')}]? `);
  const len = item.len[size];
  if (!len) {
    console.log('Sorry, I don\'t know this size');
    return false;
  }
  const note_s = await rl.question('What note do you want to play on the desired open string [C#3, Gb4, etc.]? ');
  const note = note_parser.parse(note_s, false, 442);
  if (!note.freq) {
    console.log('Sorry, I don\'t understand this note');
    return false;
  }
  const value = getToverTau(len, note.freq);
  const list = results.map((r) => ({ ...r, diff: Math.abs(r.value - value) }));
  list.sort((a, b) => a.diff - b.diff);
  console.log('Best matches:');
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (s.diff > Math.log(3.5))
      break;
    const smaller = s.len < len;
    const terr = `${s.value > value ? '+' : '-'}${Math.round((Math.exp(s.diff) - 1) * 100)}% error`;
    const lerr = `${Math.round((s.len / len - 1) * 100)}% error`;
    console.log(`${smaller ? '!' : ' '} ${s.size} ${s.instrument} ${s.note} string\t(tension: ${terr}) (length: ${lerr})`);
  }
  rl.close();
};

run_default();
