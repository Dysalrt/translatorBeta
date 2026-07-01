import lex from "./lex.json" with {type: 'json'};

const inp = document.getElementById("en-input");
const outp = document.getElementById("translation");

// Function to detect type based on your rule
const getVerbType = (verb) => (/[aeiou]$/.test(verb) ? 1 : 2);

// The Core Logic
function translate(input) {
    const text = input.toLowerCase();
    const words = text.split(/\s+/);
    
    // 1. Detect Tense/Aspect
    const isContinuous = text.includes("ing") || text.includes("am") || text.includes("is");
    const isNegated = text.includes("not");
    let tense = "present";
    if (text.includes("will")) tense = "future";
    else if (text.includes("was") || text.includes("did") || text.includes("ed")) tense = "past";

    // 2. Identify Subject and Verb
    // This assumes SVO. For "I learn", index 0 is S, index 1 is V
    const sub = lex[words[0]] || words[0];
    const verbBase = words.find(w => lex[w] || lex["to " + w]);
    const verbRaw = lex[verbBase] || lex["to " + verbBase];

    if (!verbRaw) return sub; // Return subject if no verb found

    // 3. Conjugate based on Type
    const type = getVerbType(verbRaw);
    let conjugated = "";
    
    if (tense === "present") conjugated = verbRaw + (type === 1 ? "de" : "e");
    else if (tense === "past") conjugated = verbRaw + (type === 1 ? "da" : "a");
    else if (tense === "future") conjugated = verbRaw + (type === 1 ? "do" : "o");
    
    if (isContinuous) conjugated = "ca" + conjugated;
    if (isNegated) conjugated = "nor " + conjugated;

    return `${sub} ${conjugated}`;
}

// Event Listener for "Google-like" instant updates
inp.addEventListener("input", () => {
    outp.value = translate(inp.value);
});
