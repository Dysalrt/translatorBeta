import lex from "./lex.json" with {type: 'json'};

class TranslatorEngine {
    constructor(lexicon) {
        this.lexicon = lexicon;
    }

    // Identifies if a word is a verb and gets the base (handles "to " prefix)
    findVerbBase(words) {
        for (let word of words) {
            if (this.lexicon[word]) return { key: word, val: this.lexicon[word] };
            if (this.lexicon["to " + word]) return { key: "to " + word, val: this.lexicon["to " + word] };
        }
        return null;
    }

    conjugate(verbBase, tense, continuous) {
        const isType1 = /[aeiou]$/.test(verbBase);
        const suffixes = {
            present: { t1: "de", t2: "e" },
            past: { t1: "da", t2: "a" },
            future: { t1: "do", t2: "o" }
        };

        let conj = verbBase + (isType1 ? suffixes[tense].t1 : suffixes[tense].t2);
        return continuous ? `ca${conj}` : conj;
    }

    translate(englishSentence) {
        const text = englishSentence.toLowerCase().replace(/[.,]/g, "");
        const words = text.split(/\s+/);
        
        // Detection Logic
        const isNegated = text.includes("not");
        const isContinuous = /ing|am|is|are/.test(text);
        const tense = text.includes("will") ? "future" : 
                      /was|were|ed/.test(text) ? "past" : "present";

        // Map components
        const subject = this.lexicon[words[0]] || words[0];
        const verbData = this.findVerbBase(words.slice(1));
        
        if (!verbData) return subject;

        let verbPart = this.conjugate(verbData.val, tense, isContinuous);
        if (isNegated) verbPart = `nor ${verbPart}`;

        // Assemble SVO or SV
        let sentence = `${subject} ${verbPart}`;
        const objIndex = words.indexOf(verbData.key.replace("to ", "")) + 1;
        if (words[objIndex] && this.lexicon[words[objIndex]]) {
            sentence += ` ih ${this.lexicon[words[objIndex]]}`;
        }

        return sentence;
    }
}

// UI Handling
const engine = new TranslatorEngine(lex);
const inp = document.getElementById("en-input");
const outp = document.getElementById("translation");

inp.addEventListener("input", () => {
    outp.value = engine.translate(inp.value);
});
