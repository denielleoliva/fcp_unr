// Viseme System for Speech Animation
// Based on standard phoneme-to-viseme mapping used in speech animation

// 14 Standard Visemes (Disney/Pixar standard)
export const VISEMES = {
  sil: {
    name: 'Silence',
    phonemes: ['sil'],
    mouthOpen: 0,
    mouthCurve: 0,
    lipRounding: 0,
    jawDrop: 0,
    tongueHeight: 0,
  },
  PP: {
    name: 'P, B, M',
    phonemes: ['p', 'b', 'm'],
    mouthOpen: 0,
    mouthCurve: 0,
    lipRounding: 0,
    jawDrop: 0,
    tongueHeight: 0,
    lipsClosed: true,
  },
  FF: {
    name: 'F, V',
    phonemes: ['f', 'v'],
    mouthOpen: 0.2,
    mouthCurve: 0,
    lipRounding: 0,
    jawDrop: 0.1,
    tongueHeight: 0,
    lowerLipTucked: true,
  },
  TH: {
    name: 'TH',
    phonemes: ['th', 'dh'],
    mouthOpen: 0.3,
    mouthCurve: 0,
    lipRounding: 0,
    jawDrop: 0.2,
    tongueHeight: 0.5,
    tongueVisible: true,
  },
  DD: {
    name: 'T, D, N, L',
    phonemes: ['t', 'd', 'n', 'l', 's', 'z'],
    mouthOpen: 0.25,
    mouthCurve: 0.1,
    lipRounding: 0,
    jawDrop: 0.15,
    tongueHeight: 0.7,
  },
  kk: {
    name: 'K, G, NG',
    phonemes: ['k', 'g', 'ng'],
    mouthOpen: 0.3,
    mouthCurve: 0,
    lipRounding: 0,
    jawDrop: 0.2,
    tongueHeight: 0.3,
  },
  CH: {
    name: 'CH, J, SH',
    phonemes: ['ch', 'jh', 'sh', 'zh'],
    mouthOpen: 0.2,
    mouthCurve: -0.1,
    lipRounding: 0.3,
    jawDrop: 0.15,
    tongueHeight: 0.4,
  },
  SS: {
    name: 'S, Z',
    phonemes: ['s', 'z'],
    mouthOpen: 0.2,
    mouthCurve: 0.2,
    lipRounding: 0,
    jawDrop: 0.1,
    tongueHeight: 0.6,
    teethVisible: true,
  },
  nn: {
    name: 'N, NG',
    phonemes: ['n', 'ng'],
    mouthOpen: 0.3,
    mouthCurve: 0,
    lipRounding: 0,
    jawDrop: 0.2,
    tongueHeight: 0.5,
  },
  RR: {
    name: 'R',
    phonemes: ['r'],
    mouthOpen: 0.3,
    mouthCurve: 0,
    lipRounding: 0.4,
    jawDrop: 0.2,
    tongueHeight: 0.3,
  },
  aa: {
    name: 'AA (father)',
    phonemes: ['aa', 'ao'],
    mouthOpen: 0.8,
    mouthCurve: 0,
    lipRounding: 0.2,
    jawDrop: 0.7,
    tongueHeight: 0,
  },
  E: {
    name: 'E (bed)',
    phonemes: ['eh', 'ae'],
    mouthOpen: 0.5,
    mouthCurve: 0.3,
    lipRounding: 0,
    jawDrop: 0.4,
    tongueHeight: 0.3,
  },
  I: {
    name: 'I (bit)',
    phonemes: ['ih', 'iy'],
    mouthOpen: 0.3,
    mouthCurve: 0.5,
    lipRounding: 0,
    jawDrop: 0.2,
    tongueHeight: 0.5,
  },
  O: {
    name: 'O (boat)',
    phonemes: ['ow', 'oy'],
    mouthOpen: 0.5,
    mouthCurve: 0,
    lipRounding: 0.8,
    jawDrop: 0.4,
    tongueHeight: 0.2,
  },
  U: {
    name: 'U (boot)',
    phonemes: ['uw', 'uh'],
    mouthOpen: 0.4,
    mouthCurve: 0,
    lipRounding: 1.0,
    jawDrop: 0.3,
    tongueHeight: 0.4,
  },
};

