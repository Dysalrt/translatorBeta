import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCB6U9js8IMNaQm3cGpR9W-KfJTLVVS85A",
    projectId: "sft-v2",
    // ... rest of config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const codeInp = document.getElementById("code-inp");

async function verifyCode() {
    try {
        const docRef = doc(db, "code", "code");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const secretCode = docSnap.data().code;
            if (codeInp.value === secretCode) {
                console.log("Access Granted!");
                // Here: Redirect to the Admin Panel or show the form
            } else {
                alert("Incorrect Code");
            }
        }
    } catch (error) {
        console.error("Error fetching code:", error);
    }
}

