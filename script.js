import lex from "./lex.json" with {type: 'json'};

class Translator {
    constructor(lexicon) {
        this.lexicon = lexicon;
    }

    // 1. ANALYZER: Breaks the sentence down into grammatical components
    analyze(sentence) {
        const tokens = sentence.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/);
        
        let analysis = {
            subject: null,
            verb: null,
            object: null,
            tense: "present",
            continuous: false,
            negated: false
        };

        // Determine Tense/Aspect
        if (tokens.includes("will")) analysis.tense = "future";
        else if (tokens.includes("was") || tokens.includes("were") || tokens.includes("ed")) analysis.tense = "past";
        
        if (tokens.some(t => t.includes("ing") || t === "am" || t === "is" || t === "are")) analysis.continuous = true;
        if (tokens.includes("not")) analysis.negated = true;

        // Extract S, V, O based on position/mapping
        // This is where we handle "I am teacher" vs "I learn English"
        analysis.subject = this.lexicon[tokens[0]] || tokens[0];
        
        // Find verb in lexicon
        for (let i = 1; i < tokens.length; i++) {
            if (this.lexicon["to " + tokens[i]]) {
                analysis.verb = { raw: tokens[i], translated: this.lexicon["to " + tokens[i]] };
                analysis.object = this.lexicon[tokens[i + 1]] || tokens[i + 1];
                break;
            }
        }
        
        // Handle cases like "I am teacher" (Subject + To Be + Complement)
        if (!analysis.verb && tokens.includes("am")) {
            analysis.verb = { raw: "am", translated: this.lexicon["to be"] };
            analysis.object = this.lexicon[tokens[2]] || tokens[2];
        }

        return analysis;
    }

    // 2. GRAMMAR ENGINE: Applies your specific language logic
    conjugate(verbRoot, tense, continuous) {
        const isType1 = /[aeiou]$/.test(verbRoot);
        const suffixes = {
            present: { t1: "de", t2: "e" },
            past: { t1: "da", t2: "a" },
            future: { t1: "do", t2: "o" }
        };

        let result = verbRoot + (isType1 ? suffixes[tense].t1 : suffixes[tense].t2);
        return continuous ? `ca${result}` : result;
    }

    // 3. RECONSTRUCTOR: Builds the final string
    translate(sentence) {
        const data = this.analyze(sentence);
        if (!data.verb) return data.subject; // Cannot translate if no verb

        let verbString = this.conjugate(data.verb.translated, data.tense, data.continuous);
        if (data.negated) verbString = `nor ${verbString}`;

        let final = `${data.subject} ${verbString}`;
        if (data.object && data.object !== "undefined") final += ` ih ${data.object}`;
        
        return final;
    }
}

// Logic to run it
const translator = new Translator(lex);
const inp = document.getElementById("en-input");
const outp = document.getElementById("translation");
const tbtn = document.getElementById("translate-btn");
tbtn.onclick = () => {
    outp.value = translator.translate(inp.value);
}