// Phoneme to Viseme mapping (CMU Pronouncing Dictionary phonemes)
export const PHONEME_TO_VISEME = {
  // Silence
  'sil': 'sil',
  'sp': 'sil',
  
  // Bilabials (lips together)
  'p': 'PP',
  'b': 'PP',
  'm': 'PP',
  
  // Labiodentals (lip to teeth)
  'f': 'FF',
  'v': 'FF',
  
  // Dental (tongue between teeth)
  'th': 'TH',
  'dh': 'TH',
  
  // Alveolar (tongue to roof)
  't': 'DD',
  'd': 'DD',
  'n': 'nn',
  'l': 'DD',
  's': 'SS',
  'z': 'SS',
  
  // Post-alveolar
  'sh': 'CH',
  'zh': 'CH',
  'ch': 'CH',
  'jh': 'CH',
  
  // Velar (back of tongue)
  'k': 'kk',
  'g': 'kk',
  'ng': 'nn',
  
  // Approximants
  'r': 'RR',
  'w': 'U',
  'y': 'I',
  'hh': 'kk',
  
  // Vowels - Open
  'aa': 'aa',  // father
  'ao': 'aa',  // bought
  'aw': 'aa',  // down
  
  // Vowels - Mid
  'eh': 'E',   // bed
  'ae': 'E',   // bat
  'ah': 'E',   // but
  'er': 'RR',  // bird
  'ax': 'E',   // about
  
  // Vowels - Close
  'ih': 'I',   // bit
  'iy': 'I',   // beat
  'ey': 'E',   // bait
  
  // Vowels - Rounded
  'ow': 'O',   // boat
  'oy': 'O',   // boy
  'uh': 'U',   // book
  'uw': 'U',   // boot
};

// Simple English phoneme guesser (for when TTS doesn't provide phonemes)
export const WORD_TO_PHONEMES = {
  // Common words
  'hello': ['hh', 'eh', 'l', 'ow'],
  'hi': ['hh', 'ay'],
  'the': ['dh', 'ah'],
  'a': ['ah'],
  'and': ['ah', 'n', 'd'],
  'is': ['ih', 'z'],
  'are': ['aa', 'r'],
  'you': ['y', 'uw'],
  'i': ['ay'],
  'me': ['m', 'iy'],
  'my': ['m', 'ay'],
  'we': ['w', 'iy'],
  'he': ['hh', 'iy'],
  'she': ['sh', 'iy'],
  'it': ['ih', 't'],
  'this': ['dh', 'ih', 's'],
  'that': ['dh', 'ae', 't'],
  'what': ['w', 'ah', 't'],
  'how': ['hh', 'aw'],
  'where': ['w', 'eh', 'r'],
  'when': ['w', 'eh', 'n'],
  'who': ['hh', 'uw'],
  'yes': ['y', 'eh', 's'],
  'no': ['n', 'ow'],
  'not': ['n', 'aa', 't'],
  'can': ['k', 'ae', 'n'],
  'will': ['w', 'ih', 'l'],
  'would': ['w', 'uh', 'd'],
  'should': ['sh', 'uh', 'd'],
  'could': ['k', 'uh', 'd'],
  'good': ['g', 'uh', 'd'],
  'bad': ['b', 'ae', 'd'],
  'happy': ['hh', 'ae', 'p', 'iy'],
  'sad': ['s', 'ae', 'd'],
  'love': ['l', 'ah', 'v'],
  'like': ['l', 'ay', 'k'],
  'want': ['w', 'aa', 'n', 't'],
  'need': ['n', 'iy', 'd'],
  'thank': ['th', 'ae', 'ng', 'k'],
  'please': ['p', 'l', 'iy', 'z'],
  'sorry': ['s', 'aa', 'r', 'iy'],
};

// Simple rule-based phoneme guesser for unknown words
export function guessPhonemes(word) {
  word = word.toLowerCase().trim();
  
  // Check lookup table first
  if (WORD_TO_PHONEMES[word]) {
    return WORD_TO_PHONEMES[word];
  }
  
  // Simple heuristic rules (very basic, not accurate)
  const phonemes = [];
  const letters = word.split('');
  
  for (let i = 0; i < letters.length; i++) {
    const char = letters[i];
    const next = letters[i + 1];
    
    // Consonants
    if (char === 'p') phonemes.push('p');
    else if (char === 'b') phonemes.push('b');
    else if (char === 'm') phonemes.push('m');
    else if (char === 'f') phonemes.push('f');
    else if (char === 'v') phonemes.push('v');
    else if (char === 't' && next !== 'h') phonemes.push('t');
    else if (char === 'd') phonemes.push('d');
    else if (char === 'n' && next !== 'g') phonemes.push('n');
    else if (char === 'l') phonemes.push('l');
    else if (char === 's' && next !== 'h') phonemes.push('s');
    else if (char === 'z') phonemes.push('z');
    else if (char === 'k') phonemes.push('k');
    else if (char === 'g' && next !== 'h') phonemes.push('g');
    else if (char === 'r') phonemes.push('r');
    else if (char === 'w') phonemes.push('w');
    else if (char === 'y') phonemes.push('y');
    else if (char === 'h') phonemes.push('hh');
    
    // Digraphs
    else if (char === 't' && next === 'h') { phonemes.push('th'); i++; }
    else if (char === 's' && next === 'h') { phonemes.push('sh'); i++; }
    else if (char === 'c' && next === 'h') { phonemes.push('ch'); i++; }
    else if (char === 'n' && next === 'g') { phonemes.push('ng'); i++; }
    
    // Vowels (very simplified)
    else if (char === 'a') phonemes.push('ae');
    else if (char === 'e') phonemes.push('eh');
    else if (char === 'i') phonemes.push('ih');
    else if (char === 'o') phonemes.push('ow');
    else if (char === 'u') phonemes.push('uh');
  }
  
  return phonemes.length > 0 ? phonemes : ['sil'];
}

// Convert phonemes to viseme sequence with timing
export function phonemesToVisemes(phonemes, duration) {
  const visemeSequence = [];
  const phonemeDuration = duration / phonemes.length;
  
  phonemes.forEach((phoneme, index) => {
    const visemeKey = PHONEME_TO_VISEME[phoneme] || 'sil';
    const viseme = VISEMES[visemeKey];
    
    visemeSequence.push({
      viseme: visemeKey,
      params: viseme,
      startTime: index * phonemeDuration,
      endTime: (index + 1) * phonemeDuration,
      phoneme: phoneme,
    });
  });
  
  return visemeSequence;
}

// Parse text into words and generate viseme timeline
export function textToVisemes(text, wordsPerSecond = 2.5) {
  const words = text.toLowerCase().match(/\b[\w']+\b/g) || [];
  const totalDuration = words.length / wordsPerSecond;
  
  const allPhonemes = [];
  words.forEach(word => {
    const phonemes = guessPhonemes(word);
    allPhonemes.push(...phonemes);
    allPhonemes.push('sp'); // Short pause between words
  });
  
  return phonemesToVisemes(allPhonemes, totalDuration);
}

// Interpolate between two visemes (for smooth transitions)
export function interpolateVisemes(viseme1, viseme2, t) {
  const v1 = VISEMES[viseme1];
  const v2 = VISEMES[viseme2];
  
  return {
    mouthOpen: v1.mouthOpen + (v2.mouthOpen - v1.mouthOpen) * t,
    mouthCurve: v1.mouthCurve + (v2.mouthCurve - v1.mouthCurve) * t,
    lipRounding: (v1.lipRounding || 0) + ((v2.lipRounding || 0) - (v1.lipRounding || 0)) * t,
    jawDrop: (v1.jawDrop || 0) + ((v2.jawDrop || 0) - (v1.jawDrop || 0)) * t,
  };
}